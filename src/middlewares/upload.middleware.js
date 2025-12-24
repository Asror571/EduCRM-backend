const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/temp";

    // Determine upload path based on file type
    if (file.fieldname === "avatar") {
      uploadPath = "uploads/avatars";
    } else if (file.fieldname === "document") {
      uploadPath = "uploads/documents";
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = env.ALLOWED_FILE_TYPES.split(",");

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`),
      false,
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

// Upload single file
const uploadSingle = (fieldName) => upload.single(fieldName);

// Upload multiple files
const uploadMultiple = (fieldName, maxCount = 10) =>
  upload.array(fieldName, maxCount);

// Upload fields
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
};
