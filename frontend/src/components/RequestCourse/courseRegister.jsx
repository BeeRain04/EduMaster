import React, { useState, useEffect } from "react";
import axios from "axios";
import "./courseRegister.css";

export default function CourseRegister({ courseId = null, onClose }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [payment, setPayment] = useState("momo");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // load danh sách khóa học để hiển thị chọn khi mở từ banner
    const fetchCourses = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/courses");
        const paidCourses = (res.data || []).filter((c) => c.price > 0);
        setCourses(paidCourses);
      } catch (err) {
        console.error("fetch courses error:", err);
      }
    };
    fetchCourses();
  }, []);

  // nếu parent truyền courseId (khi click từ course card), sync nó
  useEffect(() => {
    if (courseId) setSelectedCourse(courseId);
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !email || !username || !password) {
      setMessage("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/request-course", {
        email,
        username,
        password,
        courseId: selectedCourse,
      });
      setMessage("🎉 Yêu cầu đăng ký đã gửi. Admin sẽ kiểm tra và liên hệ bạn.");
      // Optionally clear fields
      setEmail("");
      setUsername("");
      setPassword("");
      setSelectedCourse(null);
      // giữ popup mở để người dùng thấy message, hoặc auto close:
      // setTimeout(() => onClose && onClose(), 2000);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Lỗi khi gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-overlay" onClick={() => onClose && onClose()}>
      <div className="cr-box" onClick={(e) => e.stopPropagation()}>
        <button className="cr-close" onClick={() => onClose && onClose()}>✖</button>
        <h2 className="cr-title">📘 Đăng ký khóa học</h2>

        <form className="cr-form" onSubmit={handleSubmit}>
          <label className="cr-label">Chọn khóa học</label>
          <div className="cr-course-list">
            {courses.map((c) => (
              <div
                key={c._id}
                className={`cr-course-item ${selectedCourse === c._id ? "selected" : ""}`}
                onClick={() => setSelectedCourse(c._id)}
              >
                <strong>{c.name}</strong>
                <div className="cr-meta">
                  <span>⏱ {c.durationDays || 0} ngày</span>
                  <span>💰 {typeof c.price === "number" && c.price > 0 ? `${c.price.toLocaleString()} VND` : "Miễn phí"}</span>
                </div>
              </div>
            ))}
            {courses.length === 0 && <p className="cr-no-course">Chưa có khóa học nào</p>}
          </div>

          <label className="cr-label">Họ và tên</label>
          <input className="cr-input" value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label className="cr-label">Email</label>
          <input className="cr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label className="cr-label">Password</label>
          <div className="password-field">
            <input
              className="cr-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <label className="cr-label">Phương thức thanh toán</label>
          <div className="cr-payment">
            {["momo", "card", "bank"].map((m) => (
              <label key={m} className="cr-radio">
                <input type="radio" name="payment" value={m} checked={payment === m} onChange={() => setPayment(m)} />
                {m === "momo" ? "Momo" : m === "card" ? "Thẻ" : "Chuyển khoản"}
              </label>
            ))}
          </div>

          <button className="cr-submit" type="submit" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>

        {message && <div className="cr-message">{message}</div>}
      </div>
    </div>
  );
}
