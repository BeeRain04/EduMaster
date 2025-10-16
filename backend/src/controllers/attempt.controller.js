const Attempt = require('../models/attempt.model');
const Exam = require('../models/exam.model');

// Submit toàn bộ attempt
exports.submit = async (req, res) => {
  try {
    const id = req.params.id;
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    const attempt = await Attempt.findById(id);
    if (!attempt) return res.status(404).json({ msg: 'Attempt not found' });

    const exam = await Exam.findById(attempt.examId);
    const isFreeLocked = exam?.lockedFree === true; // hoặc tùy bạn đặt cờ free khóa

    if (isFreeLocked) {
      console.log("=== [Submit] Free-locked exam, allow preview submission ===");
    }

    if (attempt.submittedAt || attempt.status === 'finished') {
      return res.status(400).json({ msg: 'Attempt already submitted/finished' });
    }

    let score = 0;
    const details = [];

    // helpers
    const toStr = (v) => (v === null || v === undefined) ? String(v) : String(v);
    const arrEqSet = (a = [], b = []) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      const as = a.map(toStr);
      const bs = b.map(toStr);
      return as.every(x => bs.includes(x));
    };

    // Normalize selectedPairs payload:
    // Accept either array [{left,right},...] or object { "0": "rightVal", ... } or array of {left,right}
    const normalizeSelectedPairs = (payloadPairs, attemptQuestionPairs) => {
      // If payload already array of objects with left/right -> return as-is
      if (Array.isArray(payloadPairs) && payloadPairs.length && payloadPairs[0] && typeof payloadPairs[0] === 'object' && ('left' in payloadPairs[0] || 'right' in payloadPairs[0])) {
        return payloadPairs.map(p => ({ left: toStr(p.left), right: toStr(p.right) }));
      }
      // If payload is object mapping leftIndex -> right value OR array of right strings in same order as attemptQuestionPairs
      if (payloadPairs && typeof payloadPairs === 'object' && !Array.isArray(payloadPairs)) {
        // object keyed by left index
        const out = [];
        Object.keys(payloadPairs).forEach(k => {
          const leftIdx = Number(k);
          const left = attemptQuestionPairs[leftIdx]?.left ?? String(leftIdx);
          out.push({ left: toStr(left), right: toStr(payloadPairs[k]) });
        });
        return out;
      }
      // If payload is array of strings and attemptQuestionPairs available (assume mapping by index)
      if (Array.isArray(payloadPairs) && payloadPairs.length && (attemptQuestionPairs && attemptQuestionPairs.length)) {
        return payloadPairs.map((right, idx) => {
          const left = attemptQuestionPairs[idx]?.left ?? String(idx);
          return { left: toStr(left), right: toStr(right) };
        });
      }
      return []; // default none
    };

    // helper to build selectedTokens from various payload shapes (kept your previous logic but more tolerant)
    const buildSelectedTokens = (question, ans) => {
      if (!ans) return [];
      if (Array.isArray(ans.selectedTokens) && ans.selectedTokens.length) return ans.selectedTokens.map(toStr);

      if (Array.isArray(ans.selectedIndexes) && ans.selectedIndexes.length) {
        const tokens = [];
        for (const idx of ans.selectedIndexes) {
          // 1) try to map using origIndex stored in question.options
          const found = (question.options || []).find((o) => o && (o.origIndex === idx || String(o.origIndex) === String(idx)));
          if (found) { tokens.push(toStr(found.token)); continue; }

          // 2) fallback: map by position
          const pos = Number(idx);
          if (!Number.isNaN(pos) && question.options && question.options[pos]) {
            tokens.push(toStr(question.options[pos].token));
          }
        }
        return tokens;
      }

      return [];
    };

    for (const ans of answers) {
      // normalize incoming
      const qId = String(ans.questionId || ans.questionId);
      const question = attempt.questions.find((q) => String(q.questionId) === qId || String(q._id) === qId);
      if (!question) {
        details.push({ questionId: ans.questionId, isCorrect: false, reason: 'not-in-attempt' });
        continue;
      }

      // payload-parsed values
      const selectedTokens = buildSelectedTokens(question, ans);
      // selectedPairs can come as array/object/array-of-rights
      const rawSelectedPairs = ans.selectedPairs ?? ans.pairs ?? ans.pairsMap ?? [];
      const selectedPairs = normalizeSelectedPairs(rawSelectedPairs, question.pairs || question.raw?.pairs || []);
      const selectedMatrix = Array.isArray(ans.selectedMatrix) ? ans.selectedMatrix.map(m => ({ row: Number(m.row), col: Number(m.col) })) : [];
      const mapping = ans.mapping || {}; // for drag-drop
      const selectedOrder = Array.isArray(ans.selectedOrder) ? ans.selectedOrder : [];

      let isCorrect = false;
      let correctTokens = [];

      switch (question.type) {
        case 'single': {
          // prefer question.options array with isCorrect flags
          correctTokens = (question.options || []).filter(o => o && o.isCorrect).map(o => toStr(o.token));
          isCorrect = Array.isArray(selectedTokens) && selectedTokens.length === 1 && correctTokens.includes(toStr(selectedTokens[0]));
          break;
        }

        case 'multi': {
          correctTokens = (question.options || []).filter(o => o && o.isCorrect).map(o => toStr(o.token));
          isCorrect = Array.isArray(selectedTokens) && selectedTokens.length === correctTokens.length && correctTokens.every(t => selectedTokens.map(toStr).includes(t));
          break;
        }

        case 'drop-match': {
          // derive correct pairs from multiple possible shapes
          const attemptPairs = Array.isArray(question.pairs) && question.pairs.length ? question.pairs : (Array.isArray(question.raw?.pairs) ? question.raw.pairs : []);
          const correctPairs = (attemptPairs || []).map(p => ({ left: toStr(p.left), right: toStr(p.right) }));

          // If we don't know correct pairs, cannot mark correct
          if (!correctPairs.length) {
            isCorrect = false;
            correctTokens = [];
            break;
          }

          // require user selected pairs and same length
          if (!Array.isArray(selectedPairs) || selectedPairs.length !== correctPairs.length) {
            isCorrect = false;
          } else {
            // compare ignoring order: for each correct pair ensure user provided identical left+right
            isCorrect = correctPairs.every(cp => selectedPairs.some(sp => toStr(sp.left) === toStr(cp.left) && toStr(sp.right) === toStr(cp.right)));
          }

          correctTokens = []; // no single tokens list for drop-match
          break;
        }

        case 'image-area': {
          const correctAreas = Array.isArray(question.raw?.areas) && question.raw.areas.length
            ? question.raw.areas.map((a, i) => a.isCorrect ? toStr(i) : null).filter(Boolean)
            : (question.options || []).filter(o => o && o.isCorrect).map(o => toStr(o.token));

          if (!correctAreas.length) {
            isCorrect = false;
          } else {
            const sel = Array.isArray(selectedTokens) ? selectedTokens.map(toStr) : [];
            isCorrect = sel.length === correctAreas.length && correctAreas.every(t => sel.includes(t));
          }
          correctTokens = [];
          break;
        }
        case 'matrix': {
          // Prefer raw.matrix.correct (what we stored in attempt.questions[].raw)
          const matrixCorrect =
            Array.isArray(question.raw?.matrix?.correct) && question.raw.matrix.correct.length
              ? question.raw.matrix.correct
              : (Array.isArray(question.matrix?.correct) && question.matrix.correct.length ? question.matrix.correct : null);

          if (!Array.isArray(matrixCorrect)) {
            isCorrect = false;
            correctTokens = [];
            break;
          }

          // Convert to set of keys "r-c" for comparison
          const correctCells = [];
          matrixCorrect.forEach((rowArr, r) => {
            if (Array.isArray(rowArr)) {
              rowArr.forEach((val, c) => {
                if (val) correctCells.push({ row: Number(r), col: Number(c) });
              });
            }
          });

          // selectedMatrix already normalized above as array of {row,col}
          const sel = Array.isArray(selectedMatrix) ? selectedMatrix.map(s => ({ row: Number(s.row), col: Number(s.col) })) : [];

          const toKey = (r, c) => `${r}-${c}`;
          const correctSet = new Set(correctCells.map(c => toKey(c.row, c.col)));
          const selectedSet = new Set(sel.map(s => toKey(s.row, s.col)));

          isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(k => selectedSet.has(k));
          correctTokens = [];
          break;
        }

        case 'drag-drop': {
          // derive expected mapping
          const correctMapping = Array.isArray(question.correctMapping) && question.correctMapping.length
            ? question.correctMapping
            : (Array.isArray(question.raw?.correctMapping) ? question.raw.correctMapping : []);
          const dropzonesArr = Array.isArray(question.dropzones) && question.dropzones.length
            ? question.dropzones
            : (Array.isArray(question.raw?.dropzones) ? question.raw.dropzones : []);

          if (!correctMapping.length || !dropzonesArr.length) {
            isCorrect = false;
            correctTokens = [];
            break;
          }

          // expected per zone index
          const expectedByZone = {};
          dropzonesArr.forEach((dz, idx) => {
            expectedByZone[idx] = (correctMapping.filter(m => String(m.dropzone) === String(dz)).map(m => toStr(m.draggable)));
          });

          // user mapping may be keys by index -> array
          let ok = true;
          for (const dzIdx of Object.keys(expectedByZone)) {
            const exp = expectedByZone[dzIdx] || [];
            const usr = Array.isArray(mapping[dzIdx]) ? mapping[dzIdx].map(toStr) : [];
            // if expected empty -> skip
            if (!exp.length) continue;
            if (usr.length !== exp.length) { ok = false; break; }
            // compare set membership
            if (!exp.every(t => usr.includes(t))) { ok = false; break; }
          }

          isCorrect = ok;
          // Only return correctTokens for single/multi
          correctTokens = [];
          break;
        }

        default:
          isCorrect = false;
      }

      if (isCorrect) score++;
      // push detailed info (include what user submitted so FE can merge)
      details.push({
        questionId: question.questionId || question._id,
        isCorrect: !!isCorrect,
        correctTokens: ['single', 'multi'].includes(question.type) ? correctTokens : [],
        selectedTokens: Array.isArray(selectedTokens) ? selectedTokens.map(toStr) : [],
        selectedPairs: Array.isArray(selectedPairs) ? selectedPairs.map(p => ({ left: toStr(p.left), right: toStr(p.right) })) : [],
        selectedMatrix: Array.isArray(selectedMatrix) ? selectedMatrix.map(m => ({ row: Number(m.row), col: Number(m.col) })) : [],
        mapping: mapping && typeof mapping === 'object' ? mapping : {},
      });
    }

    attempt.score = score;
    attempt.total = attempt.questions.length;
    attempt.submittedAt = new Date();
    attempt.status = 'finished';
    await attempt.save();

    // 🔄 Nếu là khóa 0 phí, chỉ trả kết quả, KHÔNG lưu trạng thái thật
    if (!isFreeLocked) {
      attempt.score = score;
      attempt.total = attempt.questions.length;
      attempt.submittedAt = new Date();
      attempt.status = 'finished';
      await attempt.save();
    } else {
      // vẫn tạo bản kết quả tạm (không ghi DB)
      attempt.score = score;
      attempt.total = attempt.questions.length;
    }

    const elapsedMs = attempt.submittedAt - attempt.startedAt;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const elapsedMin = Math.floor(elapsedSec / 60);
    const score10 = (score / attempt.total) * 10;

    res.json({
      msg: isFreeLocked ? 'Đây là bài thi 0 phí - chỉ xem điểm (không lưu)' : 'Submitted successfully',
      msg: 'Submitted successfully',
      correctCount: score,
      total: attempt.questions.length,
      score10: Number(score10.toFixed(2)),
      submittedAt: attempt.submittedAt,
      elapsedTime: {
        seconds: elapsedSec,
        minutes: elapsedMin,
      },
      details,
    });
    console.log("=== [Submit] Done ===");
  } catch (err) {
    console.error('Submit handler error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

// Lấy attempt
exports.get = async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user.id })
      .populate("examId", "title")
      .sort({ submittedAt: -1 });

    const data = attempts.map(a => ({
      _id: a._id,
      examTitle: a.examId?.title,
      mode: a.mode,
      status: a.status,
      correctCount: a.score,
      total: a.total,
      score10: Number(((a.score / (a.total || 1)) * 10).toFixed(2)),
      submittedAt: a.submittedAt,
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Kiểm tra 1 câu (khi user click 1 đáp án, trả về đúng/sai + correctTokens để FE highlight)
exports.answerOne = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      questionId,
      token,
      selectedTokens,
      selectedIndexes,
      selectedPairs,
      selectedMatrix,
      selectedOrder,
      mapping
    } = req.body;

    const attempt = await Attempt.findById(id);
    if (!attempt) return res.status(404).json({ msg: "Attempt not found" });

    const question = attempt.questions.find(
      (q) => String(q.questionId) === String(questionId)
    );
    if (!question) return res.status(404).json({ msg: "Question not found in this attempt" });

    // chuẩn hóa token
    const buildSelectedTokens = () => {
      if (Array.isArray(selectedTokens) && selectedTokens.length) return selectedTokens;
      if (token) return [token];
      if (Array.isArray(selectedIndexes) && selectedIndexes.length) {
        const tokens = [];
        for (const idx of selectedIndexes) {
          let found = question.options.find(
            (o) => o.origIndex === idx || String(o.origIndex) === String(idx)
          );
          if (found) { tokens.push(found.token); continue; }
          const pos = Number(idx);
          if (!Number.isNaN(pos) && question.options[pos]) tokens.push(question.options[pos].token);
        }
        return tokens;
      }
      return [];
    };

    const selTokens = buildSelectedTokens();
    const safeSelectedPairs = Array.isArray(selectedPairs) ? selectedPairs : [];
    const safeSelectedMatrix = Array.isArray(selectedMatrix) ? selectedMatrix : [];
    const safeSelectedOrder = Array.isArray(selectedOrder) ? selectedOrder : selTokens;

    let isCorrect = false;
    let correctTokens = [];

    switch (question.type) {
      case "single": {
        correctTokens = (question.options || []).filter(o => o.isCorrect).map(o => o.token);
        isCorrect = selTokens.length === 1 && correctTokens.includes(selTokens[0]);
        break;
      }
      case "multi": {
        correctTokens = (question.options || []).filter(o => o.isCorrect).map(o => o.token);
        isCorrect =
          Array.isArray(selTokens) &&
          correctTokens.length === selTokens.length &&
          correctTokens.every(t => selTokens.includes(t));
        break;
      }
      case "drop-match": {
        const correctPairs = Array.isArray(question.raw?.pairs)
          ? question.raw.pairs
          : (question.options || [])
            .filter(o => o.isCorrect)
            .map(o => ({ left: o.left, right: o.right }));
        isCorrect =
          Array.isArray(safeSelectedPairs) &&
          safeSelectedPairs.length === correctPairs.length &&
          correctPairs.every(
            (p, i) =>
              safeSelectedPairs[i] &&
              safeSelectedPairs[i].left === p.left &&
              safeSelectedPairs[i].right === p.right
          );
        correctTokens = correctPairs;
        break;
      }
      case "image-area": {
        correctTokens = (question.options || []).filter(o => o.isCorrect).map(o => o.token);
        isCorrect =
          selTokens.length === correctTokens.length &&
          correctTokens.every(t => selTokens.includes(t));
        break;
      }
      case "matrix": {
        const matrixCorrect =
          Array.isArray(question.raw?.matrix?.correct) && question.raw.matrix.correct.length
            ? question.raw.matrix.correct
            : (Array.isArray(question.matrix?.correct) && question.matrix.correct.length ? question.matrix.correct : null);

        if (!Array.isArray(matrixCorrect)) {
          isCorrect = false;
          correctTokens = [];
          break;
        }

        const correctCells = [];
        matrixCorrect.forEach((rowArr, r) => {
          if (Array.isArray(rowArr)) {
            rowArr.forEach((val, c) => {
              if (val) correctCells.push({ row: Number(r), col: Number(c) });
            });
          }
        });

        const selNorm = safeSelectedMatrix.map(s => ({
          row: Number(s.row),
          col: Number(s.col),
        }));

        const toKey = (r, c) => `${r}-${c}`;
        const correctSet = new Set(correctCells.map(c => toKey(c.row, c.col)));
        const selectedSet = new Set(selNorm.map(s => toKey(s.row, s.col)));

        isCorrect =
          correctSet.size === selectedSet.size &&
          [...correctSet].every(k => selectedSet.has(k));

        correctTokens = [];
        break;
      }

      case "drag-drop": {
        const correctMapping = Array.isArray(question.raw?.correctMapping)
          ? question.raw.correctMapping
          : [];

        let ok = true;
        let expected = {};

        const dropzonesArr = Array.isArray(question.raw?.dropzones)
          ? question.raw.dropzones
          : [];

        if (dropzonesArr.length && correctMapping.length) {
          dropzonesArr.forEach((dz, dzIdx) => {
            expected[dzIdx] = Array.from(
              new Set(
                correctMapping
                  .filter(m => m.dropzone === dz)
                  .map(m => String(m.draggable))
              )
            );
          });

          const userMapping = mapping || {};
          for (const dzIdx in expected) {
            const userArr = Array.isArray(userMapping[dzIdx])
              ? Array.from(new Set(userMapping[dzIdx].map(String)))
              : [];

            const correctArr = expected[dzIdx];
            if (
              userArr.length !== correctArr.length ||
              !correctArr.every(t => userArr.includes(t))
            ) {
              ok = false;
              break;
            }
          }
        }
        isCorrect = ok;
        break;
      }
      default:
        isCorrect = false;
    }

    res.json({
      questionId,
      correct: !!isCorrect,
      correctTokens: ["single", "multi"].includes(question.type) ? correctTokens : [],
      selectedMatrix: safeSelectedMatrix,
      mapping: mapping || {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


