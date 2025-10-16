const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['single','multi','drop-match','image-area','matrix','drag-drop'], 
    required: true 
  },

  // Cho single/multi
  options: [optionSchema],

  // (nếu vẫn cần lưu index thì giữ lại)
  correctIndexes: [{ type: Number }],

  // Cho drop-match
  pairs: [{
    left: { type: String },
    right: { type: String }
  }],

  // Cho chọn vùng hình
  imageUrl: { type: String },
  areas: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],

  // Cho lưới Yes/No
  matrix: {
    rows: [{ type: String }],
    columns: [{ type: String }],
    correct: [[Boolean]]
  },

  // Cho kéo thả
  draggables: [{ type: String }],
  dropzones: [{ type: String }],
  correctMapping: [{
    draggable: String,
    dropzone: String
  }],
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
