const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// 1. Lấy danh sách toàn bộ các sân bóng kèm điểm đánh giá sao
async function getAllPitches(req, res) {
  try {
    const showAll = req.query.all === 'true';
    const pitchType = req.query.type;
    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.type, 
        p.price_default, 
        p.status, 
        p.avatar_url,
        p.avatar_url AS image,
        COALESCE(ROUND(AVG(r.rating), 1), 5.0) AS average_rating,
        COUNT(r.id) AS total_reviews
      FROM pitches p
      LEFT JOIN pitch_reviews r ON p.id = r.pitch_id
      WHERE 1=1
    `;
    const params = [];

    if (!showAll) {
      query += ` AND p.status = 'active'`;
    }

    if (pitchType && pitchType !== 'all') {
      query += ` AND p.type LIKE ?`;
      params.push(`%${pitchType}%`);
    }

    query += `
      GROUP BY p.id
      ORDER BY p.id ASC
    `;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sân bóng: ' + error.message
    });
  }
}

// 2. Lấy chi tiết một sân bóng đầy đủ: Thông tin cơ bản, danh sách ảnh mô tả, danh sách review & điểm sao trung bình
async function getPitchById(req, res) {
  try {
    const pitchId = req.params.id;

    const [pitchRows] = await pool.query(
      'SELECT id, name, type, price_default, status, avatar_url FROM pitches WHERE id = ?',
      [pitchId]
    );

    if (pitchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sân bóng yêu cầu.'
      });
    }

    // 1. Danh sách ảnh mô tả (pitch images)
    const [imageRows] = await pool.query(
      'SELECT id, image_url, caption, created_at FROM pitch_images WHERE pitch_id = ? ORDER BY id DESC',
      [pitchId]
    );

    // 2. Danh sách đánh giá & góp ý (reviews)
    const [reviewRows] = await pool.query(
      `SELECT id, customer_name, customer_phone, rating, comment, 
              DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at_formatted,
              created_at
       FROM pitch_reviews 
       WHERE pitch_id = ? 
       ORDER BY id DESC`,
      [pitchId]
    );

    // 3. Tính điểm sao trung bình tự động
    const totalReviews = reviewRows.length;
    const avgRating = totalReviews > 0
      ? Number((reviewRows.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews).toFixed(1))
      : 5.0;

    const pitchData = {
      ...pitchRows[0],
      image: pitchRows[0].avatar_url,
      images: imageRows, // Danh sách ảnh mô tả kèm id, image_url, caption
      gallery_urls: imageRows.map(img => img.image_url),
      reviews: reviewRows, // Danh sách review
      rating_stats: {
        average_rating: avgRating,
        total_reviews: totalReviews
      }
    };

    return res.status(200).json({
      success: true,
      data: pitchData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết sân: ' + error.message
    });
  }
}

// 3. Lấy danh sách các khung giờ cố định trong ngày
async function getTimeSlots(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, start_time, end_time, price_multiplier FROM time_slots ORDER BY start_time ASC'
    );
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách khung giờ: ' + error.message
    });
  }
}

// 4. Admin tạo sân bóng mới (Hỗ trợ upload ảnh từ máy)
async function createPitch(req, res) {
  try {
    const { name, type, price_default } = req.body;

    if (!name || !type || !price_default) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên sân, Loại sân và Đơn giá.'
      });
    }

    // Chuyển đổi ảnh upload trực tiếp sang Base64 Data URI để mobile và web load tức thì
    let avatarUrl = req.body.avatar_url || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800';
    if (req.file) {
      try {
        const mimeType = req.file.mimetype || 'image/jpeg';
        const fileBuffer = fs.readFileSync(req.file.path);
        avatarUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (e) {
        avatarUrl = `http://localhost:5000/uploads/pitches/${req.file.filename}`;
      }
    }

    const [result] = await pool.query(
      'INSERT INTO pitches (name, type, price_default, status, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), type.trim(), Number(price_default), 'active', avatarUrl]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm sân bóng mới thành công.',
      data: {
        id: result.insertId,
        name,
        type,
        price_default: Number(price_default),
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sân bóng: ' + error.message
    });
  }
}

