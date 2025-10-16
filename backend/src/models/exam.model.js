const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  timeLimit: { type: Number, default: 10 }, 
  numQuestions: { type: Number, default: 5 },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  showAnswersAfterSubmit: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);