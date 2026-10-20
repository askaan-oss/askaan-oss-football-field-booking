const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Đăng nhập dành cho Quản trị & Nhân viên trực sân (bảng users)
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
      });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password, full_name, role, is_active FROM users WHERE username = ?',
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống.'
      });
    }

    const user = rows[0];

    if (user.is_active !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đang bị khóa. Vui lòng liên hệ chủ sân.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'do_an_tot_nghiep_san_bong_secret_key_2026',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        token: token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập: ' + error.message
    });
  }
}

// 2. Lấy thông tin cá nhân hiện tại
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let rows;
    if (userRole === 'customer') {
      [rows] = await pool.query(
        "SELECT id, phone as username, phone, full_name, 'customer' as role, is_active, created_at FROM customers WHERE id = ?",
        [userId]
      );
    } else {
      [rows] = await pool.query(
        'SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?',
        [userId]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin người dùng: ' + error.message
    });
  }
}

// 3. Admin tạo tài khoản nhân viên mới
async function createStaff(req, res) {
  try {
    const { username, password, full_name, shift_assigned } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: username, password, full_name.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập này đã được sử dụng.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    let shift = 'Vắng mặt / Nghỉ';
    if (Array.isArray(shift_assigned)) {
      shift = shift_assigned.length > 0 ? shift_assigned.join(', ') : 'Vắng mặt / Nghỉ';
    } else if (typeof shift_assigned === 'string' && shift_assigned.trim()) {
      shift = shift_assigned.trim();
    }

    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, role, shift_assigned, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [username.trim(), hashedPassword, full_name.trim(), 'staff', shift, 1]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản nhân viên thành công.',
      data: {
        id: result.insertId,
        username: username.trim(),
        full_name: full_name.trim(),
        shift_assigned: shift,
        role: 'staff'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nhân viên: ' + error.message
    });
  }
}

// 4. Khách hàng đăng ký tài khoản mới (bảng customers)
async function customerRegister(req, res) {
  try {
    const { phone, password, full_name } = req.body;

    if (!phone || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: số điện thoại, mật khẩu và họ tên.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được đăng ký tài khoản.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO customers (phone, password, full_name, is_active) VALUES (?, ?, ?, 1)',
      [phone.trim(), hashedPassword, full_name.trim()]
    );

    const token = jwt.sign(
      {
        id: result.insertId,
        phone: phone.trim(),
        role: 'customer'
      },
      process.env.JWT_SECRET || 'do_an_tot_nghiep_san_bong_secret_key_2026',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        token: token,
        customer: {
          id: result.insertId,
          phone: phone.trim(),
          full_name: full_name.trim(),
          role: 'customer'
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng ký: ' + error.message
    });
  }
}

// 5. Đăng nhập ứng dụng (Universal Login: hỗ trợ cả khách hàng bảng customers và nhân viên/admin bảng users)
async function customerLogin(req, res) {
  try {
    const { phone, username, password } = req.body;
    const accountInput = (phone || username || '').trim();

    if (!accountInput || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập số điện thoại hoặc tên đăng nhập và mật khẩu.'
      });
    }

    // 1. Tìm trong bảng customers trước
    const [custRows] = await pool.query(
      'SELECT id, phone, password, full_name, is_active FROM customers WHERE phone = ?',
      [accountInput]
    );

    if (custRows.length > 0) {
      const customer = custRows[0];

      if (customer.is_active !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản khách hàng đang bị khóa.'
        });
      }

      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác.'
        });
      }

      const token = jwt.sign(
        {
          id: customer.id,
          phone: customer.phone,
          role: 'customer'
        },
        process.env.JWT_SECRET || 'do_an_tot_nghiep_san_bong_secret_key_2026',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: {
          token: token,
          customer: {
            id: customer.id,
            phone: customer.phone,
            username: customer.phone,
            full_name: customer.full_name,
            role: 'customer'
          }
        }
      });
    }

    // 2. Nếu không có trong customers, tìm tiếp trong bảng users (admin / staff)
    const [userRows] = await pool.query(
      'SELECT id, username, password, full_name, role, is_active FROM users WHERE username = ?',
      [accountInput]
    );

    if (userRows.length > 0) {
      const u = userRows[0];

      if (u.is_active !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản lý.'
        });
      }

      const isMatch = await bcrypt.compare(password, u.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác.'
        });
      }

      const token = jwt.sign(
        {
          id: u.id,
          username: u.username,
          role: u.role
        },
        process.env.JWT_SECRET || 'do_an_tot_nghiep_san_bong_secret_key_2026',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: {
          token: token,
          customer: {
            id: u.id,
            phone: u.username,
            username: u.username,
            full_name: u.full_name,
            role: u.role
          }
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Tài khoản không tồn tại trên hệ thống.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng nhập: ' + error.message
    });
  }
}

// 6. Lấy danh sách toàn bộ nhân viên (role = 'staff')
async function getAllStaff(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, role, shift_assigned, is_active, created_at FROM users WHERE role = "staff" ORDER BY id DESC'
    );
    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách nhân viên: ' + error.message
    });
  }
}

// 7. Xóa tài khoản nhân viên
async function deleteStaff(req, res) {
  try {
    const staffId = req.params.id;

    const [existing] = await pool.query('SELECT id, full_name FROM users WHERE id = ? AND role = "staff"', [staffId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nhân viên không tồn tại hoặc không thể xóa tài khoản này.'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [staffId]);

    return res.status(200).json({
      success: true,
      message: `Đã xóa nhân viên "${existing[0].full_name}" thành công!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nhân viên: ' + error.message
    });
  }
}

// 8. Xếp ca trực ban cho nhân viên (Hỗ trợ 1 nhân viên trực nhiều ca)
async function updateStaffShift(req, res) {
  try {
    const staffId = req.params.id;
    const { shift_assigned } = req.body;

    let shift = 'Vắng mặt / Nghỉ';
    if (Array.isArray(shift_assigned)) {
      shift = shift_assigned.length > 0 ? shift_assigned.join(', ') : 'Vắng mặt / Nghỉ';
    } else if (typeof shift_assigned === 'string' && shift_assigned.trim()) {
      shift = shift_assigned.trim();
    }

    await pool.query('UPDATE users SET shift_assigned = ? WHERE id = ? AND role = "staff"', [shift, staffId]);

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật ca trực thành công!',
      data: { shift_assigned: shift }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xếp ca: ' + error.message
    });
  }
}

module.exports = {
  login,
  getProfile,
  createStaff,
  customerRegister,
  customerLogin,
  getAllStaff,
  deleteStaff,
  updateStaffShift
};