// 5. Admin xóa sân bóng
async function deletePitch(req, res) {
  try {
    const pitchId = req.params.id;

    const [existing] = await pool.query('SELECT id, name FROM pitches WHERE id = ?', [pitchId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sân bóng không tồn tại.'
      });
    }

    await pool.query('DELETE FROM pitches WHERE id = ?', [pitchId]);

    return res.status(200).json({
      success: true,
      message: `Đã xóa sân "${existing[0].name}" thành công!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sân: ' + error.message
    });
  }
}

// 6. Admin cập nhật trạng thái Bảo trì / Hoạt động
async function updatePitchStatus(req, res) {
  try {
    const pitchId = req.params.id;
    const { status } = req.body;

    if (!['active', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái chỉ có thể là active hoặc maintenance.'
      });
    }

    await pool.query('UPDATE pitches SET status = ? WHERE id = ?', [status, pitchId]);

    return res.status(200).json({
      success: true,
      message: `Đã chuyển trạng thái sân sang: ${status === 'maintenance' ? 'Đang bảo trì' : 'Đang hoạt động'}.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái sân: ' + error.message
    });
  }
}

// 7. Lấy danh sách quy định 4 ca và hệ số giá (Bao gồm ngày thường và cuối tuần T7/CN)
async function getTimeRules(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, shift_name, start_time, end_time, price_multiplier, weekend_multiplier, note FROM time_slot_rules ORDER BY start_time ASC'
    );
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách cấu hình ca giờ: ' + error.message
    });
  }
}

// 8. Admin cập nhật hệ số giá cho ca (Hệ số ngày thường & cuối tuần Thứ 7, Chủ Nhật)
async function updateTimeRule(req, res) {
  try {
    const ruleId = req.params.id;
    const { price_multiplier, weekend_multiplier, note } = req.body;

    if (price_multiplier === undefined || price_multiplier === null || Number(price_multiplier) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Hệ số giá ngày thường phải là một số lớn hơn 0.'
      });
    }

    if (weekend_multiplier !== undefined && (weekend_multiplier === null || Number(weekend_multiplier) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Hệ số giá cuối tuần (Thứ 7 & CN) phải là một số lớn hơn 0.'
      });
    }

    const wkMultiplier = weekend_multiplier ? Number(weekend_multiplier) : Number(price_multiplier);

    await pool.query(
      'UPDATE time_slot_rules SET price_multiplier = ?, weekend_multiplier = ?, note = ? WHERE id = ?',
      [Number(price_multiplier), wkMultiplier, note || null, ruleId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hệ số khung giờ thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật hệ số khung giờ: ' + error.message
    });
  }
}

// 8. Admin cập nhật thông tin sân bóng (Tên, Loại, Đơn giá, Ảnh nếu có)
async function updatePitch(req, res) {
  try {
    const pitchId = req.params.id;
    const { name, type, price_default } = req.body;

    if (!name || !type || !price_default) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên sân, Loại sân và Đơn giá.'
      });
    }

    const [existing] = await pool.query('SELECT * FROM pitches WHERE id = ?', [pitchId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sân bóng không tồn tại.'
      });
    }

    let avatarUrl = existing[0].avatar_url;
    if (req.file) {
      try {
        const mimeType = req.file.mimetype || 'image/jpeg';
        const fileBuffer = fs.readFileSync(req.file.path);
        avatarUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (e) {
        avatarUrl = `http://localhost:5000/uploads/pitches/${req.file.filename}`;
      }
    } else if (req.body.avatar_url) {
      avatarUrl = req.body.avatar_url;
    }

    await pool.query(
      'UPDATE pitches SET name = ?, type = ?, price_default = ?, avatar_url = ? WHERE id = ?',
      [name.trim(), type.trim(), Number(price_default), avatarUrl, pitchId]
    );

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật sân "${name}" thành công!`,
      data: {
        id: Number(pitchId),
        name: name.trim(),
        type: type.trim(),
        price_default: Number(price_default),
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sân: ' + error.message
    });
  }
}

// 9. Thêm ảnh mô tả cho sân bóng (Upload file hoặc gửi URL)
async function addPitchImage(req, res) {
  try {
    const pitchId = req.params.id;
    const { caption } = req.body;

    const [existing] = await pool.query('SELECT id, name FROM pitches WHERE id = ?', [pitchId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Sân bóng không tồn tại.' });
    }

    let imageUrl = req.body.image_url;
    if (req.file) {
      try {
        const mimeType = req.file.mimetype || 'image/jpeg';
        const fileBuffer = fs.readFileSync(req.file.path);
        imageUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (e) {
        imageUrl = `http://localhost:5000/uploads/pitches/${req.file.filename}`;
      }
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file ảnh hoặc nhập đường dẫn ảnh.' });
    }

    const [result] = await pool.query(
      'INSERT INTO pitch_images (pitch_id, image_url, caption) VALUES (?, ?, ?)',
      [pitchId, imageUrl, caption || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Đã thêm ảnh mô tả thành công!',
      data: {
        id: result.insertId,
        pitch_id: Number(pitchId),
        image_url: imageUrl,
        caption: caption || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm ảnh mô tả: ' + error.message
    });
  }
}

