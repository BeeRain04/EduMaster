const mongoose = require("mongoose");

const purchasedCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  startDate: { type: Date, default: Date.now },     // ngày bắt đầu học
  endDate: { type: Date, required: true },           // ngày hết hạn gói học
  approved: { type: Boolean, default: false },       // admin duyệt mua
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'cancelled'], 
    default: 'pending' 
  }
}, { _id: false });

// Schema chính cho người dùng
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },

  // Danh sách các khóa học đã mua
  purchasedCourses: [purchasedCourseSchema],

  // Trạng thái tài khoản (có thể dùng để khóa user hết hạn)
  accountStatus: { 
    type: String, 
    enum: ['active', 'expired', 'pending'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
