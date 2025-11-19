const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Course = require("../models/course.model");
const sendEmail = require("../utils/email");
const Exam = require("../models/exam.model");

// Sinh token JWT
const generateToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Lần đầu cho phép tạo admin đầu tiên
//Lần sau thì chỉ admin mới được tạo tài khoản cho user và admin khác
//user đăng ký sẽ ở trạng thái pending chờ admin duyệt
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // --- Validate cơ bản ---
    if (!username || !email || !password)
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });

    // --- Validate email ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Email không hợp lệ." });

    // --- Validate mật khẩu ---
    if (password.length < 6)
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({
        message: "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số.",
      });

    // --- Kiểm tra email đã tồn tại ---
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email đã tồn tại." });

    // --- Kiểm tra có admin nào chưa ---
    const userCount = await User.countDocuments();

    let role = "user";
    let accountStatus = "pending";

    // ✅ Nếu đây là tài khoản đầu tiên => tạo admin và kích hoạt luôn
    if (userCount === 0) {
      role = "admin";
      accountStatus = "active";
    }

    // --- Mã hóa mật khẩu ---
    const hash = await bcrypt.hash(password, 10);

    // --- Tạo user ---
    const newUser = new User({
      name: username,
      email,
      password: hash,
      role,
      accountStatus,
    });

    await newUser.save();

    // Nếu không phải admin đầu tiên => gửi mail báo đăng ký thành công chờ duyệt
    if (role === "user") {
      await sendEmail(
        email,
        "📩 Đăng ký tài khoản thành công (chờ duyệt)",
        `
        <p>Xin chào ${username},</p>
        <p>Bạn đã đăng ký tài khoản thành công.</p>
        <p>Tài khoản của bạn hiện đang ở trạng thái <b>chờ duyệt</b>. Vui lòng đợi admin kích hoạt.</p>
        `
      );
    }

    return res.status(201).json({
      message:
        role === "admin"
          ? "🎉 Tài khoản admin đầu tiên đã được tạo và kích hoạt thành công!"
          : "✅ Đăng ký thành công! Vui lòng chờ admin duyệt tài khoản.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        accountStatus: newUser.accountStatus,
      },
    });
  } catch (err) {
    console.error("❌ Lỗi khi đăng ký:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ✅ Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Tài khoản không tồn tại" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Sai mật khẩu" });

    const token = generateToken(user);
    const { password: _, ...userData } = user.toObject();

    return res.status(200).json({
      message: "Đăng nhập thành công",
      user: userData,
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ Đăng xuất
exports.logout = (req, res) => {
  return res.status(200).json({ message: "Đăng xuất thành công" });
};

// ✅ Danh sách user (Admin Only)
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách user và khóa học kèm trạng thái
exports.listUsersWithCourses = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("purchasedCourses.courseId", "name durationDays price");

    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ User xem danh sách khóa học đã được duyệt của chính họ
// GET /api/auth/my-courses  (hoặc route bạn đang dùng)
exports.getMyApprovedCourses = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId)
      .populate('purchasedCourses.courseId', 'name durationDays price')
      .select('purchasedCourses');

    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    // lọc khóa đã duyệt
    const approvedCourses = user.purchasedCourses.filter(c => !!c.approved);

    if (!approvedCourses.length) {
      return res.status(200).json([]); // trả mảng rỗng
    }

    // lấy danh sách courseIds
    const courseIds = approvedCourses
      .map(c => c.courseId && c.courseId._id)
      .filter(Boolean);

    // lấy tất cả exam liên quan tới các courseIds
    const exams = await Exam.find({ courseId: { $in: courseIds } })
      .select('_id title courseId timeLimit numQuestions')
      .lean();

    // nhóm exams theo courseId để gộp dễ hơn (map courseId -> [exams])
    const examsByCourse = exams.reduce((acc, e) => {
      const key = String(e.courseId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});

    // build response
    const data = approvedCourses.map(c => {
      const course = c.courseId || {};
      const examsForCourse = examsByCourse[String(course._id)] || [];
      return {
        id: course._id,
        name: course.name,
        durationDays: course.durationDays,
        endDate: c.endDate,
        exams: examsForCourse, // mảng exam (có thể rỗng)
      };
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error('Lỗi khi lấy khóa học đã duyệt:', err);
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


// ✅ User gửi yêu cầu đăng ký khóa học (chỉ gửi email)
exports.requestCourse = async (req, res) => {
  try {
    const { email, username, password, courseId } = req.body;

    if (!email || !username || !password || !courseId)
      return res.status(400).json({ message: "Thiếu thông tin cần thiết." });

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: "Chỉ chấp nhận email @gmail.com." });
    }

    // Validate mật khẩu user nhập
    if (password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({
        message: "Mật khẩu phải >=6 ký tự, chứa ít nhất 1 chữ hoa và 1 số.",
      });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Không tìm thấy khóa học." });

    let user = await User.findOne({ email });

    if (!user) {
      // Tạo user mới ở trạng thái pending
      const hash = await bcrypt.hash(password, 10);

      user = new User({
        name: username,
        email,
        password: hash, // lưu hash trong DB
        role: "user",
        accountStatus: "pending",
        purchasedCourses: [
          {
            courseId,
            endDate: new Date(Date.now() + (course.durationDays || 30) * 24 * 60 * 60 * 1000),
            approved: false,
            paymentStatus: "pending",
          },
        ],
      });

      await user.save();

      // Gửi email cho admin, kèm password gốc user đặt
      await sendEmail(
        process.env.EMAIL_USER,
        `📘 Yêu cầu đăng ký khóa học mới: ${course.name}`,
        `
          <p><b>Tên:</b> ${username}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Password:</b> ${password}</p>
          <p><b>Khóa học:</b> ${course.name}</p>
          <p><b>Giá:</b> ${course.price > 0 ? course.price + " VND" : "Miễn phí"}</p>
          <p><b>Trạng thái tài khoản:</b> Chờ duyệt</p>
        `
      );

      return res.status(200).json({ message: "🎉 Đã tạo tài khoản và gửi yêu cầu đến admin." });
    }

    // User đã tồn tại → thêm khóa học mới (pending)
    const alreadyHasCourse = user.purchasedCourses.some(
      (p) => p.courseId.toString() === courseId
    );
    if (alreadyHasCourse)
      return res.status(400).json({ message: "Bạn đã đăng ký khóa học này rồi." });

    user.purchasedCourses.push({
      courseId,
      endDate: new Date(Date.now() + (course.durationDays || 30) * 24 * 60 * 60 * 1000),
      approved: false,
      paymentStatus: "pending",
    });

    await user.save();

    // Gửi email admin thông báo có user đăng ký khóa học mới
    await sendEmail(
      process.env.EMAIL_USER,
      `📘 Yêu cầu đăng ký khóa học mới: ${course.name}`,
      `
        <p><b>Tên:</b> ${username}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Khóa học:</b> ${course.name}</p>
      `
    );

    res.status(200).json({ message: "Yêu cầu đăng ký đã được gửi đến admin." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ Admin duyệt hoặc từ chối yêu cầu đăng ký khóa học của user
exports.approveCourse = async (req, res) => {
  try {
    const { email, courseId, status } = req.body; // status = "approved"

    // ✅ Chỉ chấp nhận status = approved
    if (!email || !courseId || status !== "approved") {
      return res.status(400).json({ message: "Thiếu thông tin hoặc trạng thái không hợp lệ." });
    }

    // 🔍 Tìm user
    const user = await User.findOne({ email }).populate("purchasedCourses.courseId");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user." });
    }

    // 🔍 Tìm khóa học
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Không tìm thấy khóa học." });
    }

    // 🔍 Kiểm tra user có đăng ký khóa học chưa
    const purchased = user.purchasedCourses.find(
      (p) => p.courseId._id.toString() === courseId.toString()
    );

    if (!purchased) {
      return res.status(404).json({ message: "Người dùng chưa đăng ký khóa học này." });
    }

    // ✅ Cập nhật trạng thái duyệt
    purchased.approved = true;
    purchased.paymentStatus = "approved";
    user.accountStatus = "active";

    await user.save();

    // 📧 Gửi mail xác nhận
    const subject = `🎓 Khóa học "${course.name}" của bạn đã được duyệt`;
    const html = `
      <p>Xin chào ${user.name},</p>
      <p>Khóa học <b>${course.name}</b> của bạn đã được duyệt thành công.</p>
      <p>Bạn có thể đăng nhập vào hệ thống để bắt đầu học.</p>
    <a 
    href="http://localhost:5173/login" 
    style="
      display: inline-block;
      padding: 10px 18px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin-top: 12px;
    "
  >
    Bắt đầu học
  </a>

  <p style="margin-top: 20px;">Trân trọng,<br>Đội ngũ hỗ trợ</p>
`;

    await sendEmail(user.email, subject, html);

    return res.status(200).json({
      message: `Đã duyệt khóa học "${course.name}" cho ${email} và gửi email thông báo.`,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.cancelCourse = async (req, res) => {
  try {
    const { email, courseId } = req.body;
    const user = await User.findOne({ email }).populate("purchasedCourses.courseId");
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const purchased = user.purchasedCourses.find(
      (p) => p.courseId._id.toString() === courseId.toString()
    );

    if (!purchased) return res.status(404).json({ message: "Không tìm thấy khóa học" });

    purchased.paymentStatus = "cancelled";
    purchased.approved = false;

    await user.save();

    // Gửi mail thông báo
    await sendEmail(
      user.email,
      `❌ Khóa học "${purchased.courseId.name}" đã hết hạn`,
      `
        <div style="font-family:Arial,sans-serif">
          <h3 style="color:#e63946;">Khóa học đã hết hạn</h3>
          <p>Xin chào <b>${user.name}</b>,</p>
          <p>Khóa học <b>${purchased.courseId.name}</b> của bạn đã bị hủy và không còn khả dụng.</p>
          <p>Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ.</p>
          <p>Trân trọng,<br>Đội ngũ quản trị</p>
        </div>
      `
    );

    res.json({ message: "Đã hủy khóa học và gửi email thông báo!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hủy khóa học!", error: err.message });
  }
};


