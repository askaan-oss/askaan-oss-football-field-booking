const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'football_booking_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('=> [DATABASE] Kết nối thành công tới MySQL Server (XAMPP)!');

    // Tự động đồng bộ chuỗi hash bcrypt của mật khẩu "123456" cho các tài khoản mặc định
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('123456', salt);

    // Cập nhật tài khoản Admin & Staff
    await connection.query(
      'UPDATE users SET password = ? WHERE username IN ("admin", "staff1")',
      [defaultPasswordHash]
    );

    // Cập nhật tài khoản Khách hàng mẫu
    await connection.query(
      'UPDATE customers SET password = ? WHERE phone = "0987654321"',
      [defaultPasswordHash]
    );

    console.log('=> [DATABASE] Đã đồng bộ mật khẩu mặc định (123456) thành công!');
    connection.release();
  } catch (error) {
    console.error('=> [DATABASE LỖI] Không thể kết nối tới MySQL: ', error.message);
  }
}

checkConnection();

module.exports = pool;