// 10. Xóa ảnh mô tả của sân
async function deletePitchImage(req, res) {
  try {
    const { id, imageId } = req.params;

    const [existing] = await pool.query('SELECT id FROM pitch_images WHERE id = ? AND pitch_id = ?', [imageId, id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Ảnh mô tả không tồn tại.' });
    }

    await pool.query('DELETE FROM pitch_images WHERE id = ?', [imageId]);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa ảnh mô tả thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa ảnh: ' + error.message
    });
  }
}

// 11. Thêm đánh giá & góp ý cho sân bóng
async function addPitchReview(req, res) {
  try {
    const pitchId = req.params.id;
    let { customer_name, customer_phone, rating, comment } = req.body;

    // Nếu không truyền customer_name từ body, thử lấy từ JWT Bearer token nếu có
    if ((!customer_name || customer_name.trim() === '') && req.headers['authorization']) {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'do_an_tot_nghiep_san_bong_secret_key_2026'
          );
          if (decoded && decoded.role === 'customer') {
            const [cust] = await pool.query('SELECT full_name, phone FROM customers WHERE id = ?', [decoded.id]);
            if (cust.length > 0) {
              customer_name = cust[0].full_name || cust[0].phone;
              customer_phone = customer_phone || cust[0].phone;
            }
          } else if (decoded && decoded.username) {
            customer_name = decoded.username;
          }
        }
      } catch (err) {
        // Token không giải mã được hoặc hết hạn, bỏ qua
      }
    }

    if (!customer_name || customer_name.trim() === '') {
      customer_name = 'Khách hàng';
    }

    const star = Math.min(5, Math.max(1, Number(rating) || 5));

    const [existing] = await pool.query('SELECT id FROM pitches WHERE id = ?', [pitchId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Sân bóng không tồn tại.' });
    }


    const [result] = await pool.query(
      'INSERT INTO pitch_reviews (pitch_id, customer_name, customer_phone, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [pitchId, customer_name.trim(), customer_phone ? customer_phone.trim() : null, star, comment ? comment.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá & góp ý!',
      data: {
        id: result.insertId,
        pitch_id: Number(pitchId),
        customer_name: customer_name.trim(),
        rating: star,
        comment: comment || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm đánh giá: ' + error.message
    });
  }
}

// 12. Lấy toàn bộ đánh giá của tất cả các sân (Dành cho Admin quản lý)
async function getAllPitchReviews(req, res) {
  try {
    const { pitch_id } = req.query;
    let query = `
      SELECT r.id, r.pitch_id, r.customer_name, r.customer_phone, r.rating, r.comment,
             DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS created_at_formatted,
             r.created_at, p.name AS pitch_name
      FROM pitch_reviews r
      JOIN pitches p ON r.pitch_id = p.id
    `;
    const params = [];

    if (pitch_id) {
      query += ' WHERE r.pitch_id = ?';
      params.push(pitch_id);
    }

    query += ' ORDER BY r.id DESC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá: ' + error.message
    });
  }
}

// 13. Xóa đánh giá & góp ý (Dành cho Admin)
async function deletePitchReview(req, res) {
  try {
    const reviewId = req.params.reviewId;

    const [existing] = await pool.query('SELECT id FROM pitch_reviews WHERE id = ?', [reviewId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Đánh giá không tồn tại.' });
    }

    await pool.query('DELETE FROM pitch_reviews WHERE id = ?', [reviewId]);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa đánh giá thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá: ' + error.message
    });
  }
}

module.exports = {
  getAllPitches,
  getPitchById,
  getTimeSlots,
  createPitch,
  updatePitch,
  deletePitch,
  updatePitchStatus,
  getTimeRules,
  updateTimeRule,
  addPitchImage,
  deletePitchImage,
  addPitchReview,
  getAllPitchReviews,
  deletePitchReview
};