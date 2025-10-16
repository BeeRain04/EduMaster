const Question = require('../models/question.model');
const Exam = require('../models/exam.model');

// 🟢 Tạo câu hỏi
exports.create = async (req, res) => {
  try {
    const q = await Question.create(req.body);
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Lấy danh sách câu hỏi
exports.list = async (req, res) => {
  try {
    const q = await Question.find().sort({ createdAt: -1 });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Lấy 1 câu hỏi cụ thể
exports.getOne = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ msg: 'Not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Cập nhật câu hỏi
exports.update = async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ msg: 'Not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Xóa câu hỏi
exports.remove = async (req, res) => {
  try {
    const qId = req.params.id;
    const question = await Question.findById(qId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // kiểm tra xem có exam nào đang dùng câu hỏi này không
    const examUsing = await Exam.exists({ questionIds: qId });
    if (examUsing) {
      return res.status(400).json({
        error: 'Không thể xoá câu hỏi vì đang được sử dụng trong đề thi.'
      });
    }

    await Question.findByIdAndDelete(qId);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
