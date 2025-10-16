import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LoginPopup from "../Login/authPopup";
import "./navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("showLogin")) {
      const r = params.get("redirect");
      if (r) setRedirectTarget(decodeURIComponent(r));
      setShowPopup(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate]);

  const handleAuthSuccess = (userData) => {
    const u = userData?.user ? userData.user : userData;
    sessionStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    setShowPopup(false);

    if (redirectTarget) {
      navigate(redirectTarget);
      setRedirectTarget(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUser(null);
    setDropdownOpen(false);
    navigate("/");
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">EduMaster</Link>
      </div>

      <ul className="navbar-links">
        <li><Link to="/">Trang chủ</Link></li>
        <li><Link to="/courses">Thông tin về khóa học</Link></li>
        <li><Link to="/support">Liên hệ</Link></li>
      </ul>

      <div className="navbar-user" ref={dropdownRef}>
        {user ? (
          <div
            className="navbar-user-dropdown"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className={`navbar-username-only ${dropdownOpen ? "active" : ""}`}>
              {user.name}
              <span className={`arrow ${dropdownOpen ? "rotated" : ""}`}>▾</span>
            </div>

            <div className={`dropdown-menu ${dropdownOpen ? "show" : ""}`}>
              <Link to="/my-courses">📘 Khóa học của tôi</Link>
              <Link to="/history">🕓 Lịch sử bài làm</Link>
              <button onClick={handleLogout}>🚪 Đăng xuất</button>
            </div>
          </div>
        ) : (
          <button className="login-btn" onClick={() => setShowPopup(true)}>
            Đăng nhập
          </button>
        )}
      </div>

      {showPopup && (
        <LoginPopup
          onClose={() => setShowPopup(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </nav>
  );
};

export default Navbar;
