import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import "./myCourses.css";

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/my-courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // API giờ trả về mảng course với exams: []
        setCourses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setError("Không thể tải danh sách khóa học.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const toggleCourse = (id) => setExpandedCourse(prev => prev === id ? null : id);

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="myCourses container">
      <h1 className="page-title">Khóa học của tôi</h1>

      {courses.length === 0 ? (
        <p className="no-courses">Bạn chưa có khóa học nào được duyệt.</p>
      ) : (
        <div className="course-list">
          {courses.map((course) => (
            <div className="course-card" key={course.id}>
              <div className="course-header" onClick={() => toggleCourse(course.id)}>
                <div className="course-info">
                  <BookOpen className="course-icon" />
                  <div className="course-meta">
                    <h3 className="course-name">{course.name}</h3>
                    <p className="course-sub">⏳ {course.durationDays} ngày</p>
                  </div>
                </div>
                {expandedCourse === course.id ? (
                  <ChevronUp className="dropdown-icon" />
                ) : (
                  <ChevronDown className="dropdown-icon" />
                )}
              </div>

              {expandedCourse === course.id && (
                <div className="exam-list">
                  {Array.isArray(course.exams) && course.exams.length > 0 ? (
                    course.exams.map((exam) => (
                      <div className="exam-item" key={exam._id}>
                        <div className="exam-left">
                          <span className="exam-name">📝 {exam.title || "Bài kiểm tra"} </span>
                          <small className="exam-meta"> • {exam.numQuestions || '-'} câu • {exam.timeLimit || 0} phút</small>
                        </div>
                        <button
                          className="start-btn"
                          onClick={() => navigate(`/exams/${exam._id}`)}
                        >
                          Làm bài
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-exams">Chưa có bài kiểm tra nào cho khóa này.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
