const pool = require('../config/db');

// Hàm bổ trợ: Chuyển đổi chuỗi "HH:mm" thành số phút trong ngày
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Hàm bổ trợ: Tính toán giá tiền theo từng block 30 phút dựa vào hệ số ca thực tế (áp dụng weekend_multiplier nếu rơi vào T7 hoặc Chủ Nhật)
async function calculateBookingPrice(pitchId, startTimeStr, endTimeStr, bookingDateStr, connection = pool) {
  const startMin = timeToMinutes(startTimeStr);
  const endMin = timeToMinutes(endTimeStr);

  const [pitchRows] = await connection.query('SELECT price_default FROM pitches WHERE id = ?', [pitchId]);
  if (pitchRows.length === 0) return null;
  const basePricePerHour = Number(pitchRows[0].price_default);
  const pricePer30Min = basePricePerHour / 2;

  // Xác định ngày đặt có phải Thứ 7 (6) hoặc Chủ Nhật (0) không
  let isWeekend = false;
  if (bookingDateStr) {
    const [y, m, d] = bookingDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay();
    isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  }

  // Lấy danh sách quy định 4 ca (bao gồm cả price_multiplier và weekend_multiplier)
  const [rules] = await connection.query('SELECT start_time, end_time, price_multiplier, weekend_multiplier FROM time_slot_rules');

  let totalPrice = 0;
  let cur = startMin;

  while (cur < endMin) {
    const curH = String(Math.floor(cur / 60)).padStart(2, '0');
    const curM = String(cur % 60).padStart(2, '0');
    const curTimeFormatted = `${curH}:${curM}:00`;

    // Tìm rule khớp với mốc 30 phút hiện tại
    const matchedRule = rules.find(r => curTimeFormatted >= r.start_time && curTimeFormatted < r.end_time);
    let multiplier = 1.0;
    if (matchedRule) {
      if (isWeekend && matchedRule.weekend_multiplier) {
        multiplier = Number(matchedRule.weekend_multiplier);
      } else {
        multiplier = Number(matchedRule.price_multiplier);
      }
    }

    totalPrice += pricePer30Min * multiplier;
    cur += 30;
  }

  return Math.round(totalPrice);
}

// Kiểm tra 5 Business Rules: BR-BOOKING-01 -> BR-BOOKING-05
async function validateBookingRules({ pitch_id, booking_date, start_time, end_time }, connection = pool) {
  // BR-BOOKING-01: Không cho phép đặt sân trong quá khứ
  const [startH, startM] = start_time.split(':').map(Number);
  const [bYear, bMonth, bDay] = booking_date.split('-').map(Number);
  const bookingDateTime = new Date(bYear, bMonth - 1, bDay, startH, startM, 0);
  const now = new Date();
  if (bookingDateTime < now) {
    return {
      isValid: false,
      status: 400,
      code: 'BR-BOOKING-01',
      message: '[BR-BOOKING-01] Không cho phép đặt sân trong quá khứ. Vui lòng chọn ngày và giờ trong tương lai.'
    };
  }

  // BR-BOOKING-02: start_time phải nhỏ hơn end_time
  const startMin = timeToMinutes(start_time);
  const endMin = timeToMinutes(end_time);
  if (startMin >= endMin) {
    return {
      isValid: false,
      status: 400,
      code: 'BR-BOOKING-02',
      message: '[BR-BOOKING-02] Giờ bắt đầu (start_time) phải nhỏ hơn giờ kết thúc (end_time).'
    };
  }

  // BR-BOOKING-05: Thời lượng đặt sân tối thiểu là 60 phút
  if (endMin - startMin < 60) {
    return {
      isValid: false,
      status: 400,
      code: 'BR-BOOKING-05',
      message: '[BR-BOOKING-05] Thời lượng đặt sân tối thiểu là 60 phút (1 tiếng).'
    };
  }

  // Kiểm tra mốc chẵn theo 30 phút
  if (startMin % 30 !== 0 || endMin % 30 !== 0) {
    return {
      isValid: false,
      status: 400,
      code: 'BR-BOOKING-STEP',
      message: 'Giờ bắt đầu và kết thúc phải là mốc chẵn theo 30 phút.'
    };
  }

  // BR-BOOKING-03: Booking phải nằm trong giờ hoạt động của sân
  // Giờ mở cửa: 05:00 - 23:00, giờ nghỉ trưa: 11:00 - 14:00
  const openTime = timeToMinutes('05:00'); // 300 phút
  const closeTime = timeToMinutes('23:00'); // 1380 phút
  const lunchStart = timeToMinutes('11:00'); // 660 phút
  const lunchEnd = timeToMinutes('14:00'); // 840 phút

  if (startMin < openTime || endMin > closeTime || (startMin < lunchEnd && endMin > lunchStart)) {
    return {
      isValid: false,
      status: 400,
      code: 'BR-BOOKING-03',
      message: '[BR-BOOKING-03] Booking phải nằm trong giờ hoạt động của sân (Ca sáng: 05:00 - 11:00, Ca chiều & tối: 14:00 - 23:00).'
    };
  }

  // BR-BOOKING-04: Không cho phép booking trùng thời gian với booking đã tồn tại
  const [conflict] = await connection.query(
    `SELECT id FROM bookings 
     WHERE pitch_id = ? 
       AND booking_date = ? 
       AND status != 'cancelled'
       AND start_time < ? 
       AND end_time > ? 
     LIMIT 1`,
    [pitch_id, booking_date, end_time, start_time]
  );

  if (conflict.length > 0) {
    return {
      isValid: false,
      status: 409,
      code: 'BR-BOOKING-04',
      message: '[BR-BOOKING-04] Khung giờ này vừa có khách hàng khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác!'
    };
  }

  return { isValid: true };
}

