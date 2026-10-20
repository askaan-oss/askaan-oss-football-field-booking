const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục lưu ảnh tồn tại
const uploadDir = path.join(__dirname, '../uploads/pitches');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình vị trí lưu và đặt tên file chống trùng lặp
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'pitch-' + uniqueSuffix + ext);
  }
});

// Chỉ nhận file ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ được phép tải lên file hình ảnh (jpg, png, webp...)!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn tối đa 5MB
});

module.exports = upload;