import React, { useState, useEffect } from "react";
import axios from "axios";
import "./examManagement.css";

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionSearch, setQuestionSearch] = useState("");

  const token = sessionStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    description: "",
    timeLimit: 5,
    numQuestions: 5,
    courseId: "",
    showAnswersAfterSubmit: false,
    questionIds: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examRes, courseRes, questionRes] = await Promise.all([
        axios.get("http://localhost:5000/api/exams"),
        axios.get("http://localhost:5000/api/courses"),
        axios.get("http://localhost:5000/api/questions"),
      ]);
      setExams(Array.isArray(examRes.data) ? examRes.data : []);
      setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
      setQuestions(Array.isArray(questionRes.data) ? questionRes.data : []);
    } catch (err) {
      alert("❌ Không thể tải dữ liệu!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Form Handlers ---
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
    if (form.questionIds.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một câu hỏi!");
      return;
    }

    try {
      if (editing) {
        const res = await axios.put(
          `http://localhost:5000/api/exams/${editing._id}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const course = courses.find((c) => c._id === form.courseId);
        const updatedExam = {
          ...res.data,
          courseId: course || { _id: form.courseId, name: "Không rõ" },
        };
        setExams(exams.map((e) => (e._id === editing._id ? updatedExam : e)));
      } else {
        const res = await axios.post("http://localhost:5000/api/exams", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const course = courses.find((c) => c._id === form.courseId);
        const newExam = {
          ...res.data,
          courseId: course || { _id: form.courseId, name: "Không rõ" },
        };
        setExams([...exams, newExam]);
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
      timeLimit: exam.timeLimit || 5,
      numQuestions: exam.numQuestions || 5,
      courseId: exam.courseId?._id || exam.courseId || "",
      showAnswersAfterSubmit: exam.showAnswersAfterSubmit || false,
      questionIds: exam.questionIds || [],
    });
    setSelectedQuestions(exam.questionIds || []);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài thi này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExams(exams.filter((e) => e._id !== id));
    } catch (err) {
      alert("❌ Không thể xóa bài thi vì còn câu hỏi liên quan!");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      timeLimit: 5,
      numQuestions: 5,
      courseId: "",
      showAnswersAfterSubmit: false,
      questionIds: [],
    });
    setSelectedQuestions([]);
  };

  const filteredQuestions = questions.filter((q) =>
    q.content.toLowerCase().includes(questionSearch.toLowerCase())
  );

  return (
    <div className="exam-admin">
      <h2>🧮 Quản lý Bài thi</h2>

      {/* --- FORM THÊM/SỬA --- */}
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

        <button
          type="button"
          onClick={() => setShowQuestionModal(true)}
          style={{ marginTop: "10px" }}
        >
          ➕ Chọn câu hỏi ({selectedQuestions.length})
        </button>

        <div className="actions">
          <button onClick={handleSave}>
            {editing ? "💾 Cập nhật" : "➕ Thêm mới"}
          </button>
          {editing && <button onClick={resetForm}>❌ Hủy</button>}
        </div>
      </div>

      {/* --- POPUP CHỌN CÂU HỎI --- */}
      {showQuestionModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Chọn câu hỏi</h3>
            <input
              type="text"
              placeholder="Tìm câu hỏi..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
            />
            <div className="question-list">
              {filteredQuestions.map((q) => (
                <div key={q._id} className="question-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestions([...selectedQuestions, q._id]);
                        } else {
                          setSelectedQuestions(
                            selectedQuestions.filter((id) => id !== q._id)
                          );
                        }
                      }}
                    />
                    {q.content}
                  </label>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowQuestionModal(false)}>Hủy</button>
              <button
                onClick={() => {
                  setForm((prev) => ({ ...prev, questionIds: selectedQuestions }));
                  setShowQuestionModal(false);
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DANH SÁCH BÀI THI --- */}
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
                <td>{e.questionIds?.length || 0}</td>
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
