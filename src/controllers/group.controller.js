const asyncHandler = require("express-async-handler");
const { Group, Course, Teacher, Student } = require("../models");
const {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  paginatedResponse,
} = require("../utils/apiResponse");

/**
 * @desc    Get all groups
 * @route   GET /api/v1/groups
 * @access  Private
 */
const getAllGroups = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    courseId,
    teacherId,
    search,
  } = req.query;

  const query = { organizationId: req.user.organizationId };

  if (status) {query.status = status;}
  if (courseId) {query.courseId = courseId;}
  if (teacherId) {query.mainTeacher = teacherId;}
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
    ];
  }

  const groups = await Group.find(query)
    .populate("courseId", "name level")
    .populate("mainTeacher", "userId")
    .populate({
      path: "mainTeacher",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Group.countDocuments(query);

  return paginatedResponse(
    res,
    groups,
    page,
    limit,
    total,
    "Groups retrieved successfully",
  );
});

/**
 * @desc    Get group by ID
 * @route   GET /api/v1/groups/:id
 * @access  Private
 */
const getGroupById = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate("courseId")
    .populate({
      path: "mainTeacher",
      populate: {
        path: "userId",
        select: "firstName lastName email phone",
      },
    })
    .populate({
      path: "currentStudents.studentId",
      populate: {
        path: "userId",
        select: "firstName lastName phone",
      },
    });

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  return successResponse(res, "Group retrieved successfully", group);
});

/**
 * @desc    Create new group
 * @route   POST /api/v1/groups
 * @access  Private/Admin
 */
const createGroup = asyncHandler(async (req, res) => {
  const {
    name,
    courseId,
    mainTeacher,
    schedule,
    roomNumber,
    startDate,
    endDate,
    maxStudents,
    pricing,
  } = req.body;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return notFoundResponse(res, "Course not found");
  }

  // Verify teacher exists
  const teacher = await Teacher.findById(mainTeacher);
  if (!teacher) {
    return notFoundResponse(res, "Teacher not found");
  }

  // Create group
  const group = await Group.create({
    organizationId: req.user.organizationId,
    name,
    courseId,
    mainTeacher,
    schedule,
    roomNumber,
    roomCapacity: maxStudents,
    startDate,
    endDate,
    maxStudents,
    pricing,
  });

  // Add to teacher's current groups
  teacher.currentGroups.push(group._id);
  await teacher.save();

  await group.populate("courseId mainTeacher");

  return createdResponse(res, "Group created successfully", group);
});

/**
 * @desc    Update group
 * @route   PUT /api/v1/groups/:id
 * @access  Private/Admin
 */
const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  if (group.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Group not found");
  }

  const updatedGroup = await Group.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("courseId mainTeacher");

  return successResponse(res, "Group updated successfully", updatedGroup);
});

/**
 * @desc    Delete group
 * @route   DELETE /api/v1/groups/:id
 * @access  Private/Admin
 */
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  if (group.organizationId.toString() !== req.user.organizationId.toString()) {
    return notFoundResponse(res, "Group not found");
  }

  // Check if group has students
  if (group.currentStudents.length > 0) {
    return badRequestResponse(
      res,
      "Cannot delete group with enrolled students",
    );
  }

  // Remove from teacher's groups
  await Teacher.updateMany(
    { currentGroups: group._id },
    { $pull: { currentGroups: group._id } },
  );

  await group.deleteOne();

  return successResponse(res, "Group deleted successfully");
});

/**
 * @desc    Start group
 * @route   POST /api/v1/groups/:id/start
 * @access  Private/Admin
 */
const startGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  if (group.status !== "planned") {
    return badRequestResponse(res, "Group is already started or completed");
  }

  // Check minimum students
  const activeStudents = group.currentStudents.filter(
    (s) => s.status === "active",
  ).length;
  if (activeStudents < group.minStudents) {
    return badRequestResponse(
      res,
      `Group requires minimum ${group.minStudents} students to start`,
    );
  }

  group.status = "active";
  await group.save();

  return successResponse(res, "Group started successfully", group);
});

