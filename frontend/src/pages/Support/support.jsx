import React, { useState } from "react";
import { FaQuestionCircle, FaComments, FaEnvelope, FaPhone, FaFacebook } from "react-icons/fa";
import "./support.css";

const Support = () => {
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [status, setStatus] = useState("");
    const [openFAQ, setOpenFAQ] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("⏳ Đang gửi...");

        try {
            const res = await fetch("http://localhost:5000/api/support/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setStatus("✅ Gửi phản hồi thành công!");
                setFormData({ name: "", email: "", message: "" });
            } else {
                setStatus("❌ Gửi thất bại!");
            }
        } catch (err) {
            setStatus("❌ Lỗi server!");
        }

        setTimeout(() => setStatus(""), 4000); // Ẩn sau 4s
    };

    const faqs = [
        { q: "Sử dụng web như thế nào?", a: "EduMaster cho bạn học thử trước khi đăng kí mua khóa học." },
        { q: "Tôi có thể xem lại kết quả sau khi nộp bài không?", a: "Có! Vào mục 'Lịch sử làm bài' để xem chi tiết kết quả." },
        { q: "Mua khóa học như thế nào?", a: "Trên homepage của EduMaster có nút đăng kí khóa học bạn có thể nhấn chọn." },
        { q: "Có thể làm lại bài thi nhiều lần không?", a: "Có. Làm nhiều lần sẽ giúp bạn đạt điểm cao hơn" },
        { q: "Sau khi mua khóa học xong sẽ sử dụng như thế nào?", a: "Sau khi nhận được email duyệt mua khóa học thành công thì bạn phải đăng nhập vào hệ thống" },
        { q: "Sẽ có những khóa học về gì?", a: "EduMaster có những khóa học trắc nghiệm về lập trình." },
    ];

    return (
        <div className="support-page">
            {/* Banner */}
            <section className="support-banner">
                <h1>Hỗ trợ & Trợ giúp 💡</h1>
                <p>Bạn cần giúp đỡ? Chúng tôi luôn sẵn sàng đồng hành cùng bạn 🚀</p>
            </section>

            <div className="support-container">
                {/* FAQ */}
                <div className="support-card faq-card">
                    <FaQuestionCircle className="support-icon faq-icon" />
                    <h2>Câu hỏi thường gặp</h2>
                    <div className="faq-list">
                        {faqs.map((item, idx) => (
                            <div
                                key={idx}
                                className={`faq-item ${openFAQ === idx ? "open" : ""}`}
                                onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                            >
                                <div className="faq-question">{item.q}</div>
                                {openFAQ === idx && <div className="faq-answer">{item.a}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feedback */}
                <div className="support-card feedback-card">
                    <FaComments className="support-icon feedback-icon" />
                    <h2>Gửi phản hồi</h2>
                    <form className="support-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            name="name"
                            placeholder="Họ và tên"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <textarea
                            name="message"
                            placeholder="Nội dung phản hồi..."
                            rows="4"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        />
                        <button type="submit">📨 Gửi phản hồi</button>
                    </form>
                    {status && <p className="status-msg">{status}</p>}
                </div>

                {/* Contact */}
                <div className="support-card contact-card">
                    <FaEnvelope className="support-icon contact-icon" />
                    <h2>Liên hệ</h2>
                    <div className="contact-info">
                        <p>📧 Email: support@edumaster.com</p>
                        <p>📱 Zalo: 0123 456 789</p>
                        <p>💬 Facebook: fb.com/EduMaster</p>
                        <p>📍 Địa chỉ: Đồng Nai</p>
                        <p>🕐 Giờ làm việc: Thứ 2 - Thứ 6 (8:00 - 21:00)</p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="contact-actions">
                        <button className="btn-call">📞 Gọi ngay</button>
                        <button className="btn-chat">💬 Chat Zalo</button>
                    </div>

                    {/* Google map (dummy) */}
                    <iframe
                        className="contact-map"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.783475256646!2d106.78856187316913!3d10.75116405966301!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3175245cd5cff1b7%3A0xf4b00d8ea70e2caa!2zMy0yMyBMw70gVGjDoWkgVOG7lSwgUGjDuiBI4buvdSwgTmjGoW4gVHLhuqFjaCwgxJDhu5NuZyBOYWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1759239875313!5m2!1svi!2s"
                        loading="lazy">
                    </iframe>

                    <div className="contact-socials">
                        <a href="#"><i className="fab fa-facebook"></i></a>
                        <a href="#"><i className="fab fa-instagram"></i></a>
                        <a href="#"><i className="fab fa-twitter"></i></a>
                        <a href="#"><i className="fab fa-linkedin"></i></a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Support;
