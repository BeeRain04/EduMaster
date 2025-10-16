import React, { useState, useEffect } from "react";
import Users from "../Dashboard/userManagement";
import Questions from "../Dashboard/questionManagement";
import Exams from "../Dashboard/examManagement";
import Courses from "../Dashboard/courseManagement";
import "./dashboard.css";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, ArcElement, CategoryScale, LinearScale } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, ArcElement, CategoryScale, LinearScale);

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState({ users: 0, exams: 0, questions: 0, course: 0 });

    useEffect(() => {
        const token = sessionStorage.getItem("token");

        const fetchStats = async () => {
            try {
                const [usersRes, examsRes, questionsRes, coursesRes] = await Promise.all([
                    axios.get("http://localhost:5000/api/auth/users", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:5000/api/exams"),
                    axios.get("http://localhost:5000/api/questions"),
                    axios.get("http://localhost:5000/api/courses"),
                ]);

                setStats({
                    users: usersRes.data.length,
                    exams: examsRes.data.length,
                    questions: questionsRes.data.length,
                    courses: coursesRes.data.length,
                });
            } catch (err) {
                console.error("Lỗi lấy thống kê:", err);
            }
        };

        fetchStats();
    }, []);

    const barData = {
        labels: ["Người dùng", "Đề thi", "Câu hỏi", "Khóa học"],
        datasets: [
            {
                label: "Thống kê",
                data: [stats.users, stats.exams, stats.questions, stats.courses],
                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
            },
        ],
    };

    const pieData = {
        labels: ["Người dùng", "Đề thi", "Câu hỏi", "Khóa học"],
        datasets: [
            {
                data: [stats.users, stats.exams, stats.questions, stats.courses],
                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
            },
        ],
    };

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2>Admin Dashboard</h2>
                <ul>
                    <li onClick={() => setActiveTab("overview")}>📊 Tổng quan</li>
                    <li onClick={() => setActiveTab("users")}>👤 Quản lý người dùng</li>
                    <li onClick={() => setActiveTab("questions")}>❓ Quản lý câu hỏi</li>
                    <li onClick={() => setActiveTab("exams")}>📝 Quản lý đề thi</li>
                    <li onClick={() => setActiveTab("courses")}>📚 Quản lý khóa học</li>
                </ul>
            </aside>

            {/* Main content */}
            <main className="main-content">
                {activeTab === "overview" && (
                    <div>
                        <h2>📊 Thống kê chung</h2>
                        <div className="charts">
                            <div className="chart-box">
                                <Bar data={barData} />
                            </div>
                            <div className="chart-box pie">
                                <Pie data={pieData} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === "users" && <Users />}
                {activeTab === "questions" && <Questions />}
                {activeTab === "exams" && <Exams />}
                {activeTab === "courses" && <Courses />}
            </main>
        </div>
    );
}