// 1. Kiểm tra lịch các sân trong ngày (Lấy cả sân active và maintenance)
async function checkAvailability(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ngày cần kiểm tra (YYYY-MM-DD).'
      });
    }

    const [pitches] = await pool.query('SELECT id, name, type, price_default, status FROM pitches ORDER BY id ASC');

    const [bookings] = await pool.query(
      `SELECT id, pitch_id, start_time, end_time, customer_name, status, payment_status, total_price 
       FROM bookings 
       WHERE booking_date = ? AND status != 'cancelled'`,
      [date]
    );

    const [rules] = await pool.query('SELECT shift_name, start_time, end_time, price_multiplier, weekend_multiplier, note FROM time_slot_rules ORDER BY start_time ASC');

    const validIntervals = [
      { start: '05:00', end: '11:00', shift: 'Ca Sáng' },
      { start: '14:00', end: '18:00', shift: 'Ca Chiều' },
      { start: '18:00', end: '22:00', shift: 'Ca Tối (Giờ Vàng)' },
      { start: '22:00', end: '23:00', shift: 'Ca Đêm Muộn' }
    ];

    const timePoints = [];
    validIntervals.forEach(interval => {
      let cur = timeToMinutes(interval.start);
      const end = timeToMinutes(interval.end);
      while (cur < end) {
        const h = String(Math.floor(cur / 60)).padStart(2, '0');
        const m = String(cur % 60).padStart(2, '0');
        const nextCur = cur + 30;
        const nextH = String(Math.floor(nextCur / 60)).padStart(2, '0');
        const nextM = String(nextCur % 60).padStart(2, '0');

        timePoints.push({
          start_time: `${h}:${m}:00`,
          end_time: `${nextH}:${nextM}:00`,
          label: `${h}:${m} - ${nextH}:${nextM}`,
          shift: interval.shift
        });
        cur += 30;
      }
    });

    const [bYear, bMonth, bDay] = date.split('-').map(Number);
    const now = new Date();

    const matrix = pitches.map(pitch => {
      const isPitchMaintenance = pitch.status === 'maintenance';

      const pitchSlots = timePoints.map(tp => {
        const occupied = bookings.find(b => {
          return b.pitch_id === pitch.id &&
                 b.start_time <= tp.start_time &&
                 b.end_time >= tp.end_time;
        });

        const [startH, startM] = tp.start_time.split(':').map(Number);
        const slotDateTime = new Date(bYear, bMonth - 1, bDay, startH, startM, 0);
        const isPast = slotDateTime < now;
        const isAvailable = !isPast && !occupied && !isPitchMaintenance;

        return {
          start_time: tp.start_time,
          end_time: tp.end_time,
          label: tp.label,
          shift: tp.shift,
          is_booked: !!occupied,
          is_past: isPast,
          is_available: isAvailable,
          booking_id: occupied ? occupied.id : null,
          booking_status: occupied ? occupied.status : null,
          payment_status: occupied ? occupied.payment_status : null,
          total_price: occupied ? occupied.total_price : null,
          customer_name: occupied ? occupied.customer_name : null,
          is_maintenance: isPitchMaintenance
        };
      });

      return {
        pitch_id: pitch.id,
        pitch_name: pitch.name,
        pitch_type: pitch.type,
        pitch_status: pitch.status,
        price_default: pitch.price_default,
        slots: pitchSlots
      };
    });

    return res.status(200).json({
      success: true,
      date,
      rules,
      data: matrix,
      raw_bookings: bookings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra lịch sân: ' + error.message
    });
  }
}

