import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/navbar";
import Footer from "./components/Footer/footer";
import Home from "./pages/Home/home";
import ExamDetail from "./pages/Exam/examDetail";
import Support from "./pages/Support/support";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from "./pages/Dashboard/dashboard";
import MyCourses from "./pages/MyCourses/myCourses";
import ExamHistory from "./pages/ExamHistory/examHistory";
import "./App.css";

export default function App() {

  return (
    <div className="app-container">
      <Navbar/>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exams/:id" element={<ExamDetail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/support" element={<Support />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/history" element={<ExamHistory />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
