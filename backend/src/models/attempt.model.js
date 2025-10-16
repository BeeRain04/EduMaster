const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  token: { type: String, required: true },   // ID hoặc nhãn của option
  text: { type: mongoose.Schema.Types.Mixed },           
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const pairSchema = new mongoose.Schema({
  left: { type: String, required: true },
  right: { type: String, required: true }
});

const areaSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  width: Number,
  height: Number
});

const matrixSchema = new mongoose.Schema({
  rows: [String],
  columns: [String],
  correct: [[Boolean]]   // 2D array đáp án đúng
});

const mappingSchema = new mongoose.Schema({
  draggable: { type: String, required: true },
  dropzone: { type: String, required: true }
});

const questionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  type: { 
    type: String, 
    enum: ["single", "multi", "drop-match", "image-area", "matrix", "drag-drop"], 
    required: true 
  },

  // Single / Multi
  options: [optionSchema],

  // Drop-match
  pairs: [pairSchema],

  // Image-area
  imageUrl: String,
  areas: [areaSchema],

  // Matrix
  matrix: matrixSchema,

  // Drag-drop
  draggables: [String],
  dropzones: [String],
  correctMapping: [mappingSchema]
});

const attemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mode: { type: String, enum: ["testing", "practice"], default: "testing" },

    questions: [questionSchema],

    timeLimitMinutes: { type: Number, default: 15 },

    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    status: { type: String, enum: ["in-progress", "finished"], default: "in-progress" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
