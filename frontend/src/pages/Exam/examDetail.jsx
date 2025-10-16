import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./examDetail.css";

const authHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function ExamDetail() {
  const { id } = useParams();
  const [examMeta, setExamMeta] = useState(null);
  const [questions, setQuestions] = useState([]); // normalized for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("training"); // 'training' | 'testing' | 'finished'
  const [attemptId, setAttemptId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;
  const [remainingTime, setRemainingTime] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const timerRef = useRef(null);

  // answers state keyed by question index (global)
  const [answers, setAnswers] = useState({});

  // showAnswersGlobal works in both training and testing now.
  const [showAnswersGlobal, setShowAnswersGlobal] = useState(false);
  const qRefs = useRef([]);
  const [retrying, setRetrying] = useState(false);

  // ---------- Helpers to normalize various server shapes ----------
  const normalizeServerRaw = (q) => {
    const raw = { ...(q || {}) };

    // matrix normalization
    raw.matrix = raw.matrix || {};
    raw.matrix.rows = raw.matrix.rows || raw.rows || [];
    raw.matrix.columns = raw.matrix.columns || raw.columns || raw.cols || [];

    // drop-match normalization: raw.pairs or raw.options with left/right
    if (!Array.isArray(raw.pairs)) {
      if (Array.isArray(raw.options) && raw.options.length && (raw.options[0].left !== undefined || raw.options[0].right !== undefined)) {
        raw.pairs = raw.options.map((o) => ({ left: o.left, right: o.right }));
      } else {
        raw.pairs = raw.pairs || [];
      }
    }

    // drag-drop normalization
    raw.draggables = Array.isArray(raw.draggables)
      ? raw.draggables
      : (Array.isArray(raw.options) ? raw.options.map(o => (typeof o === "object" ? (o.text ?? String(o)) : String(o))) : raw.draggables || []);
    raw.dropzones = Array.isArray(raw.dropzones) ? raw.dropzones : (raw.dropzones || []);

    // image areas
    raw.areas = Array.isArray(raw.areas) ? raw.areas : (raw.areas || []);

    return raw;
  };

  const normalizeQuestionDoc = (qDoc) => {
    const rawFromServer = qDoc.raw ? qDoc.raw : qDoc;
    const raw = normalizeServerRaw(rawFromServer);

    // options normalization
    let options = [];
    if (Array.isArray(qDoc.options) && qDoc.options.length) {
      options = qDoc.options.map((o, idx) => {
        if (o && typeof o === "object") {
          return { token: String(o.token ?? idx), text: o.text ?? String(o.text ?? idx), isCorrect: !!o.isCorrect };
        }
        return { token: String(idx), text: String(o), isCorrect: false };
      });
    } else if (Array.isArray(raw.options) && raw.options.length) {
      options = raw.options.map((o, idx) => {
        if (typeof o === "string") return { token: String(idx), text: o, isCorrect: false };
        return { token: String(o.token ?? idx), text: o.text ?? String(o.text ?? idx), isCorrect: !!o.isCorrect };
      });
    } else if (Array.isArray(qDoc.correctIndexes) || Array.isArray(qDoc.options)) {
      options = (qDoc.options || []).map((o, idx) => ({
        token: String(idx),
        text: typeof o === "string" ? o : (o.text || String(o)),
        isCorrect: Array.isArray(qDoc.correctIndexes) ? qDoc.correctIndexes.includes(idx) : false,
      }));
    }

    return {
      questionId: qDoc.questionId ?? qDoc._id,
      content: qDoc.content ?? qDoc.questionText ?? "",
      type: qDoc.type ?? raw.type ?? "single",
      options,
      raw,
    };
  };

  // ---------- initial load (training view) ----------
  useEffect(() => {
    const fetchExamAndQuestions = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`http://localhost:5000/api/exams/${id}?withQuestions=true`);
        const ex = res.data;
        setExamMeta({
          id: ex._id,
          title: ex.title,
          description: ex.description,
          timeLimit: ex.timeLimit,
          random: !!ex.random,
          numQuestions: ex.numQuestions,
          showAnswersAfterSubmit: !!ex.showAnswersAfterSubmit,
          course: ex.courseId?.name || "",
        });

        const populated = Array.isArray(ex.questionIds) && ex.questionIds.length > 0 && typeof ex.questionIds[0] === "object";
        if (populated) {
          const normalized = ex.questionIds.map(normalizeQuestionDoc);
          setQuestions(normalized);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error("Load exam error:", err?.response?.data || err);
        setError(err?.response?.data?.msg || err?.response?.data?.error || "Không thể tải đề thi");
      } finally {
        setLoading(false);
      }
    };

    fetchExamAndQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- start testing (create attempt) ----------
  const [selectedMode, setSelectedMode] = useState("training");
  const [shuffleExam, setShuffleExam] = useState(false);
  const handleStartTesting = async (modeParam = selectedMode, shuffleParam = shuffleExam) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("mode", modeParam);
      if (shuffleParam) params.append("shuffle", "true");
      const res = await axios.post(
        `http://localhost:5000/api/exams/${id}/start?${params.toString()}`,
        null,
        { headers: authHeaders() }
      );
      setAttemptId(res.data.attemptId || null);
      setCurrentPage(1);
      setAnswers({});
      setSubmitResult(null);
      setShowAnswersGlobal(false);
      if (Array.isArray(res.data.questions)) {
        const mapped = res.data.questions.map((q) => normalizeQuestionDoc(q));
        setQuestions(mapped);
      }
      const limitMinutes = res.data.timeLimitMinutes || examMeta?.timeLimit || 10;
      setRemainingTime(limitMinutes * 60);
      setMode(modeParam);
    } catch (err) {
      console.error("Start exam error:", err?.response?.data || err);
      setError(err?.response?.data?.msg || err?.response?.data?.error || "Không thể bắt đầu kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  // ---------- timer ----------
  useEffect(() => {
    if (mode === "testing" && remainingTime > 0) {
      timerRef.current = setInterval(() => setRemainingTime((p) => p - 1), 1000);
      return () => clearInterval(timerRef.current);
    } else if (remainingTime === 0 && attemptId) {
      handleSubmitAttempt();
    }
  }, [mode, remainingTime, attemptId]);

  // ---------- helper: check if answer is complete (for training show) ----------
  const isAnswerComplete = (q, ans) => {
    if (!q) return false;
    ans = ans || {};
    switch (q.type) {
      case "single":
        return !!(ans.token || (Array.isArray(ans.selectedTokens) && ans.selectedTokens.length));
      case "multi": {
        const correctTokens = q.options.filter(o => o.isCorrect).map(o => o.token);
        return Array.isArray(ans.selectedTokens) && ans.selectedTokens.length === correctTokens.length;
      }
      case "drop-match": {
        const pairs = q.raw?.pairs || [];
        if (!pairs.length) return false;
        const pairsAns = ans.pairs || {};
        // require every left index answered with a non-empty value
        return pairs.length === Object.keys(pairsAns).filter(k => pairsAns[k]).length;
      }
      case "image-area": {
        const areas = q.raw?.areas || [];
        const correctTokens = areas.map((a, i) => String(i)).filter((_, i) => !!(areas[i]?.isCorrect));
        if (!correctTokens.length) return false;
        const sel = Array.isArray(ans.selectedTokens) ? ans.selectedTokens : [];
        return sel.length === correctTokens.length;
      }
      case "matrix": {
        // require matrix.correct shape exists -> then require all cells addressed
        const rows = q.raw?.matrix?.rows || [];
        const cols = q.raw?.matrix?.columns || [];
        const correct = q.raw?.matrix?.correct || [];
        if (!Array.isArray(correct) || !correct.length) return false;
        // require that user has toggled something for each cell (either true or false doesn't matter) --
        // we'll require they interacted: check that user has at least same count of keys as matrix cells
        let count = 0;
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < cols.length; c++) {
            if (ans[`${r}-${c}`]) count++;
          }
        }
        // to be conservative, require count > 0 and (optionally) equal to number of true cells in correct
        // We'll require count >= number of true cells (so user must have selected at least the true ones).
        const trueCells = correct.reduce((acc, row) => acc + (Array.isArray(row) ? row.filter(Boolean).length : 0), 0);
        return count >= trueCells && trueCells > 0;
      }
      case "drag-drop": {
        const correctMapping = q.raw?.correctMapping || [];
        if (!correctMapping.length) return false;
        // require user has assigned at least something to every dropzone that appears in correctMapping
        const byZone = {};
        (q.raw?.dropzones || []).forEach((dz, idx) => byZone[idx] = []);
        correctMapping.forEach(m => {
          const dzIndex = (q.raw?.dropzones || []).findIndex(z => z === m.dropzone);
          if (dzIndex >= 0) byZone[dzIndex] = byZone[dzIndex] || [];
          if (dzIndex >= 0) byZone[dzIndex].push(m.draggable);
        });
        const map = ans.mapping || {};
        // require that for each zone in byZone, user has assigned same number of items (or at least some)
        return Object.keys(byZone).every(k => (map[k] || []).length >= byZone[k].length && byZone[k].length > 0);
      }
      default:
        return false;
    }
  };

  // ---------- compute correctness locally (training show) ----------
  const computeCorrectnessLocal = (q, ans) => {
    if (!q) return null;
    switch (q.type) {
      case "single": {
        const correctTokens = q.options.filter(o => o.isCorrect).map(o => o.token);
        const chosen = ans?.token ?? (ans?.selectedTokens ? ans.selectedTokens[0] : undefined);
        return { correct: !!(chosen && correctTokens.includes(chosen)), correctTokens };
      }
      case "multi": {
        const correctTokens = q.options.filter(o => o.isCorrect).map(o => o.token);
        const sel = Array.isArray(ans?.selectedTokens) ? ans.selectedTokens : [];
        const isCorrect = sel.length > 0 && sel.length === correctTokens.length && correctTokens.every(t => sel.includes(t));
        return { correct: isCorrect, correctTokens };
      }
      // Các loại đặc biệt: luôn trả về đúng/sai khi đã trả lời đủ
      case "drop-match": {
        const pairs = q.raw?.pairs || [];
        const pairsAns = ans.pairs || {};
        if (!pairs.length) return { correct: false, correctTokens: [] };
        // Chỉ tính khi đã trả lời đủ
        const isComplete = pairs.length === Object.keys(pairsAns).filter(k => pairsAns[k]).length;
        if (!isComplete) return null;
        const isCorrect = pairs.every((p, i) => pairsAns[i] && pairsAns[i] === p.right);
        return { correct: isCorrect, correctTokens: [] };
      }
      case "matrix": {
        const rows = q.raw?.matrix?.rows || [];
        const cols = q.raw?.matrix?.columns || [];
        const correct = q.raw?.matrix?.correct || [];
        if (!Array.isArray(correct) || !correct.length) return { correct: false, correctTokens: [] };
        // Chỉ tính khi đã trả lời đủ
        let count = 0;
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < cols.length; c++) {
            if (ans[`${r}-${c}`]) count++;
          }
        }
        const trueCells = correct.reduce((acc, row) => acc + (Array.isArray(row) ? row.filter(Boolean).length : 0), 0);
        if (count < trueCells || trueCells === 0) return null;
        let ok = true;
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < cols.length; c++) {
            const key = `${r}-${c}`;
            if (!!correct[r]?.[c] !== !!ans[key]) ok = false;
          }
        }
        return { correct: ok, correctTokens: [] };
      }
      case "drag-drop": {
        const correctMapping = q.raw?.correctMapping || [];
        const dropzones = q.raw?.dropzones || [];
        const map = ans.mapping || {};
        // Chỉ tính khi đã trả lời đủ
        let isComplete = true;
        for (let dzIdx = 0; dzIdx < dropzones.length; dzIdx++) {
          const correctItems = correctMapping.filter(m => m.dropzone === dropzones[dzIdx]).map(m => m.draggable);
          const userItems = Array.isArray(map[dzIdx]) ? map[dzIdx] : [];
          if (userItems.length < correctItems.length || correctItems.length === 0) isComplete = false;
        }
        if (!isComplete) return null;
        let ok = true;
        for (let dzIdx = 0; dzIdx < dropzones.length; dzIdx++) {
          const correctItems = correctMapping.filter(m => m.dropzone === dropzones[dzIdx]).map(m => m.draggable);
          const userItems = Array.isArray(map[dzIdx]) ? map[dzIdx] : [];
          if (correctItems.length !== userItems.length || !correctItems.every(it => userItems.includes(it))) ok = false;
        }
        return { correct: ok, correctTokens: [] };
      }
      case "image-area": {
        const areas = q.raw?.areas || [];
        const correctTokens = areas.map((a, i) => String(i)).filter((_, i) => !!(areas[i]?.isCorrect));
        const sel = Array.isArray(ans?.selectedTokens) ? ans.selectedTokens : [];
        if (sel.length < correctTokens.length || correctTokens.length === 0) return null;
        const isCorrect = sel.length === correctTokens.length && correctTokens.every(t => sel.includes(t));
        return { correct: isCorrect, correctTokens: [] };
      }
      default:
        return null;
    }
  };

  // ---------- validate answer with server (testing mode) ----------
  // Posts single question answer to /attempts/:attemptId/answer and merges response
  const validateAnswerWithServer = async (qIndex, overrideLocal = null) => {
    if (!attemptId || qIndex == null) return;
    const q = questions[qIndex];
    if (!q) return;
    const local = overrideLocal ?? answers[qIndex] ?? {};
    const payload = buildAnswerPayload(q, local);
    try {
      const resp = await axios.post(`http://localhost:5000/api/attempts/${attemptId}/answer`, payload, { headers: authHeaders() });
      const { correct, correctTokens, selectedTokens, selectedPairs, mapping, selectedMatrix } = resp.data || {};
      setAnswers(prev => {
        const next = { ...prev };
        const entry = next[qIndex] || {};
        // Merge đúng dữ liệu trả về từ backend, không ép lại correctTokens
        let merged;
        if (q.type === "matrix") {
          // For matrix, only merge correct field and preserve cell selections
          merged = {
            ...entry,
            correct: typeof correct === "boolean" ? correct : entry.correct,
          };
          if (Array.isArray(selectedMatrix)) {
            selectedMatrix.forEach(m => { merged[`${m.row}-${m.col}`] = true; });
          }
        } else {
          merged = {
            ...entry,
            token: local.token ?? entry.token,
            selectedTokens: Array.isArray(selectedTokens) ? selectedTokens : (entry.selectedTokens || (entry.token ? [entry.token] : [])),
            pairs: selectedPairs || entry.pairs || {},
            mapping: mapping || entry.mapping || {},
            correct: typeof correct === "boolean" ? correct : entry.correct,
            correctTokens: Array.isArray(correctTokens) ? correctTokens : [],
          };
          if (Array.isArray(selectedMatrix)) {
            selectedMatrix.forEach(m => { merged[`${m.row}-${m.col}`] = true; });
          }
        }
        next[qIndex] = merged;
        return next;
      });
    } catch (err) {
      console.error("Validate answer error:", err?.response?.data || err);
      // silent fallback: don't block user
    }
  };

  // ---------- selection handlers ----------
  // helper: chỉ khóa đáp án khi đã submit
  const isReadOnly = () => mode === "finished";

  const handleSelectSingle = (qIndex, q, opt) => {
    if (isReadOnly()) return;
    // In testing mode, allow changing answer until submit
    if (mode === "testing") {
      setAnswers(prev => {
        const entry = prev[qIndex] || {};
        // Luôn cho phép chọn lại đáp án single trước khi submit
        const next = { ...prev, [qIndex]: { ...entry, token: opt.token } };
        return next;
      });
      validateAnswerWithServer(qIndex, { token: opt.token });
      return;
    }
    // training mode
    setAnswers(prev => {
      const next = { ...prev, [qIndex]: { ...(prev[qIndex] || {}), token: opt.token } };
      if (showAnswersGlobal && isAnswerComplete(q, next[qIndex])) {
        const comp = computeCorrectnessLocal(q, next[qIndex]);
        if (comp) next[qIndex] = { ...next[qIndex], correct: comp.correct, correctTokens: comp.correctTokens || [] };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
        if (next[qIndex].hasOwnProperty("correctTokens")) delete next[qIndex].correctTokens;
      }
      return next;
    });
  };

  const handleSelectMulti = (qIndex, q, opt) => {
    if (isReadOnly()) return;
    if (mode === "testing") {
      // update locally then validate
      setAnswers(prev => {
        const entry = prev[qIndex] || {};
        const arr = Array.isArray(entry.selectedTokens) ? [...entry.selectedTokens] : (entry.token ? [entry.token] : []);
        const exists = arr.includes(opt.token);
        const newArr = exists ? arr.filter(t => t !== opt.token) : [...arr, opt.token];
        const next = { ...prev, [qIndex]: { ...(entry || {}), selectedTokens: newArr } };
        validateAnswerWithServer(qIndex, next[qIndex]);
        return next;
      });
      return;
    }
    // training
    setAnswers(prev => {
      const entry = prev[qIndex] || {};
      const arr = Array.isArray(entry.selectedTokens) ? [...entry.selectedTokens] : (entry.token ? [entry.token] : []);
      const exists = arr.includes(opt.token);
      const newArr = exists ? arr.filter(t => t !== opt.token) : [...arr, opt.token];
      const next = { ...prev, [qIndex]: { ...(entry || {}), selectedTokens: newArr } };
      if (showAnswersGlobal && isAnswerComplete(q, next[qIndex])) {
        const comp = computeCorrectnessLocal(q, next[qIndex]);
        if (comp) next[qIndex] = { ...next[qIndex], correct: comp.correct, correctTokens: comp.correctTokens || [] };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
        if (next[qIndex].hasOwnProperty("correctTokens")) delete next[qIndex].correctTokens;
      }
      return next;
    });
  };

  const handleDropMatchSelect = (qIndex, leftIdx, rightValue) => {
    if (isReadOnly()) return;

    setAnswers((prev) => {
      const entry = prev[qIndex] || {};
      const pairs = { ...(entry.pairs || {}) };
      pairs[leftIdx] = rightValue || "";

      const updatedEntry = { ...entry, pairs };

      const next = { ...prev, [qIndex]: updatedEntry };

      if (mode === "testing") {
        // Testing mode: update then validate with server
        validateAnswerWithServer(qIndex, updatedEntry);
      } else if (mode === "training") {
        // Training mode: compute correctness if showing answers
        if (showAnswersGlobal && isAnswerComplete(questions[qIndex], updatedEntry)) {
          const comp = computeCorrectnessLocal(questions[qIndex], updatedEntry);
          if (comp) {
            next[qIndex] = {
              ...updatedEntry,
              correct: comp.correct,
              correctTokens: comp.correctTokens || [],
            };
          }
        } else {
          // Remove correctness flags if incomplete or showAnswersGlobal is false
          if (updatedEntry.hasOwnProperty("correct")) {
            delete updatedEntry.correct;
          }
          if (updatedEntry.hasOwnProperty("correctTokens")) {
            delete updatedEntry.correctTokens;
          }
          next[qIndex] = updatedEntry;
        }
      }

      return next;
    });
  };


  const handleToggleImageArea = (qIndex, areaIdx) => {
    if (isReadOnly()) return;
    if (mode === "testing") {
      setAnswers(prev => {
        const entry = prev[qIndex] || {};
        const sel = Array.isArray(entry.selectedTokens) ? [...entry.selectedTokens] : [];
        const exists = sel.includes(String(areaIdx));
        const newSel = exists ? sel.filter(s => s !== String(areaIdx)) : [...sel, String(areaIdx)];
        const next = { ...prev, [qIndex]: { ...(entry || {}), selectedTokens: newSel } };
        validateAnswerWithServer(qIndex, next[qIndex]);
        return next;
      });
      return;
    }
    setAnswers(prev => {
      const entry = prev[qIndex] || {};
      const sel = Array.isArray(entry.selectedTokens) ? [...entry.selectedTokens] : [];
      const exists = sel.includes(String(areaIdx));
      const newSel = exists ? sel.filter(s => s !== String(areaIdx)) : [...sel, String(areaIdx)];
      const next = { ...prev, [qIndex]: { ...(entry || {}), selectedTokens: newSel } };
      if (showAnswersGlobal && isAnswerComplete(questions[qIndex], next[qIndex])) {
        const comp = computeCorrectnessLocal(questions[qIndex], next[qIndex]);
        if (comp) next[qIndex] = { ...next[qIndex], correct: comp.correct, correctTokens: comp.correctTokens };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
      }
      return next;
    });
  };

  const handleToggleMatrix = (qIndex, r, c) => {
    if (isReadOnly()) return;

    const key = `${r}-${c}`;

    if (mode === "testing") {
      // testing: cập nhật state (cell toggle) rồi gọi validate với **local entry** (không phải payload)
      setAnswers(prev => {
        const entry = prev[qIndex] || {};
        const nextEntry = { ...(entry || {}), [key]: !entry?.[key] };
        const next = { ...prev, [qIndex]: nextEntry };

        // Gọi validate với nextEntry (local shape) -> buildAnswerPayload sẽ chuyển nextEntry thành selectedMatrix đúng
        validateAnswerWithServer(qIndex, nextEntry);

        return next;
      });
      return;
    }

    // training mode (unchanged)
    setAnswers(prev => {
      const entry = prev[qIndex] || {};
      const nextEntry = { ...(entry || {}), [key]: !entry?.[key] };
      const next = { ...prev, [qIndex]: nextEntry };

      if (showAnswersGlobal && isAnswerComplete(questions[qIndex], nextEntry)) {
        const comp = computeCorrectnessLocal(questions[qIndex], nextEntry);
        if (comp) next[qIndex] = { ...next[qIndex], correct: comp.correct };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
      }
      return next;
    });
  };
  // ---------- drag & drop (multiple items per dropzone) ----------
  const handleDragStart = (e, qIndex, token) => {
    e.dataTransfer.setData("text/plain", token);
    e.dataTransfer.setData("question-index", String(qIndex));
    try { e.dataTransfer.effectAllowed = "move"; } catch { }
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDropOnZone = (e, qIndex, dropIndex) => {
    e.preventDefault();
    if (isReadOnly()) return;

    const token = e.dataTransfer.getData("text/plain");
    if (!token) return;

    setAnswers(prev => {
      const entry = prev[qIndex] || {};
      const prevMap = entry.mapping || {};

      // loại token ra khỏi tất cả dropzone trước
      const newMap = {};
      Object.keys(prevMap).forEach(k => {
        newMap[k] = (prevMap[k] || []).filter(t => t !== token);
      });

      // thêm token vào dropzone mới
      const arr = Array.isArray(newMap[dropIndex]) ? [...newMap[dropIndex]] : [];
      if (!arr.includes(token)) arr.push(token);
      newMap[dropIndex] = arr;

      const updatedEntry = { ...entry, mapping: newMap };
      let next = { ...prev, [qIndex]: updatedEntry };

      // xử lý theo mode
      if (mode === "testing") {
        validateAnswerWithServer(qIndex, { mapping: newMap });
      } else if (showAnswersGlobal && isAnswerComplete(questions[qIndex], updatedEntry)) {
        const comp = computeCorrectnessLocal(questions[qIndex], updatedEntry);
        if (comp) next[qIndex] = { ...updatedEntry, correct: comp.correct };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
      }

      return next;
    });
  };
  const removeAssignedItem = (qIndex, dropIndex, token) => {
    if (isReadOnly()) return;

    setAnswers(prev => {
      const entry = prev[qIndex] || {};
      const prevMap = entry.mapping || {};
      const arr = (prevMap[dropIndex] || []).filter(t => t !== token);
      const newMap = { ...prevMap, [dropIndex]: arr };
      let next = { ...prev, [qIndex]: { ...(entry || {}), mapping: newMap } };

      if (mode === "testing") {
        validateAnswerWithServer(qIndex, { mapping: newMap });
      } else if (showAnswersGlobal && isAnswerComplete(questions[qIndex], next[qIndex])) {
        const comp = computeCorrectnessLocal(questions[qIndex], next[qIndex]);
        if (comp) next[qIndex] = { ...next[qIndex], correct: comp.correct };
      } else {
        if (next[qIndex].hasOwnProperty("correct")) delete next[qIndex].correct;
      }

      return next;
    });
  };

  // ---------- build server payload for one question (used both in validate and submit) ----------
  const buildAnswerPayload = (q, local = {}) => {
    const base = { questionId: q.questionId };
    switch (q.type) {
      case "single":
        return { ...base, selectedTokens: local.token ? [local.token] : (local.selectedTokens || []) };
      case "multi":
        return { ...base, selectedTokens: Array.isArray(local.selectedTokens) ? local.selectedTokens : [] };
      case "drop-match": {
        const pairs = q.raw?.pairs || [];
        const selectedPairs = [];
        for (let i = 0; i < pairs.length; i++) {
          const sel = local?.pairs?.[i];
          if (sel) selectedPairs.push({ left: pairs[i].left, right: sel });
        }
        return { ...base, selectedPairs };
      }
      case "image-area":
        return { ...base, selectedTokens: Array.isArray(local.selectedTokens) ? local.selectedTokens : [] };
      case "matrix": {
        const rows = q.raw?.matrix?.rows || [];
        const cols = q.raw?.matrix?.columns || [];
        const selectedMatrix = [];
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < cols.length; c++) {
            if (local && local[`${r}-${c}`]) selectedMatrix.push({ row: r, col: c });
          }
        }
        return { ...base, selectedMatrix };
      }
      case "drag-drop":
        return { ...base, mapping: local.mapping || {} };
      default:
        return { ...base, selectedTokens: [] };
    }
  };

  // ---------- submit all ----------
  const handleSubmitAttempt = async () => {
    if (!attemptId || submitResult) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const payloadAnswers = questions.map((q, idx) =>
        buildAnswerPayload(q, answers[idx] || {})
      );

      const payload = { answers: payloadAnswers };
      const res = await axios.post(
        `http://localhost:5000/api/attempts/${attemptId}/submit`,
        payload,
        { headers: authHeaders() }
      );

      setSubmitResult(res.data);

      // Sửa lại merge kết quả từ BE khi submit để lưu đúng các trường đặc biệt
      if (Array.isArray(res.data.details)) {
        setAnswers((prev) => {
          const next = { ...prev };
          for (const d of res.data.details) {
            const qIndex = questions.findIndex(
              (q) =>
                String(q.questionId) === String(d.questionId) ||
                String(q.questionId) === String(d.questionId?._id)
            );
            if (qIndex === -1) continue;

            const prevEntry = next[qIndex] || {};
            const merged = {
              ...prevEntry,
              correct: typeof d.isCorrect === "boolean" ? d.isCorrect : prevEntry.correct,
              correctTokens: Array.isArray(d.correctTokens) ? d.correctTokens : [],
              selectedTokens: Array.isArray(d.selectedTokens)
                ? d.selectedTokens
                : prevEntry.selectedTokens || (prevEntry.token ? [prevEntry.token] : []),
              pairs: d.selectedPairs || prevEntry.pairs || {},
              mapping: d.mapping || prevEntry.mapping || {},
            };
            if (Array.isArray(d.selectedMatrix)) {
              d.selectedMatrix.forEach((m) => {
                merged[`${m.row}-${m.col}`] = true;
              });
            }
            if (Array.isArray(d.selectedPairs)) {
              merged.pairs = {};
              const pairs = questions[qIndex]?.raw?.pairs || [];
              d.selectedPairs.forEach((sp, i) => {
                merged.pairs[i] = sp.right;
              });
            }
            next[qIndex] = merged;
          }
          return next;
        });
      }

      setRemainingTime(0);
      setMode("finished");
    } catch (err) {
      console.error("Submit error:", err?.response?.data || err);
    }
  };


  // ---------- retry ----------
  const handleRetry = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRetrying(true);
    setAnswers({});
    setSubmitResult(null);
    setAttemptId(null);
    setMode("training");
    setRemainingTime(null);
    setCurrentPage(1);
    setShowAnswersGlobal(false);
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/exams/${id}?withQuestions=true`);
      const ex = res.data;
      const populated = Array.isArray(ex.questionIds) && ex.questionIds.length > 0 && typeof ex.questionIds[0] === "object";
      if (populated) setQuestions(ex.questionIds.map(normalizeQuestionDoc));
      else setQuestions([]);
      setExamMeta({
        id: ex._id,
        title: ex.title,
        description: ex.description,
        timeLimit: ex.timeLimit,
        random: !!ex.random,
        numQuestions: ex.numQuestions,
        showAnswersAfterSubmit: !!ex.showAnswersAfterSubmit,
        course: ex.courseId?.name || "",
      });
    } catch (err) {
      console.error("Retry load exam error:", err?.response?.data || err);
    } finally {
      setLoading(false);
      setTimeout(() => setRetrying(false), 300);
    }
  };

  // ---------- toggle showAnswersGlobal ----------
  const toggleShowAnswers = async () => {
    setShowAnswersGlobal((prev) => {
      const nextState = !prev;

      if (mode === "training") {
        setAnswers((prevAns) => {
          const next = { ...prevAns };
          if (nextState) {
            questions.forEach((q, qi) => {
              const entry = next[qi] || {};
              if (isAnswerComplete(q, entry)) {
                const comp = computeCorrectnessLocal(q, entry);
                if (comp) {
                  next[qi] = {
                    ...entry,
                    correct: comp.correct,
                    correctTokens: comp.correctTokens || [],
                  };
                }
              } else {
                delete entry.correct;
                delete entry.correctTokens;
              }
            });
          } else {
            Object.keys(next).forEach((k) => {
              delete next[k].correct;
              delete next[k].correctTokens;
            });
          }
          return next;
        });
      }

      if (mode === "testing") {
        if (nextState) {
          setAnswers((prevAns) => ({ ...prevAns }));
          questions.forEach((q, qi) => {
            const entry = answers[qi] || {};
            const hasAny =
              entry &&
              (entry.token ||
                (Array.isArray(entry.selectedTokens) && entry.selectedTokens.length) ||
                Object.keys(entry.pairs || {}).length ||
                Object.keys(entry.mapping || {}).length ||
                Object.keys(entry).some((k) => /^\d+-\d+$/.test(k)));

            if (hasAny) validateAnswerWithServer(qi);
          });
        } else {
          setAnswers((prevAns) => {
            const next = { ...prevAns };
            Object.keys(next).forEach((k) => {
              if (!submitResult) {
                delete next[k].correct;
                delete next[k].correctTokens;
              }
            });
            return next;
          });
        }
      }

      return nextState;
    });
  };


  // ---------- UI helpers ----------
  // In optionClass, chỉ hiện màu đúng/sai khi đã submit và bật show đáp án
  const optionClass = (qIndex, opt) => {
    const a = answers[qIndex] || {};
    // Nếu đang ở testing mode và chưa submit, chỉ hiển thị màu selected cho đáp án đang chọn
    if (mode === "testing" && !submitResult) {
      // Single: hiển thị màu cho đáp án đang chọn
      if (questions[qIndex]?.type === "single") {
        return a.token === opt.token ? "option-selected" : "";
      }
      // Multi: hiển thị màu cho các đáp án đã chọn
      if (questions[qIndex]?.type === "multi") {
        return Array.isArray(a.selectedTokens) && a.selectedTokens.includes(opt.token) ? "option-selected" : "";
      }
    }
    const correctTokens = a?.correctTokens ?? (questions[qIndex]?.options?.filter(o => o.isCorrect).map(o => o.token) ?? []);
    // Chỉ hiện màu khi đã submit và bật showAnswersGlobal
    const showResult = (showAnswersGlobal && (mode === "finished" || (mode === "testing" && submitResult)));
    if (showResult && typeof a.correct === "boolean") {
      if (a.correct) {
        if (Array.isArray(a.selectedTokens)) {
          return a.selectedTokens.includes(opt.token) ? "option-selected-correct" : (correctTokens.includes(opt.token) ? "option-correct" : "");
        }
        return opt.token === a.token ? "option-selected-correct" : (correctTokens.includes(opt.token) ? "option-correct" : "");
      } else {
        if (Array.isArray(a.selectedTokens)) {
          if (a.selectedTokens.includes(opt.token)) return "option-selected-wrong";
          if (correctTokens.includes(opt.token)) return "option-correct";
          return "";
        }
        if (opt.token === a.token) return "option-selected-wrong";
        if (correctTokens.includes(opt.token)) return "option-correct";
        return "";
      }
    }
    if (Array.isArray(a?.selectedTokens)) return a.selectedTokens.includes(opt.token) ? "option-selected" : "";
    return opt.token === a?.token ? "option-selected" : "";
  };

  // ---------- pagination helpers ----------
  const totalQuestions = questions.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalQuestions / questionsPerPage));
  const indexOfLast = currentPage * questionsPerPage;
  const indexOfFirst = indexOfLast - questionsPerPage;
  const currentQuestions = questions.slice(indexOfFirst, indexOfLast);

  const goToQuestion = (idx) => {
    const page = Math.floor(idx / questionsPerPage) + 1;
    setCurrentPage(page);
    setTimeout(() => {
      const el = qRefs.current[idx];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  // ---------- render ----------
  if (loading) return <div className="exam-loading">Đang tải đề thi...</div>;
  if (error) return <div className="exam-error">{error}</div>;
  if (!examMeta) return <div>Không tìm thấy đề thi</div>;

  return (
    <div className="exam-layout">
      <main className="exam-main">
        <div className="exam-header">
          <h1 className="exam-title">{examMeta.title}</h1>
          {examMeta.description && <p className="exam-desc">{examMeta.description}</p>}
          <div className="exam-meta-row">
            <span> Khóa: {examMeta.course || "—"} </span>
            <span> Thời gian: {examMeta.timeLimit} phút </span>
            <span> Tổng: {totalQuestions} câu </span>
          </div>
        </div>

        <div className="questions-list">
          {currentQuestions.length === 0 && <div className="no-questions">Chưa có câu hỏi hiển thị.</div>}

          {currentQuestions.map((q, idx) => {
            const globalIndex = indexOfFirst + idx;
            const a = answers[globalIndex] || {};

            // Đảm bảo pairsList luôn lấy đúng dữ liệu
            let pairsList = [];
            if (Array.isArray(q.raw?.pairs) && q.raw.pairs.length) {
              pairsList = q.raw.pairs;
            } else if (Array.isArray(q.options) && q.options.length && (q.options[0].left !== undefined || q.options[0].right !== undefined)) {
              pairsList = q.options.map((o) => ({ left: o.left, right: o.right }));
            } else if (Array.isArray(q.raw?.leftItems) && Array.isArray(q.raw?.rightItems) && q.raw.leftItems.length && q.raw.rightItems.length) {
              // Nếu có leftItems và rightItems, ghép thành các cặp
              const minLen = Math.min(q.raw.leftItems.length, q.raw.rightItems.length);
              for (let i = 0; i < minLen; i++) {
                pairsList.push({ left: q.raw.leftItems[i], right: q.raw.rightItems[i] });
              }
            }
            // Debug log để kiểm tra dữ liệu drop-match
            if (q.type === "drop-match") {
              console.log('Drop-match pairsList:', pairsList, 'raw:', q.raw, 'options:', q.options);
            }

            const matrixRows = q.raw?.matrix?.rows || [];
            const matrixCols = q.raw?.matrix?.columns || [];
            const draggables = Array.isArray(q.raw?.draggables) && q.raw.draggables.length ? q.raw.draggables : (Array.isArray(q.options) ? q.options.map(o => o.text) : []);
            const dropzones = Array.isArray(q.raw?.dropzones) && q.raw.dropzones.length ? q.raw.dropzones : (q.raw?.dropzones || []);

            // Sửa điều kiện showInlineFeedback: chỉ hiện khi đã nộp bài và bật show đáp án
            const showInlineFeedback = (
              (mode === "training" && showAnswersGlobal && typeof a.correct === "boolean") ||
              ((mode === "testing" || mode === "finished") && showAnswersGlobal && submitResult && typeof a.correct === "boolean")
            );

            return (
              <div
                key={q.questionId || globalIndex}
                id={`q-${globalIndex}`}
                className={`question-card ${(a && (a.token || a.selectedTokens || a.mapping || a.pairs)) ? "question-answered" : ""}`}
                ref={el => qRefs.current[globalIndex] = el}
              >
                <div className="q-title">Câu {globalIndex + 1}:</div>
                <div className="q-content">{q.content}</div>

                {/* single */}
                {q.type === "single" && (
                  <ul className="options-list">
                    {(q.options || []).map((opt) => {
                      const cls = optionClass(globalIndex, opt);
                      const checked = answers[globalIndex]?.token === opt.token;
                      return (
                        <li key={opt.token} className={`option-li ${cls} ${checked ? "selected" : ""}`} onClick={() => handleSelectSingle(globalIndex, q, opt)}>
                          <span className="option-text">{opt.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* multi */}
                {q.type === "multi" && (
                  <ul className="options-list multi">
                    {(q.options || []).map((opt) => {
                      const prevTokens = answers[globalIndex]?.selectedTokens || [];
                      const checked = prevTokens.includes(opt.token);
                      const cls = optionClass(globalIndex, opt);
                      return (
                        <li key={opt.token} className={`option-li ${cls} ${checked ? "selected" : ""}`} onClick={() => handleSelectMulti(globalIndex, q, opt)}>
                          <span className="option-text">{opt.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* drop-match */}
                {q.type === "drop-match" && (
                  <div className="drop-match-box">
                    {pairsList.length > 0 ? (
                      pairsList.map((p, i) => {
                        const value = answers[globalIndex]?.pairs?.[i] || "";
                        return (
                          <div
                            key={i}
                            className="pair-row"
                            style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}
                          >
                            <div style={{ minWidth: 140 }}>{p.left}</div>
                            <select
                              value={value}
                              onChange={(e) => handleDropMatchSelect(globalIndex, i, e.target.value)}
                            >
                              <option value="">—</option>
                              {pairsList.map((pp, j) => (
                                <option key={j} value={pp.right}>
                                  {pp.right}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })
                    ) : (
                      <div>Không có cặp để ghép.</div>
                    )}
                  </div>
                )}


                {/* image-area */}
                {q.type === "image-area" && (
                  <div className="image-area-box">
                    {q.raw?.imageUrl ? (
                      <div style={{ position: "relative", display: "inline-block" }} className="image-area-container">
                        <img src={q.raw.imageUrl} alt="question" className="q-image" />
                        {(q.raw?.areas || []).map((area, aIdx) => {
                          const style = { left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` };
                          const selected = Array.isArray(a.selectedTokens) && a.selectedTokens.includes(String(aIdx));
                          return <div key={aIdx} className={selected ? "image-hotspot selected" : "image-hotspot"} style={{ position: "absolute", ...style }} onClick={() => handleToggleImageArea(globalIndex, aIdx)} />;
                        })}
                      </div>
                    ) : <div>Không có hình ảnh.</div>}
                    <p style={{ marginTop: 8 }}>Click vào vùng (nếu có).</p>
                  </div>
                )}

                {/* matrix */}
                {q.type === "matrix" && (
                  <table className="matrix-table">
                    <thead><tr><th></th>{matrixCols.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
                    <tbody>
                      {matrixRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: "left", paddingLeft: 8 }}>{r}</td>
                          {matrixCols.map((c, j) => {
                            const key = `${i}-${j}`;
                            const checked = !!answers[globalIndex]?.[key];
                            return <td key={j}><input type="checkbox" checked={checked} onChange={() => handleToggleMatrix(globalIndex, i, j)} /></td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Drag-drop */}
                {q.type === "drag-drop" && (
                  <div className="drag-drop-container">
                    {/* Tiêu đề riêng */}
                    <div className="drag-drop-header">
                      <p>Kéo thả các item vào vùng (mỗi vùng có thể chứa nhiều item)</p>
                    </div>

                    {/* Hai cột draggable & dropzone */}
                    <div className="drag-drop-body">
                      {/* Nguồn draggables */}
                      <div className="draggable-list">
                        {draggables.length > 0 ? (
                          draggables.map((d, i) => {
                            const alreadyAssigned = Object.values(
                              answers[globalIndex]?.mapping || {}
                            ).some(arr => Array.isArray(arr) && arr.includes(String(d)));

                            if (alreadyAssigned) return null;

                            return (
                              <div
                                key={i}
                                className="draggable-item"
                                draggable={!isReadOnly()}
                                onDragStart={(e) =>
                                  handleDragStart(e, globalIndex, String(d))
                                }
                              >
                                {d}
                              </div>
                            );
                          })
                        ) : (
                          <div>Không có item để kéo</div>
                        )}
                      </div>

                      {/* Danh sách dropzones */}
                      <div className="dropzone-list">
                        {dropzones.length > 0 ? (
                          dropzones.map((z, di) => {
                            const assigned = Array.isArray(
                              answers[globalIndex]?.mapping?.[di]
                            )
                              ? answers[globalIndex].mapping[di]
                              : [];

                            const correctMap = q.raw?.correctMapping || [];
                            const isAllCorrect =
                              assigned.length > 0 &&
                              assigned.every((tok) =>
                                correctMap.some(
                                  (m) => m.dropzone === z && m.draggable === tok
                                )
                              );

                            const dropzoneClass = [
                              "dropzone",
                              isAllCorrect ? "correct" : ""
                            ].join(" ");

                            return (
                              <div
                                key={di}
                                className={dropzoneClass}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnZone(e, globalIndex, di)}
                              >
                                <div className="dropzone-label">{z}</div>
                                <div className="dropzone-content">
                                  {assigned.length > 0 ? (
                                    assigned.map((item, ii) => (
                                      <div
                                        key={ii}
                                        className="draggable-item assigned"
                                      >
                                        <span>{item}</span>
                                        {!isReadOnly() && (
                                          <button
                                            className="small-remove"
                                            onClick={() =>
                                              removeAssignedItem(globalIndex, di, item)
                                            }
                                            aria-label="remove"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="placeholder">Kéo vào đây</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div>Không có dropzone</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* inline feedback */}
                {showInlineFeedback && (
                  <div className="answer-feedback">
                    {q.type === "single" || q.type === "multi" ? (
                      a.correct ? (
                        <span className="feedback-correct">Bạn trả lời đúng ✅</span>
                      ) : (
                        <span className="feedback-wrong">
                          Sai — đáp án đúng: {
                            (() => {
                              if (Array.isArray(a.correctTokens) && a.correctTokens.length > 0) {
                                return a.correctTokens.map(t => {
                                  const opt = q.options?.find(o => o.token === t);
                                  return opt ? opt.text : t;
                                }).filter(Boolean).join(", ");
                              }
                              return 'Không có đáp án đúng';
                            })()
                          }
                        </span>
                      )
                    ) : (
                      a.correct ? (
                        <span className="feedback-correct">Đúng ✅</span>
                      ) : (
                        <span className="feedback-wrong">Sai ❌</span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pagination-row">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Quay lại</button>
          <div className="page-info">Trang {currentPage} / {totalPages}</div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Tiếp theo</button>
          <button className="retry-btn" onClick={handleRetry}>Làm lại</button>
        </div>
      </main>

      <aside className="exam-aside">
        <div className="aside-top">
          <h3>Danh sách câu</h3>
          <div className="grid-questions">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <button key={i} className={`grid-box ${answers[i] ? "answered" : ""}`} onClick={() => goToQuestion(i)}>{i + 1}</button>
            ))}
          </div>
        </div>

        <div className="aside-controls">
          {/* Hiển thị đáp án */}
          {(mode === "training" || (mode === "testing" && submitResult) || mode === "finished") && (
            <div className="switch-row">
              <span className="label">Hiển thị đáp án</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showAnswersGlobal}
                  onChange={toggleShowAnswers}
                  disabled={mode === "testing" && !submitResult}
                />
                <span className="slider" />
              </label>
            </div>
          )}

          {/* Chọn mode + trộn đề */}
          {!attemptId && !submitResult && (
            <div className="mode-selector">
              <span className="mode-title">Chọn chế độ:</span>
              <div className="mode-buttons">
                <button
                  className={`mode-btn ${selectedMode === "training" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMode("training");
                    handleStartTesting("training", shuffleExam);
                  }}
                >
                  Training
                </button>
                <button
                  className={`mode-btn ${selectedMode === "testing" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMode("testing");
                    handleStartTesting("testing", shuffleExam);
                  }}
                >
                  Testing
                </button>
                <button
                  className={`shuffle-btn ${shuffleExam ? "active" : ""}`}
                  onClick={() => {
                    const newShuffle = !shuffleExam;
                    setShuffleExam(newShuffle);
                    handleStartTesting(selectedMode, newShuffle);
                  }}
                >
                  Trộn đề
                </button>
              </div>
            </div>
          )}

          {/* Đếm giờ + Nộp bài */}
          {mode === "testing" && (
            <>
              <div className="timer-box">
                Thời gian còn lại: <strong>{formatTime(remainingTime || 0)}</strong>
              </div>
              {!submitResult && (
                <button className="submit-btn" onClick={handleSubmitAttempt}>
                  Nộp bài
                </button>
              )}
            </>
          )}

          {/* Kết quả */}
          {submitResult && (
            <div className="result-box">
              <p>Số câu đúng: {submitResult.correctCount} / {submitResult.total}</p>
              <p>Điểm: {submitResult.score10} / 10</p>
              {submitResult.submittedAt && (
                <>
                  {submitResult.elapsedTime && (
                    <p>
                      Thời gian làm: {submitResult.elapsedTime.minutes} phút{" "}
                      {submitResult.elapsedTime.seconds % 60} giây
                    </p>
                  )}
                  <p>
                    Thời gian nộp:{" "}
                    {new Date(submitResult.submittedAt).toLocaleString("vi-VN")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

      </aside>
    </div>
  );
}

// helper: format mm:ss
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}


