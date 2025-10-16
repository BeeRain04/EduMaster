import React, { useEffect, useState } from "react";
import axios from "axios";
import "./userManagement.css";
import { ChevronDown } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/auth/users/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateCourseStatus = async (email, courseId, newStatus) => {
    try {
      const url =
        newStatus === "approved"
          ? "http://localhost:5000/api/auth/approve-course"
          : "http://localhost:5000/api/auth/cancel-course";

      const body =
        newStatus === "approved"
          ? { email, courseId, status: "approved" }
          : { email, courseId };

      await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchUsers();
    } catch (err) {
      console.error(`❌ Lỗi khi cập nhật trạng thái ${newStatus}:`, err);
      alert("Không thể cập nhật trạng thái.");
    }
  };

  if (loading) return <p className="loading">Đang tải dữ liệu...</p>;

  return (
    <div className="user-management-page">
      <div className="user-management-container">
        <h2>📋 Quản lý người dùng đăng kí khóa học</h2>

        <table className="user-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Khóa học</th>
              <th>Giá</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {users.flatMap((user) =>
              user.purchasedCourses.map((course) => (
                <tr key={`${user._id}-${course.courseId._id}`}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{course.courseId.name}</td>
                  <td>
                    {course.courseId.price > 0
                      ? `${course.courseId.price.toLocaleString()} VND`
                      : "Miễn phí"}
                  </td>
                  <td>{new Date(course.startDate).toLocaleDateString()}</td>
                  <td>{new Date(course.endDate).toLocaleDateString()}</td>
                  <td>
                    <div className={`status-select ${course.paymentStatus}`}>
                      <select
                        className="dropdown-status"
                        value={course.paymentStatus}
                        onChange={(e) =>
                          updateCourseStatus(
                            user.email,
                            course.courseId._id,
                            e.target.value
                          )
                        }
                      >
                        <option value="pending">⏳ Chờ duyệt</option>
                        <option value="approved">✅ Đã duyệt</option>
                        <option value="cancelled">❌ Đã hủy</option>
                      </select>
                      <ChevronDown className="icon" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