// 2. Khách hàng đặt sân trực tuyến (Áp dụng MySQL Transaction + FOR UPDATE chống Race Condition / Double Booking)
async function createOnlineBooking(req, res) {
  let { pitch_id, booking_date, start_time, end_time, customer_name, customer_phone, note } = req.body;
  const customerId = req.user ? req.user.id : null;

  // Tự động trích xuất thông tin khách hàng đã đăng nhập nếu client không gửi kèm
  if ((!customer_name || !customer_phone) && req.user) {
    if (req.user.role === 'customer') {
      const [cRows] = await pool.query('SELECT full_name, phone FROM customers WHERE id = ?', [req.user.id]);
      if (cRows.length > 0) {
        customer_name = customer_name || cRows[0].full_name;
        customer_phone = customer_phone || cRows[0].phone;
      }
    } else {
      const [uRows] = await pool.query('SELECT full_name, username FROM users WHERE id = ?', [req.user.id]);
      if (uRows.length > 0) {
        customer_name = customer_name || uRows[0].full_name;
        customer_phone = customer_phone || uRows[0].username;
      }
    }
  }

  if (!pitch_id || !booking_date || !start_time || !end_time || !customer_name || !customer_phone) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ: Sân, Ngày đá, Giờ bắt đầu, Giờ kết thúc, Tên và SĐT.'
    });
  }

  // Khởi tạo Transaction với khóa Pessimistic Locking (FOR UPDATE)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Khóa hàng của sân bóng trong thời gian transaction để tuần tự hóa các request đặt cùng lúc
    const [pitchCheck] = await conn.query('SELECT id, status FROM pitches WHERE id = ? FOR UPDATE', [pitch_id]);
    if (pitchCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Sân bóng không tồn tại.' });
    }
    if (pitchCheck[0].status === 'maintenance') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Sân này đang trong thời gian bảo trì, không thể nhận lịch đặt!'
      });
    }

    // 2. Kiểm tra toàn bộ 5 quy tắc nghiệp vụ BR-BOOKING-01 -> BR-BOOKING-05 với connection đang giữ lock
    const ruleCheck = await validateBookingRules({ pitch_id, booking_date, start_time, end_time }, conn);
    if (!ruleCheck.isValid) {
      await conn.rollback();
      return res.status(ruleCheck.status).json({
        success: false,
        code: ruleCheck.code,
        message: ruleCheck.message
      });
    }

    const totalPrice = await calculateBookingPrice(pitch_id, start_time, end_time, booking_date, conn);

    // 3. Thực thi chèn đơn đặt sân an toàn 100% không bao giờ trùng lặp
    const [result] = await conn.query(
      `INSERT INTO bookings 
       (customer_id, pitch_id, start_time, end_time, booking_date, customer_name, customer_phone, total_price, status, payment_status, note) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)`,
      [customerId, pitch_id, start_time, end_time, booking_date, customer_name.trim(), customer_phone.trim(), totalPrice, note || null]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Đặt sân thành công! Vui lòng chờ nhân viên trực ban duyệt đơn.',
      data: {
        booking_id: result.insertId,
        total_price: totalPrice,
        status: 'pending'
      }
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đơn đặt sân: ' + error.message
    });
  } finally {
    conn.release();
  }
}

