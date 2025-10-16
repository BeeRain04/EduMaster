import React, { useState, useEffect } from "react";
import axios from "axios";
import "./courseManagement.css";

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    durationDays: "",
    isTrialAvailable: false,
    active: true,
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/courses");
      setCourses(res.data);
    } catch {
      alert("❌ Lỗi khi tải danh sách khóa học");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return alert("⚠️ Tên khóa học không được để trống");
    try {
      if (editing) {
        const res = await axios.put(
          `http://localhost:5000/api/courses/${editing._id}`,
          formData
        );
        setCourses(courses.map((c) => (c._id === editing._id ? res.data : c)));
      } else {
        const res = await axios.post("http://localhost:5000/api/courses", formData);
        setCourses([...courses, res.data]);
      }
      setFormData({
        name: "",
        price: 0,
        durationDays: 30,
        isTrialAvailable: true,
        active: true,
      });
      setEditing(null);
    } catch {
      alert("❌ Không thể lưu khóa học");
    }
  };

  const handleEdit = (course) => {
    setEditing(course);
    setFormData(course);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa khóa học này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/courses/${id}`);
      setCourses(courses.filter((c) => c._id !== id));
    } catch {
      alert("❌ Không thể xóa khóa học");
    }
  };

  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="course-admin-container">
      <h2 className="page-title">📘 Quản lý Khóa học</h2>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm khóa học..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="course-form">
        <input
          type="text"
          name="name"
          placeholder="Tên khóa học"
          value={formData.name}
          onChange={handleChange}
        />
        <input
          type="number"
          name="price"
          placeholder="Giá (0 = miễn phí)"
          value={formData.price}
          onChange={handleChange}
        />
        <input
          type="number"
          name="durationDays"
          placeholder="Số ngày học"
          value={formData.durationDays}
          onChange={handleChange}
        />
        <label className="toggle">
          <input
            type="checkbox"
            name="isTrialAvailable"
            checked={formData.isTrialAvailable}
            onChange={handleChange}
          />
          Cho học thử
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            name="active"
            checked={formData.active}
            onChange={handleChange}
          />
          Kích hoạt
        </label>
        <div className="form-buttons">
          <button className="save-btn" onClick={handleSave}>
            {editing ? "💾 Cập nhật" : "➕ Thêm mới"}
          </button>
          {editing && (
            <button
              className="cancel-btn"
              onClick={() => {
                setEditing(null);
                setFormData({
                  name: "",
                  price: 0,
                  durationDays: 30,
                  isTrialAvailable: true,
                  active: true,
                });
              }}
            >
              ❌ Hủy
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="loading">⏳ Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="no-data">⚠️ Không có khóa học</p>
      ) : (
        <div className="course-grid">
          {filtered.map((c) => (
            <div className="course-card" key={c._id}>
              <div className="course-header">
                <h3>{c.name}</h3>
                <span className="status-tag">
                  {c.active ? "Đang mở" : "Ngưng bán"}
                </span>
              </div>
              <div className="course-body">
                <p>💰 Giá: {c.price === 0 ? "Miễn phí" : `${c.price}đ`}</p>
                <p>📅 Thời hạn: {c.durationDays} ngày</p>
                <p>🎓 Học thử: {c.isTrialAvailable ? "Có" : "Không"}</p>
              </div>
              <div className="course-actions">
                <button className="edit-btn" onClick={() => handleEdit(c)}>
                  ✏️ Sửa
                </button>
                <button className="delete-btn" onClick={() => handleDelete(c._id)}>
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
