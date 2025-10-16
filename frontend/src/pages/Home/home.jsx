import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClock,
  FaTag,
  FaAward,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBookOpen,
  FaStar,
} from "react-icons/fa";
import CourseRegister from "../../components/RequestCourse/courseRegister";
import "./home.css";

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [freeExams, setFreeExams] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const navigate = useNavigate();

  // 🧩 Lấy tất cả khóa học
  useEffect(() => {
    fetch("http://localhost:5000/api/courses")
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error(err));
  }, []);

  // 🎯 Lấy exam có course miễn phí
  useEffect(() => {
    fetch("http://localhost:5000/api/exams/free")
      .then((res) => res.json())
      .then((data) => setFreeExams(data))
      .catch((err) => console.error(err));
  }, []);

  const visibleCourses = showAll
    ? courses.filter((c) => c.price > 0)
    : courses.filter((c) => c.price > 0).slice(0, 4);

  const handleOpenPopup = (course = null) => {
    setSelectedCourse(course ? (course._id ? course._id : course) : null);
    setShowPopup(true);
  };

  const handleTryFreeExam = () => {
    if (freeExams.length === 0) {
      alert("Hiện chưa có đề học thử nào!");
      return;
    }
    const randomExam = freeExams[Math.floor(Math.random() * freeExams.length)];
    navigate(`/exams/${randomExam._id}`);
  };

  // ✨ Hiệu ứng khi cuộn xuống
  useEffect(() => {
    const reveals = document.querySelectorAll(".home-reveal");
    const onScroll = () => {
      reveals.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight - 100) el.classList.add("home-active");
      });
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home-wrapper">
      {/* 🌟 Banner */}
      <section className="home-hero-section">
        <div className="home-hero-content">
          <h1>
            Khám phá tri thức cùng <span>EduMaster</span>
          </h1>
          <p>
            Mở rộng tầm hiểu biết, phát triển kỹ năng, và chinh phục sự nghiệp
            của bạn với các khóa học chất lượng từ giảng viên hàng đầu.
          </p>
          <div className="home-hero-buttons">
            <button className="home-btn-primary" onClick={handleTryFreeExam}>
              Học thử miễn phí
            </button>
            <button
              className="home-btn-outline"
              onClick={() => handleOpenPopup()}
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </section>

      {/* 💡 Giới thiệu */}
      <section className="home-about-section home-reveal">
        <h2>Về EduMaster</h2>
        <p>
          EduMaster mang đến nền tảng học tập trực tuyến với trải nghiệm hiện
          đại, thân thiện và hiệu quả. Học mọi lúc, mọi nơi — phát triển sự
          nghiệp bền vững.
        </p>

        <div className="home-about-features">
          <div className="home-feature-card">
            <FaChalkboardTeacher className="home-feature-icon" />
            <h3>Giảng viên hàng đầu</h3>
            <p>Đội ngũ chuyên gia giàu kinh nghiệm và uy tín.</p>
          </div>
          <div className="home-feature-card">
            <FaUserGraduate className="home-feature-icon" />
            <h3>Học viên toàn quốc</h3>
            <p>Hơn 20.000 học viên đã và đang theo học.</p>
          </div>
          <div className="home-feature-card">
            <FaBookOpen className="home-feature-icon" />
            <h3>Khóa học đa dạng</h3>
            <p>Từ kỹ năng nghề nghiệp đến phát triển bản thân.</p>
          </div>
          <div className="home-feature-card">
            <FaAward className="home-feature-icon" />
            <h3>Chứng chỉ uy tín</h3>
            <p>Được công nhận bởi các tổ chức đào tạo quốc tế.</p>
          </div>
        </div>
      </section>

      {/* 🏆 Thành tựu */}
      <section className="home-achievement home-reveal">
        <div className="home-achievement-item">
          <h3>20K+</h3>
          <p>Học viên</p>
        </div>
        <div className="home-achievement-item">
          <h3>150+</h3>
          <p>Khóa học</p>
        </div>
        <div className="home-achievement-item">
          <h3>80+</h3>
          <p>Giảng viên</p>
        </div>
        <div className="home-achievement-item">
          <h3>99%</h3>
          <p>Hài lòng</p>
        </div>
      </section>

      {/* 🎓 Danh sách khóa học */}
      <section className="home-courses-section home-reveal">
        <h2>Khóa học nổi bật</h2>
        {courses.filter((c) => c.price > 0).length === 0 ? (
          <p className="home-no-course">
            Hiện chưa có khóa học trả phí nào được đăng tải.
          </p>
        ) : (
          <div className="home-course-list">
            {visibleCourses.map((course) => (
              <div key={course._id} className="home-course-card premium">
                <h3>{course.name}</h3>
                <div className="home-course-info">
                  <span>
                    <FaClock /> {course.durationDays || 0} ngày
                  </span>
                  <span>
                    <FaTag />{" "}
                    {typeof course.price === "number" && course.price > 0
                      ? `${course.price.toLocaleString()} VND`
                      : "Miễn phí"}
                  </span>
                </div>
                <button
                  className="home-btn-gradient"
                  onClick={() => handleOpenPopup(course)}
                >
                  Đăng ký học ngay
                </button>
              </div>
            ))}
          </div>
        )}
        {courses.filter((c) => c.price > 0).length > 4 && (
          <button
            className="home-load-more-btn"
            onClick={() => setShowAll((p) => !p)}
          >
            {showAll ? "Ẩn bớt" : "Xem thêm"}
          </button>
        )}
      </section>

      {/* 💬 Cảm nhận học viên */}
      <section className="home-feedback home-reveal">
        <h2>Cảm nhận học viên</h2>
        <div className="home-feedback-list">
          {[
            {
              name: "Nguyễn Minh Khoa",
              comment:
                "EduMaster giúp tôi tự tin hơn trong công việc nhờ khóa học lập trình Web.",
            },
            {
              name: "Lê Thanh Huyền",
              comment:
                "Các bài giảng cực kỳ chi tiết, giảng viên dễ hiểu và hỗ trợ nhanh.",
            },
            {
              name: "Trần Quốc Bảo",
              comment:
                "Giao diện học rất đẹp và dễ sử dụng. Tôi rất thích tính năng học thử miễn phí!",
            },
          ].map((f, i) => (
            <div key={i} className="home-feedback-card">
              <div className="home-feedback-inner">
                <div className="home-feedback-front">
                  <FaStar className="home-star" /> <FaStar className="home-star" />
                  <FaStar className="home-star" /> <FaStar className="home-star" />
                  <FaStar className="home-star" />
                  <h4>{f.name}</h4>
                </div>
                <div className="home-feedback-back">
                  <p>{f.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🚀 CTA */}
      <section className="home-cta-section home-reveal">
        <h2>Bắt đầu hành trình học tập ngay hôm nay!</h2>
        <p>Đăng ký để mở khóa tiềm năng và cơ hội thành công.</p>
        <button className="home-btn-primary">Tham gia ngay</button>
      </section>

      {showPopup && (
        <CourseRegister
          courseId={selectedCourse}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
};

export default Home;
