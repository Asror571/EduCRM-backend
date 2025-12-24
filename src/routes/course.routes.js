const express = require("express");
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStatistics,
} = require("../controllers/course.controller");
const { protect } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");

router.use(protect);

router.route("/").get(getAllCourses).post(isAdminOrSuperAdmin, createCourse);

router
  .route("/:id")
  .get(getCourseById)
  .put(isAdminOrSuperAdmin, updateCourse)
  .delete(isAdminOrSuperAdmin, deleteCourse);

router.get("/:id/statistics", isAdminOrSuperAdmin, getCourseStatistics);

module.exports = router;