// 3. Nhân viên đặt hộ tại quầy (Áp dụng MySQL Transaction + FOR UPDATE chống trùng với online)
async function createDeskBooking(req, res) {
  const { pitch_id, booking_date, start_time, end_time, customer_name, customer_phone, payment_status, note } = req.body;
  const staffId = req.user ? req.user.id : null;

  if (!pitch_id || !booking_date || !start_time || !end_time || !customer_name || !customer_phone) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin đặt sân.'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Khóa hàng của sân bóng trong transaction
    const [pitchCheck] = await conn.query('SELECT id, status FROM pitches WHERE id = ? FOR UPDATE', [pitch_id]);
    if (pitchCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Sân bóng không tồn tại.' });
    }
    if (pitchCheck[0].status === 'maintenance') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Sân đang bảo trì, không thể tạo đơn đặt tại quầy!'
      });
    }

    // 2. Kiểm tra toàn bộ 5 quy tắc nghiệp vụ BR-BOOKING-01 -> BR-BOOKING-05 với connection đang giữ lock
    const ruleCheckDesk = await validateBookingRules({ pitch_id, booking_date, start_time, end_time }, conn);
    if (!ruleCheckDesk.isValid) {
      await conn.rollback();
      return res.status(ruleCheckDesk.status).json({
        success: false,
        code: ruleCheckDesk.code,
        message: ruleCheckDesk.message
      });
    }

    const totalPrice = await calculateBookingPrice(pitch_id, start_time, end_time, booking_date, conn);

    // 3. Chèn đơn đặt sân
    const [result] = await conn.query(
      `INSERT INTO bookings 
       (customer_id, pitch_id, start_time, end_time, booking_date, customer_name, customer_phone, total_price, status, payment_status, created_by_user_id, note) 
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
      [pitch_id, start_time, end_time, booking_date, customer_name.trim(), customer_phone.trim(), totalPrice, payment_status || 'unpaid', staffId, note || null]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Đặt sân tại quầy thành công!',
      data: {
        booking_id: result.insertId,
        total_price: totalPrice,
        status: 'confirmed'
      }
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đơn tại quầy: ' + error.message
    });
  } finally {
    conn.release();
  }
}

// 4. Lấy danh sách toàn bộ các đơn đặt sân (Dành cho Admin/Staff)
async function getAllBookings(req, res) {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT 
        b.id,
        b.customer_id,
        b.customer_name,
        b.customer_phone,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.status,
        b.payment_status,
        b.note,
        b.created_at,
        p.name AS pitch_name,
        p.type AS pitch_type
      FROM bookings b
      JOIN pitches p ON b.pitch_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND b.booking_date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.id DESC';

    const [rows] = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn đặt: ' + error.message
    });
  }
}

// 5. Cập nhật trạng thái đơn (Dành cho Admin/Staff)
async function updateBookingStatus(req, res) {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    }

    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái đơn #${bookingId} thành ${status}.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái: ' + error.message
    });
  }
}

// 6. Check-in đón khách vào sân (Dành cho Admin/Staff)
async function checkinBooking(req, res) {
  try {
    const bookingId = req.params.id;

    const [rows] = await pool.query('SELECT id, status, customer_name FROM bookings WHERE id = ?', [bookingId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã đơn không tồn tại.' });
    }

    if (rows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Đơn này đã bị hủy, không thể check-in.' });
    }

    await pool.query('UPDATE bookings SET status = "checked_in" WHERE id = ?', [bookingId]);

    return res.status(200).json({
      success: true,
      message: `Khách hàng ${rows[0].customer_name} (Đơn #${bookingId}) đã check-in vào sân!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi check-in: ' + error.message
    });
  }
}

