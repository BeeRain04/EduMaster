const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth.controller");
const { authMiddleware, adminOnly } = require("../middlewares/auth.middleware");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.post("/logout", authCtrl.logout);
router.get("/users", authMiddleware, adminOnly, authCtrl.listUsers);
router.post("/approve-course", authMiddleware, adminOnly, authCtrl.approveCourse);
router.post("/cancel-course", authMiddleware, adminOnly, authCtrl.cancelCourse);
router.get("/users/courses", authMiddleware, adminOnly, authCtrl.listUsersWithCourses);
router.post("/request-course", authCtrl.requestCourse);
router.get("/my-courses", authMiddleware, authCtrl.getMyApprovedCourses);

module.exports = router;
