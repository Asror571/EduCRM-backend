const asyncHandler = require("express-async-handler");
const { Course } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");

/**
 * @desc    Get all courses
 * @route   GET /api/v1/courses
 * @access  Public
 */
const getAllCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, level, isActive, search } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (category) {query.category = category;}
  if (level) {query.level = level;}
  if (isActive !== undefined) {query.isActive = isActive === "true";}
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const courses = await Course.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Course.countDocuments(query);

  return paginatedResponse(
    res,
    courses,
    page,
    limit,
    total,
    "Courses retrieved successfully",
  );
});

/**
 * @desc    Get course by ID
 * @route   GET /api/v1/courses/:id
 * @access  Public
 */
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return notFoundResponse(res, "Course not found");
  }

  return successResponse(res, "Course retrieved successfully", course);
});

/**
 * @desc    Create new course
 * @route   POST /api/v1/courses
 * @access  Private/Admin
 */
const createCourse = asyncHandler(async (req, res) => {
  const courseData = {
    ...req.body,
    organizationId: req.user.organizationId,
  };

  const course = await Course.create(courseData);

  return createdResponse(res, "Course created successfully", course);
});

/**
 * @desc    Update course
 * @route   PUT /api/v1/courses/:id
 * @access  Private/Admin
 */
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return notFoundResponse(res, "Course not found");
  }

  if (course.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Course not found");
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  );

  return successResponse(res, "Course updated successfully", updatedCourse);
});

/**
 * @desc    Delete course
 * @route   DELETE /api/v1/courses/:id
 * @access  Private/Admin
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return notFoundResponse(res, "Course not found");
  }

  if (course.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Course not found");
  }

  // Check if course has active groups
  const { Group } = require("../models");
  const activeGroups = await Group.countDocuments({
    courseId: course._id,
    status: "active",
  });

  if (activeGroups > 0) {
    return badRequestResponse(res, "Cannot delete course with active groups");
  }

  await course.deleteOne();

  return successResponse(res, "Course deleted successfully");
});

/**
 * @desc    Get course statistics
 * @route   GET /api/v1/courses/:id/statistics
 * @access  Private/Admin
 */
const getCourseStatistics = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return notFoundResponse(res, "Course not found");
  }

  const { Group, Student } = require("../models");

  // Get all groups for this course
  const groups = await Group.find({ courseId: course._id });
  const groupIds = groups.map((g) => g._id);

  // Count students
  const totalStudents = await Student.countDocuments({
    currentGroups: { $in: groupIds },
  });

  const activeStudents = await Student.countDocuments({
    currentGroups: { $in: groupIds },
    status: "active",
  });

  const stats = {
    course: {
      id: course._id,
      name: course.name,
      level: course.level,
    },
    groups: {
      total: groups.length,
      active: groups.filter((g) => g.status === "active").length,
    },
    students: {
      total: totalStudents,
      active: activeStudents,
    },
    pricing: course.pricing,
    stats: course.stats,
  };

  return successResponse(
    res,
    "Course statistics retrieved successfully",
    stats,
  );
});

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStatistics,
};
