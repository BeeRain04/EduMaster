const express = require("express");
const sendEmail = require("../utils/email"); 
const router = express.Router();

router.post("/feedback", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Thiếu thông tin phản hồi" });
  }

  try {
    await sendEmail(
      process.env.EMAIL_USER, // 📩 gửi thẳng về mail đã đăng ký
      `📩 Phản hồi mới từ ${name}`,
      `
        <h3>Thông tin phản hồi</h3>
        <p><b>Họ tên:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Nội dung:</b></p>
        <p>${message}</p>
      `
    );

    res.status(200).json({ message: "Gửi phản hồi thành công!" });
  } catch (err) {
    console.error("Support route error:", err.message);
    res.status(500).json({ error: "Lỗi gửi email" });
  }
});

module.exports = router;
