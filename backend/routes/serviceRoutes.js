const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Công khai (Xem menu quầy nước)
router.get('/', serviceController.getAllServices);

// Admin tạo món và xóa món
router.post('/', verifyToken, requireRole(['admin']), serviceController.createService);
router.delete('/:id', verifyToken, requireRole(['admin']), serviceController.deleteService);

// Gọi món và xem hóa đơn theo ca đá
router.post('/order', verifyToken, serviceController.addServiceToBooking);
router.get('/order/:bookingId', verifyToken, serviceController.getBookingServices);

module.exports = router;