/**
 * @desc    Complete group
 * @route   POST /api/v1/groups/:id/complete
 * @access  Private/Admin
 */
const completeGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  group.status = "completed";

  // Update all students to completed
  group.currentStudents.forEach((enrollment) => {
    if (enrollment.status === "active") {
      enrollment.status = "completed";
    }
  });

  await group.save();

  // Update students' status
  await Student.updateMany(
    {
      _id: { $in: group.currentStudents.map((s) => s.studentId) },
      status: "active",
    },
    {
      $pull: { currentGroups: group._id },
      status: "completed",
      completedDate: new Date(),
    },
  );

  return successResponse(res, "Group completed successfully", group);
});

/**
 * @desc    Cancel group
 * @route   POST /api/v1/groups/:id/cancel
 * @access  Private/Admin
 */
const cancelGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  group.status = "cancelled";
  await group.save();

  // Remove group from students
  await Student.updateMany(
    { currentGroups: group._id },
    { $pull: { currentGroups: group._id } },
  );

  return successResponse(res, "Group cancelled successfully", group);
});

/**
 * @desc    Get group attendance
 * @route   GET /api/v1/groups/:id/attendance
 * @access  Private
 */
const getGroupAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = { groupId: req.params.id };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {query.date.$gte = new Date(startDate);}
    if (endDate) {query.date.$lte = new Date(endDate);}
  }

  const { Attendance } = require("../models");
  const attendance = await Attendance.find(query)
    .populate("studentId", "userId")
    .populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    })
    .sort({ date: -1, lessonNumber: -1 });

  return successResponse(res, "Attendance retrieved successfully", attendance);
});

/**
 * @desc    Mark attendance
 * @route   POST /api/v1/groups/:id/attendance
 * @access  Private/Teacher/Admin
 */
const markAttendance = asyncHandler(async (req, res) => {
  const { date, lessonNumber, attendanceRecords } = req.body;

  const group = await Group.findById(req.params.id);
  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  const { Attendance } = require("../models");

  // Create attendance records
  const records = await Promise.all(
    attendanceRecords.map((record) =>
      Attendance.create({
        organizationId: req.user.organizationId,
        groupId: group._id,
        studentId: record.studentId,
        teacherId: group.mainTeacher,
        date: new Date(date),
        lessonNumber,
        status: record.status,
        arrivedLate: record.arrivedLate || false,
        minutesLate: record.minutesLate || 0,
        notes: record.notes,
        markedBy: req.user._id,
      }),
    ),
  );

  // Update group stats
  group.totalClasses += 1;
  await group.save();

  // Update students' attendance
  for (const record of attendanceRecords) {
    const student = await Student.findById(record.studentId);
    if (student) {
      student.attendance.totalClasses += 1;
      if (record.status === "present") {
        student.attendance.attendedClasses += 1;
      }
      student.updateAttendance();
      await student.save();
    }
  }

  return createdResponse(res, "Attendance marked successfully", records);
});

/**
 * @desc    Get group schedule
 * @route   GET /api/v1/groups/:id/schedule
 * @access  Private
 */
const getGroupSchedule = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate("courseId", "name")
    .populate({
      path: "mainTeacher",
      populate: {
        path: "userId",
        select: "firstName lastName",
      },
    });

  if (!group) {
    return notFoundResponse(res, "Group not found");
  }

  const schedule = {
    group: {
      id: group._id,
      name: group.name,
      course: group.courseId.name,
      teacher: `${group.mainTeacher.userId.firstName} ${group.mainTeacher.userId.lastName}`,
      room: group.roomNumber,
    },
    schedule: group.schedule,
    dates: {
      start: group.startDate,
      end: group.endDate,
    },
  };

  return successResponse(
    res,
    "Group schedule retrieved successfully",
    schedule,
  );
});

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  startGroup,
  completeGroup,
  cancelGroup,
  getGroupAttendance,
  markAttendance,
  getGroupSchedule,
};
