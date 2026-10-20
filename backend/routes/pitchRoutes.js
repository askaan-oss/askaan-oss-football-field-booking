const express = require('express');
const router = express.Router();
const pitchController = require('../controllers/pitchController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Reviews quản trị (phải đặt trước /:id)
router.get('/reviews', verifyToken, requireRole(['admin', 'staff']), pitchController.getAllPitchReviews);
router.delete('/reviews/:reviewId', verifyToken, requireRole(['admin']), pitchController.deletePitchReview);

// Công khai (Khách hàng & Quản trị đều xem được)
router.get('/', pitchController.getAllPitches);
const bookingController = require('../controllers/bookingController');
router.get('/availability', bookingController.checkAvailability);
router.get('/time-slots', pitchController.getTimeSlots);
router.get('/time-rules', pitchController.getTimeRules);
router.get('/:id', pitchController.getPitchById);
router.post('/:id/reviews', pitchController.addPitchReview);

// Quản lý ảnh mô tả sân (Admin & Staff)
router.post('/:id/images', verifyToken, requireRole(['admin', 'staff']), upload.single('image'), pitchController.addPitchImage);
router.delete('/:id/images/:imageId', verifyToken, requireRole(['admin', 'staff']), pitchController.deletePitchImage);

// Dành riêng cho Admin (Thêm sân nhận file 'avatar' qua multer)
router.post('/', verifyToken, requireRole(['admin']), upload.single('avatar'), pitchController.createPitch);
router.put('/:id', verifyToken, requireRole(['admin']), upload.single('avatar'), pitchController.updatePitch);
router.patch('/:id/status', verifyToken, requireRole(['admin']), pitchController.updatePitchStatus);
router.delete('/:id', verifyToken, requireRole(['admin']), pitchController.deletePitch);
router.put('/time-rules/:id', verifyToken, requireRole(['admin']), pitchController.updateTimeRule);

module.exports = router;