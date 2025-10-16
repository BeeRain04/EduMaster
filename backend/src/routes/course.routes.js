const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { authMiddleware, adminOnly } = require("../middlewares/auth.middleware");

router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);
router.post("/", authMiddleware, adminOnly, courseController.createCourse);
router.put("/:id", authMiddleware, adminOnly, courseController.updateCourse);
router.delete("/:id", authMiddleware, adminOnly, courseController.deleteCourse);

module.exports = router;
