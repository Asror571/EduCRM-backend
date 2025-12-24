const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getStatistics,
  bulkCreateUsers,
} = require("../controllers/admin.controller");
const { protect } = require("../middlewares/auth.middleware");
const { isAdminOrSuperAdmin } = require("../middlewares/role.middleware");

// All routes are protected and require admin role
router.use(protect);
router.use(isAdminOrSuperAdmin);

router.route("/users").get(getAllUsers).post(createUser);

router.post("/users/bulk", bulkCreateUsers);

router.route("/users/:id").get(getUserById).put(updateUser).delete(deleteUser);

router.post("/users/:id/reset-password", resetUserPassword);
router.get("/statistics", getStatistics);

module.exports = router;
