const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const Attempt = require('../models/attempt.model');
const Course = require('../models/course.model');
const { shuffleArray, shuffleQuestions, generateToken } = require('../utils/shuffle');

// ✅ Tạo Exam (Admin)
exports.create = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const { title, description, timeLimit, random, numQuestions, questionIds, courseId, showAnswersAfterSubmit } = req.body;

    // check course tồn tại
    const course = await Course.findById(courseId);
    if (!course) return res.status(400).json({ msg: 'Invalid courseId' });

    // check questionIds tồn tại (nếu gửi)
    if (questionIds?.length) {
      const validQs = await Question.find({ _id: { $in: questionIds } }).countDocuments();
      if (validQs !== questionIds.length) {
        return res.status(400).json({ msg: 'Some questionIds are invalid' });
      }
    }

    const doc = await Exam.create({
      title,
      description,
      timeLimit,
      random,
      numQuestions,
      questionIds,
      courseId,
      showAnswersAfterSubmit
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Danh sách Exam
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) filter.courseId = req.query.courseId;

    const list = await Exam.find(filter)
      .populate('courseId', 'name price durationDays')
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lấy chi tiết 1 Exam (withQuestions=true để trả questionIds)
exports.getOne = async (req, res) => {
  try {
    const { withQuestions } = req.query;
    let query = Exam.findById(req.params.id).populate('courseId', 'name description price durationDays');
    if (withQuestions === 'true') query = query.populate('questionIds');
    const exam = await query.lean();
    if (!exam) return res.status(404).json({ msg: 'Not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFreeExams = async (req, res) => {
  try {
    const freeExams = await Exam.find()
      .populate("courseId")
      .where("courseId")
      .ne(null);

    const filtered = freeExams.filter(
      (exam) => exam.courseId && exam.courseId.price === 0
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


exports.start = async (req, res) => {
  try {
    const examId = req.params.id;
    const mode = req.query.mode === 'testing' ? 'testing' : 'training';
    const shuffleFlag = req.query.shuffle === 'true';

    const exam = await Exam.findById(examId).populate('courseId', 'name').lean();
    if (!exam) return res.status(404).json({ msg: 'Exam not found' });

    // Prepare qIds preserving order (exam.questionIds may be undefined)
    let qIds = Array.isArray(exam.questionIds) ? [...exam.questionIds.map(id => id.toString())] : [];

    // If exam.random is true and shuffle not explicitly false, shuffle qIds
    if (exam.random || shuffleFlag) {
      qIds = shuffleArray(qIds);
    }

    // Apply numQuestions limit
    if (exam.numQuestions && exam.numQuestions < qIds.length) {
      qIds = qIds.slice(0, exam.numQuestions);
    }

    // Fetch questions and reorder according to qIds
    const questionsRaw = await Question.find({ _id: { $in: qIds } }).lean();
    const qById = new Map(questionsRaw.map(q => [q._id.toString(), q]));
    const questionsOrdered = qIds.map(id => qById.get(id)).filter(Boolean);

    // build attemptQuestions (FULL) — keep original detailed logic for types
    let attemptQuestions = questionsOrdered.map((question) => {
      switch (question.type) {
        case "single":
        case "multi": {
          const optObjs = Array.isArray(question.options)
            ? question.options.map((opt, idx) => ({
              text: typeof opt === "object" && opt !== null ? (opt.text ?? "") : String(opt ?? ""),
              origIndex: idx,
            }))
            : [];

          // Shuffle options for this question (we will also call shuffleQuestions later if global shuffle)
          const shuffled = shuffleArray(optObjs);
          const optionsWithTokens = shuffled.map((o) => ({
            token: generateToken(),
            text: o.text,
            origIndex: o.origIndex,
            isCorrect: Array.isArray(question.options) ? !!(question.options[o.origIndex] && question.options[o.origIndex].isCorrect) : false,
          }));

          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            options: optionsWithTokens,
            raw: { options: Array.isArray(question.options) ? question.options.map(opt => (typeof opt === 'object' ? { text: opt.text, isCorrect: !!opt.isCorrect } : { text: String(opt) })) : [] },
          };
        }

        case "drop-match": {
          let pairs = Array.isArray(question.pairs)
            ? question.pairs.map((p, idx) => ({
              token: generateToken(),
              left: p.left,
              right: p.right,
              origIndex: idx,
              isCorrect: !!p.isCorrect,
            }))
            : [];
          // shuffle pairs locally
          pairs = shuffleArray(pairs);

          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            pairs,
            raw: { pairs: Array.isArray(question.pairs) ? question.pairs.map(pp => ({ left: pp.left, right: pp.right, isCorrect: !!pp.isCorrect })) : [] },
          };
        }

        case "image-area": {
          const areas = Array.isArray(question.areas)
            ? question.areas.map((a, idx) => ({
              token: generateToken(),
              area: a,
              origIndex: idx,
              isCorrect: !!a.isCorrect,
            }))
            : [];

          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            imageUrl: question.imageUrl,
            options: areas,
            raw: { areas: Array.isArray(question.areas) ? question.areas.map(a => ({ x: a.x, y: a.y, width: a.width, height: a.height, isCorrect: !!a.isCorrect })) : [] },
          };
        }

        case "matrix": {
          const rows = Array.isArray(question.matrix?.rows) ? question.matrix.rows : [];
          const cols = Array.isArray(question.matrix?.columns) ? question.matrix.columns : [];
          const correct = Array.isArray(question.matrix?.correct) ? question.matrix.correct : [];

          const cells = [];
          for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < cols.length; c++) {
              const token = generateToken();
              cells.push({
                token,
                row: r,
                col: c,
                origIndex: `${r}:${c}`,
                isCorrect: !!(correct[r] && correct[r][c]),
              });
            }
          }

          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            matrix: { rows, columns: cols, correct },
            options: cells,
            raw: { matrix: { rows, columns: cols, correct } },
          };
        }

        case "drag-drop": {
          const items = Array.isArray(question.draggables)
            ? question.draggables.map((text, idx) => ({
              token: generateToken(),
              text,
              origIndex: idx,
              isCorrect: !!(question.correctMapping || []).some((m) => m.draggable === text),
              position: idx,
            }))
            : [];
          const shuffled = shuffleArray(items);

          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            options: shuffled,
            dropzones: question.dropzones || [],
            correctMapping: question.correctMapping || [],
            raw: { dropzones: question.dropzones || [], correctMapping: question.correctMapping || [] },
          };
        }

        default: {
          return {
            questionId: question._id,
            type: question.type,
            content: question.content,
            options: Array.isArray(question.options)
              ? question.options.map((o, idx) => ({
                token: generateToken(),
                text: typeof o === "object" && o !== null ? (o.text ?? String(idx)) : String(o),
                origIndex: idx,
                isCorrect: !!(o && o.isCorrect),
              }))
              : [],
            raw: { options: question.options || [] },
          };
        }
      }
    });

    // Nếu user bật shuffleFlag thì shuffle toàn bộ câu + bên trong (sử dụng hàm bạn đã viết)
    if (shuffleFlag || exam.random) {
      attemptQuestions = shuffleQuestions(attemptQuestions);
    }

    // Nếu mode === 'testing' -> SAVE Attempt, trả publicQuestions
    let attempt = null;
    if (mode === 'testing') {
      // Lấy thông tin khóa học
      const course = exam.courseId; // vì đã populate rồi
      const isFree = !course?.price || course.price === 0;

      // Nếu KHÔNG miễn phí mà chưa đăng nhập → chặn
      if (!isFree && (!req.user || !req.user._id)) {
        return res.status(401).json({ msg: 'Unauthorized. Login required for paid course testing mode.' });
      }

      // Nếu có user (hoặc free) thì vẫn lưu Attempt nếu có user, ngược lại chỉ trả về dữ liệu
      if (req.user && req.user._id) {
        attempt = await Attempt.create({
          examId,
          userId: req.user._id,
          mode,
          timeLimitMinutes: exam.timeLimit || 0,
          questions: attemptQuestions,
          total: attemptQuestions.length,
          startedAt: new Date()
        });
      }
    }

    // Build publicQuestions (ẩn isCorrect & origIndex) — giống logic cũ
    const publicQuestions = attemptQuestions.map((aq) => {
      switch (aq.type) {
        case "single":
        case "multi":
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            options: (aq.options || []).map((o) => ({ token: o.token, text: o.text })),
            raw: { options: (aq.raw?.options || []).map(o => ({ text: o.text })) },
          };

        case "drop-match":
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            pairs: (aq.pairs || []).map((p) => ({ left: p.left, right: p.right })),
            raw: { pairs: (aq.raw?.pairs || []).map(p => ({ left: p.left, right: p.right })) },
          };

        case "image-area":
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            imageUrl: aq.imageUrl,
            options: (aq.options || []).map((o) => ({ token: o.token, area: o.area })),
            raw: { areas: (aq.raw?.areas || []).map(a => ({ x: a.x, y: a.y, width: a.width, height: a.height })) },
          };

        case "matrix":
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            rows: aq.matrix?.rows || [],
            columns: aq.matrix?.columns || [],
            options: (aq.options || []).map((o) => ({ token: o.token, row: o.row, col: o.col })),
            raw: { matrix: { rows: aq.matrix?.rows || [], columns: aq.matrix?.columns || [] } },
          };

        case "drag-drop":
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            options: (aq.options || []).map((o) => ({ token: o.token, text: o.text })),
            dropzones: aq.dropzones || [],
            raw: { dropzones: aq.raw?.dropzones || [], correctMapping: aq.raw?.correctMapping || [] },
          };

        default:
          return {
            questionId: aq.questionId,
            type: aq.type,
            content: aq.content,
            options: (aq.options || []).map(o => ({ token: o.token, text: o.text })),
            raw: aq.raw || {},
          };
      }
    });

    // Response: nếu có attempt (testing) trả attemptId, nếu training thì attempt null
    res.json({
      attemptId: attempt ? attempt._id : null,
      course: exam.courseId?.name,
      examTitle: exam.title,
      mode,
      timeLimitMinutes: exam.timeLimit || 0,
      questions: publicQuestions,
    });
  } catch (err) {
    console.error("Start exam error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Cập nhật Exam (Admin)
exports.updateExam = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const examId = req.params.id;
    const { title, description, timeLimit, random, numQuestions, questionIds, courseId, showAnswersAfterSubmit } = req.body;

    // kiểm tra course tồn tại nếu có courseId
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(400).json({ msg: 'Invalid courseId' });
    }

    // kiểm tra questionIds nếu có
    if (questionIds?.length) {
      const validQs = await Question.find({ _id: { $in: questionIds } }).countDocuments();
      if (validQs !== questionIds.length) {
        return res.status(400).json({ msg: 'Some questionIds are invalid' });
      }
    }

    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(typeof timeLimit !== 'undefined' && { timeLimit }),
      ...(typeof random !== 'undefined' && { random }),
      ...(typeof numQuestions !== 'undefined' && { numQuestions }),
      ...(questionIds && { questionIds }),
      ...(courseId && { courseId }),
      ...(typeof showAnswersAfterSubmit !== 'undefined' && { showAnswersAfterSubmit }),
    };

    const updated = await Exam.findByIdAndUpdate(examId, updateData, { new: true });
    if (!updated) return res.status(404).json({ msg: 'Exam not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Xóa Exam (Admin) — chỉ khi không còn questionIds và không có Attempt
exports.deleteExam = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const examId = req.params.id;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Nếu còn questionIds -> chặn xóa
    if (Array.isArray(exam.questionIds) && exam.questionIds.length > 0) {
      return res.status(400).json({
        error: 'Không thể xoá đề thi vì còn câu hỏi liên quan.'
      });
    }

    // Nếu có Attempt đã lưu -> chặn xóa
    const hasAttempt = await Attempt.exists({ examId });
    if (hasAttempt) {
      return res.status(400).json({
        error: 'Không thể xóa đề thi vì đã có lượt làm (attempt) liên quan.'
      });
    }

    await Exam.findByIdAndDelete(examId);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
