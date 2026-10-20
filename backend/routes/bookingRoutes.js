const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 1. Kiểm tra ma trận lịch sân (Công khai)
router.get('/check-availability', bookingController.checkAvailability);

// 2. Tuyến đường dành cho Khách hàng (Customer)
router.post('/online', verifyToken, requireRole(['customer']), bookingController.createOnlineBooking);
router.post('/', verifyToken, (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    return bookingController.createDeskBooking(req, res, next);
  }
  return bookingController.createOnlineBooking(req, res, next);
});
router.get('/my', verifyToken, requireRole(['customer']), bookingController.getMyBookings);
router.get('/:id', verifyToken, bookingController.getBookingDetail);
router.patch('/:id/cancel', verifyToken, requireRole(['customer']), bookingController.cancelMyBooking);

// 3. Tuyến đường dành cho Quản trị viên & Nhân viên (Admin & Staff)
router.post('/desk', verifyToken, requireRole(['admin', 'staff']), bookingController.createDeskBooking);
router.get('/', verifyToken, requireRole(['admin', 'staff']), bookingController.getAllBookings);
router.patch('/:id/status', verifyToken, requireRole(['admin', 'staff']), bookingController.updateBookingStatus);
router.patch('/:id/checkin', verifyToken, requireRole(['admin', 'staff']), bookingController.checkinBooking);
router.patch('/:id/payment', verifyToken, requireRole(['admin', 'staff']), bookingController.updatePaymentStatus);

module.exports = router;