import React, { useState, useEffect } from "react";
import axios from "axios";
import "./examManagement.css";

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    timeLimit: "",
    numQuestions: "",
    courseId: "",
    showAnswersAfterSubmit: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examRes, courseRes] = await Promise.all([
        axios.get("http://localhost:5000/api/exams"),
        axios.get("http://localhost:5000/api/courses"),
      ]);
      setExams(Array.isArray(examRes.data) ? examRes.data : []);
      setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
    } catch (err) {
      alert("❌ Không thể tải dữ liệu!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("⚠️ Tiêu đề bài thi không được để trống!");
      return;
    }
    if (!form.courseId) {
      alert("⚠️ Vui lòng chọn khóa học!");
      return;
    }

    try {
      if (editing) {
        const res = await axios.put(
          `http://localhost:5000/api/exams/${editing._id}`,
          form
        );
        setExams(exams.map((e) => (e._id === editing._id ? res.data : e)));
      } else {
        const res = await axios.post("http://localhost:5000/api/exams", form);
        setExams([...exams, res.data]);
      }
      resetForm();
    } catch (err) {
      alert("❌ Lưu thất bại!");
      console.error(err);
    }
  };

  const handleEdit = (exam) => {
    setEditing(exam);
    setForm({
      title: exam.title,
      description: exam.description || "",
      timeLimit: exam.timeLimit || 10,
      numQuestions: exam.numQuestions || 5,
      courseId: exam.courseId?._id || exam.courseId || "",
      showAnswersAfterSubmit: exam.showAnswersAfterSubmit || false,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài thi này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/exams/${id}`);
      setExams(exams.filter((e) => e._id !== id));
    } catch (err) {
      alert("❌ Không thể xóa bài thi!");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      timeLimit: 10,
      numQuestions: 5,
      courseId: "",
      showAnswersAfterSubmit: false,
    });
  };

  return (
    <div className="exam-admin">
      <h2>🧮 Quản lý Bài thi</h2>

      {/* Form thêm/sửa */}
      <div className="exam-form">
        <input
          type="text"
          name="title"
          placeholder="Tiêu đề bài thi"
          value={form.title}
          onChange={handleChange}
        />
        <textarea
          name="description"
          placeholder="Mô tả ngắn..."
          value={form.description}
          onChange={handleChange}
        ></textarea>

        <div className="form-row">
          <input
            type="number"
            name="timeLimit"
            value={form.timeLimit}
            onChange={handleChange}
            min="1"
            placeholder="Thời gian (phút)"
          />
          <input
            type="number"
            name="numQuestions"
            value={form.numQuestions}
            onChange={handleChange}
            min="1"
            placeholder="Số câu hỏi"
          />
        </div>

        <select name="courseId" value={form.courseId} onChange={handleChange}>
          <option value="">-- Chọn khóa học --</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="checkbox">
          <input
            type="checkbox"
            name="showAnswersAfterSubmit"
            checked={form.showAnswersAfterSubmit}
            onChange={handleChange}
          />
          Hiển thị đáp án sau khi nộp bài
        </label>

        <div className="actions">
          <button onClick={handleSave}>
            {editing ? "💾 Cập nhật" : "➕ Thêm mới"}
          </button>
          {editing && <button onClick={resetForm}>❌ Hủy</button>}
        </div>
      </div>

      {/* Danh sách bài thi */}
      {loading ? (
        <p>⏳ Đang tải...</p>
      ) : exams.length === 0 ? (
        <p>⚠️ Chưa có bài thi nào.</p>
      ) : (
        <table className="exam-table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Khóa học</th>
              <th>Thời gian</th>
              <th>Số câu hỏi</th>
              <th>Hiển thị đáp án</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e._id}>
                <td>{e.title}</td>
                <td>{e.courseId?.name || "Không rõ"}</td>
                <td>{e.timeLimit} phút</td>
                <td>{e.numQuestions}</td>
                <td>{e.showAnswersAfterSubmit ? "✅" : "❌"}</td>
                <td>{new Date(e.createdAt).toLocaleDateString("vi-VN")}</td>
                <td>
                  <button onClick={() => handleEdit(e)}>✏️ Sửa</button>
                  <button className="danger" onClick={() => handleDelete(e._id)}>
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
