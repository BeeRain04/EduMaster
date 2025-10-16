import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AuthPopup.css";

export default function AuthPopup({ onClose, onAuthSuccess }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", formData);
      const user = res.data.user || res.data;
      const token = res.data.token;
      if (user && token) {
        sessionStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem("token", token);
        onAuthSuccess?.(user);
        onClose();
        navigate(user.role === "admin" ? "/dashboard" : "/");
      } else {
        setError("Không tìm thấy thông tin người dùng trong phản hồi.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.msg ||
        err.response?.data?.error ||
        "Đăng nhập thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <button className="auth-close" onClick={onClose} aria-label="Đóng">✖</button>

        <h2 className="auth-title">Chào mừng trở lại 👋</h2>
        <p className="auth-subtitle">Đăng nhập để tiếp tục hành trình học của bạn</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field">
            <label>Mật khẩu</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
