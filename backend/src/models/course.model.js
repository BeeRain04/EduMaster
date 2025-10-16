const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, default: 0 }, // 0 = miễn phí
  durationDays: { type: Number, default: 30 }, // thời hạn học (ngày)
  isTrialAvailable: { type: Boolean, default: true }, // có cho học thử không
  active: { type: Boolean, default: true }, // có đang được mở bán không
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
