const pool = require('../config/db');

// 1. Lấy toàn bộ danh sách dịch vụ / quầy nước đang bán
async function getAllServices(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, category, price, unit, is_active FROM services ORDER BY category, name'
    );
    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tiện ích: ' + error.message
    });
  }
}

// 2. Admin thêm món tiện ích mới vào quầy
async function createService(req, res) {
  try {
    const { name, category, price, unit } = req.body;

    if (!name || !price || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên món, Đơn giá và Đơn vị tính.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO services (name, category, price, unit, is_active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), category || 'drink', price, unit.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm tiện ích mới thành công.',
      data: {
        id: result.insertId,
        name,
        price
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo tiện ích: ' + error.message
    });
  }
}

// 3. Nhân viên thêm tiện ích (nước, bóng, áo...) vào đơn ca đá của khách
async function addServiceToBooking(req, res) {
  try {
    const { booking_id, service_id, quantity } = req.body;

    if (!booking_id || !service_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp booking_id và service_id.'
      });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const [serviceRows] = await pool.query('SELECT price, name FROM services WHERE id = ?', [service_id]);
    if (serviceRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Món tiện ích không tồn tại.'
      });
    }

    const unitPrice = serviceRows[0].price;

    const [existing] = await pool.query(
      'SELECT id, quantity FROM booking_services WHERE booking_id = ? AND service_id = ?',
      [booking_id, service_id]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + qty;
      await pool.query(
        'UPDATE booking_services SET quantity = ? WHERE id = ?',
        [newQty, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO booking_services (booking_id, service_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [booking_id, service_id, qty, unitPrice]
      );
    }

    return res.status(200).json({
      success: true,
      message: `Đã thêm ${qty} ${serviceRows[0].name} vào đơn ca đá!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm tiện ích vào đơn: ' + error.message
    });
  }
}

// 4. Lấy chi tiết toàn bộ các món tiện ích mà 1 ca đá đã gọi kèm tổng tiền
async function getBookingServices(req, res) {
  try {
    const bookingId = req.params.bookingId;

    const [rows] = await pool.query(
      `SELECT 
        bs.id,
        bs.service_id,
        s.name AS service_name,
        s.unit,
        s.category,
        bs.quantity,
        bs.unit_price,
        (bs.quantity * bs.unit_price) AS total_item_price,
        bs.created_at
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?
       ORDER BY bs.id ASC`,
      [bookingId]
    );

    const totalServiceAmount = rows.reduce((sum, item) => sum + Number(item.total_item_price), 0);

    return res.status(200).json({
      success: true,
      booking_id: Number(bookingId),
      total_service_amount: totalServiceAmount,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết dịch vụ: ' + error.message
    });
  }
}

// 5. Admin xóa món tiện ích / dịch vụ khỏi quầy
async function deleteService(req, res) {
  try {
    const serviceId = req.params.id;

    const [existing] = await pool.query('SELECT id, name FROM services WHERE id = ?', [serviceId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Món tiện ích không tồn tại.'
      });
    }

    await pool.query('DELETE FROM services WHERE id = ?', [serviceId]);

    return res.status(200).json({
      success: true,
      message: `Đã xóa món "${existing[0].name}" khỏi quầy thành công!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tiện ích: ' + error.message
    });
  }
}

module.exports = {
  getAllServices,
  createService,
  addServiceToBooking,
  getBookingServices,
  deleteService
};