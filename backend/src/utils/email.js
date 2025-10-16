const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // hoặc SMTP server của bạn
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"EduMaster" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email was sent to:", to);
  } catch (err) {
    console.error("Email error:", err.message);
  }
};

module.exports = sendEmail;
