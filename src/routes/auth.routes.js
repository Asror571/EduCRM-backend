const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyEmail,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require("../validators/auth.validator");

// Public routes
router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validate,
  forgotPassword,
);
router.post(
  "/reset-password/:token",
  resetPasswordValidator,
  validate,
  resetPassword,
);
router.post("/refresh-token", refreshToken);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(protect);
router.post("/logout", logout);
router.get("/me", getMe);
router.put("/profile", updateProfile);
router.put(
  "/change-password",
  changePasswordValidator,
  validate,
  changePassword,
);

module.exports = router;
