import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Trophy, BookOpen, Clock, CheckCircle2, XCircle } from "lucide-react";
import "./examHistory.css";

export default function ExamHistory() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/attempts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAttempts(res.data);
      } catch (err) {
        console.error(err);
        setError("Không thể tải lịch sử bài làm.");
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  const filteredAttempts =
    filter === "all"
      ? attempts
      : attempts.filter((a) => a.status === (filter === "finished" ? "finished" : "in-progress"));

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="loading-icon" />
        <p>Đang tải lịch sử bài làm...</p>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="exam-history-container">
      <div className="header-section">
        <h1 className="page-title">Lịch sử bài làm</h1>
      </div>

      {filteredAttempts.length === 0 ? (
        <p className="empty-message">Không có bài nào trong danh mục này.</p>
      ) : (
        <div className="attempt-grid">
          {filteredAttempts.map((attempt) => {
            const scorePercent = Math.round((attempt.score10 / 10) * 100);
            const progressColor =
              scorePercent >= 80 ? "#4CAF50" : scorePercent >= 50 ? "#FFC107" : "#F44336";

            return (
              <div key={attempt._id} className="attempt-card">
                <div className="attempt-header">
                  <BookOpen className="attempt-icon" />
                  <h3>{attempt.examTitle || "Không rõ tên bài thi"}</h3>
                </div>

                <div className="attempt-body">
                  <p>
                    <Clock size={14} />{" "}
                    {new Date(attempt.submittedAt).toLocaleString("vi-VN")}
                  </p>
                  <p>🎯 {attempt.correctCount}/{attempt.total} câu đúng</p>
                  <p>🧩 Chế độ: {attempt.mode === "practice" ? "Training mode" : "Testing mode"}</p>
                </div>

                <div className="progress-section">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${scorePercent}%`, backgroundColor: progressColor }}
                    ></div>
                  </div>
                  <span className="progress-score">{attempt.score10}/10</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
