const Course = require("../models/course.model");
const Exam = require("../models/exam.model");

// 🟢 Tạo khóa học mới (Admin)
exports.createCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới được tạo khóa học." });
    }

    const { name, price, durationDays, isTrialAvailable, active } = req.body;

    const course = await Course.create({
      name,
      price,
      durationDays,
      isTrialAvailable,
      active,
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🟢 Lấy tất cả khóa học (kèm danh sách đề trong mỗi khóa)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 }).lean();

    // Lấy danh sách exam theo từng khóa
    const courseIds = courses.map((c) => c._id);
    const exams = await Exam.find({ courseId: { $in: courseIds } })
      .select("title description numQuestions timeLimit courseId")
      .lean();

    // Gắn exams vào từng course tương ứng
    const courseWithExams = courses.map((course) => ({
      ...course,
      exams: exams.filter((ex) => ex.courseId.toString() === course._id.toString()),
    }));

    res.json(courseWithExams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Lấy chi tiết 1 khóa học (kèm danh sách exam)
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ error: "Không tìm thấy khóa học." });

    const exams = await Exam.find({ courseId: course._id })
      .select("title description numQuestions timeLimit")
      .lean();

    res.json({ ...course, exams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Cập nhật khóa học (Admin)
exports.updateCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới được sửa khóa học." });
    }

    const { name, price, durationDays, isTrialAvailable, active } = req.body;

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { name, price, durationDays, isTrialAvailable, active },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Không tìm thấy khóa học." });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🟢 Xóa khóa học (Admin, chỉ khi không còn Exam liên quan)
exports.deleteCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới được xóa khóa học." });
    }

    const courseId = req.params.id;
    const hasExam = await Exam.exists({ courseId });

    if (hasExam) {
      return res.status(400).json({
        error: "Không thể xóa khóa học vì vẫn còn đề thi liên quan.",
      });
    }

    const deleted = await Course.findByIdAndDelete(courseId);
    if (!deleted) return res.status(404).json({ error: "Không tìm thấy khóa học." });

    res.json({ message: "Đã xóa khóa học thành công." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
