const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Tuyến đường nội bộ (Admin & Staff)
router.post('/login', authController.login);
router.get('/profile', verifyToken, authController.getProfile);
router.get('/me', verifyToken, authController.getProfile);

// Quản lý nhân viên (Admin & Staff xem ca trực)
router.get('/staff', verifyToken, requireRole(['admin', 'staff']), authController.getAllStaff);
router.post('/create-staff', verifyToken, requireRole(['admin']), authController.createStaff);
router.patch('/staff/:id/shift', verifyToken, requireRole(['admin']), authController.updateStaffShift);
router.delete('/staff/:id', verifyToken, requireRole(['admin']), authController.deleteStaff);

// Tuyến đường khách hàng (Web & Mobile App)
router.post('/register', authController.customerRegister);
router.post('/customer/register', authController.customerRegister);
router.post('/customer/login', authController.customerLogin);

module.exports = router;