// 7. Cập nhật trạng thái thanh toán (Dành cho Admin/Staff)
async function updatePaymentStatus(req, res) {
  try {
    const bookingId = req.params.id;
    const { payment_status } = req.body;

    if (!['unpaid', 'deposited', 'paid'].includes(payment_status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái thanh toán không hợp lệ.' });
    }

    await pool.query('UPDATE bookings SET payment_status = ? WHERE id = ?', [payment_status, bookingId]);

    return res.status(200).json({
      success: true,
      message: `Cập nhật thanh toán đơn #${bookingId} thành: ${payment_status}.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thanh toán: ' + error.message
    });
  }
}

// 8. Khách hàng xem lịch sử đặt sân của chính mình
async function getMyBookings(req, res) {
  try {
    const customerId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
        b.id,
        b.pitch_id,
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.status,
        b.payment_status,
        b.note,
        b.created_at,
        p.name AS pitch_name,
        p.type AS pitch_type,
        p.avatar_url AS pitch_avatar
      FROM bookings b
      JOIN pitches p ON b.pitch_id = p.id
      WHERE b.customer_id = ?
      ORDER BY b.id DESC`,
      [customerId]
    );

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử đặt sân: ' + error.message
    });
  }
}

// 9. Xem chi tiết 1 đơn đặt sân kèm các món nước/tiện ích đi kèm
async function getBookingDetail(req, res) {
  try {
    const bookingId = req.params.id;

    const [bookingRows] = await pool.query(
      `SELECT 
        b.id,
        b.customer_id,
        b.customer_name,
        b.customer_phone,
        b.pitch_id,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.total_price,
        b.status,
        b.payment_status,
        b.note,
        b.created_at,
        p.name AS pitch_name,
        p.type AS pitch_type,
        p.price_default AS pitch_price,
        p.avatar_url AS pitch_avatar
      FROM bookings b
      JOIN pitches p ON b.pitch_id = p.id
      WHERE b.id = ?`,
      [bookingId]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt sân này.'
      });
    }

    const booking = bookingRows[0];

    // Lấy danh sách nước uống / dịch vụ đi kèm đơn này
    const [serviceRows] = await pool.query(
      `SELECT 
        bs.id,
        bs.service_id,
        s.name AS service_name,
        s.unit,
        bs.quantity,
        bs.unit_price,
        (bs.quantity * bs.unit_price) AS total_item_price
      FROM booking_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.booking_id = ?`,
      [bookingId]
    );

    const totalServiceAmount = serviceRows.reduce((sum, item) => sum + Number(item.total_item_price), 0);
    const finalAmount = Number(booking.total_price) + totalServiceAmount;

    return res.status(200).json({
      success: true,
      data: {
        ...booking,
        services: serviceRows,
        total_service_amount: totalServiceAmount,
        final_total_amount: finalAmount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết đơn đặt sân: ' + error.message
    });
  }
}

// 10. Khách hàng hủy đơn đặt sân của mình
async function cancelMyBooking(req, res) {
  try {
    const bookingId = req.params.id;
    const customerId = req.user.id;

    const [rows] = await pool.query(
      'SELECT id, customer_id, status FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn đặt sân không tồn tại.'
      });
    }

    const booking = rows[0];

    // Kiểm tra quyền sở hữu đơn
    if (booking.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn đặt sân của người khác.'
      });
    }

    // Kiểm tra trạng thái
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn đặt sân này đã được hủy trước đó.'
      });
    }

    if (['checked_in', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Ca đá đã check-in hoặc đã kết thúc, không thể hủy đơn!'
      });
    }

    // Cập nhật trạng thái thành 'cancelled'
    await pool.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [bookingId]);

    return res.status(200).json({
      success: true,
      message: `Đã hủy đơn đặt sân #${bookingId} thành công.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn đặt sân: ' + error.message
    });
  }
}

module.exports = {
  checkAvailability,
  createOnlineBooking,
  createDeskBooking,
  getAllBookings,
  updateBookingStatus,
  checkinBooking,
  updatePaymentStatus,
  getMyBookings,
  getBookingDetail,
  cancelMyBooking
};