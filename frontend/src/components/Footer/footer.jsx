import React from "react";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";
import "./footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Logo + intro */}
        <div className="footer-section">
          <h2 className="footer-logo">EduMaster</h2>
          <p>Nền tảng luyện khóa học cho mọi học sinh, sinh viên.</p>
        </div>

        {/* Quick links */}
        <div className="footer-section">
          <h3>Liên kết nhanh</h3>
          <ul>
            <li>Trang chủ</li>
            <li>Khóa học</li>
            <li>Liên hệ</li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="footer-section">
          <h3>Liên hệ</h3>
          <p>Email: support@master.com</p>
          <p>Điện thoại: +84 123 456 789</p>
          <p>Địa chỉ: TP. Hồ Chí Minh</p>
        </div>

        {/* Social icons */}
        <div className="footer-section">
          <h3>Kết nối</h3>
          <div className="social-icons">
            <FaFacebookF />
            <FaTwitter />
            <FaInstagram />
          </div>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} EduMaster. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
