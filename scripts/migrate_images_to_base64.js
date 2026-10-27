const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/db');

async function migrateImagesToBase64() {
  console.log('=== BẮT ĐẦU MIGRATION ẢNH SANG BASE64 ===');

  try {
    // Giai đoạn 1: Nâng cấp Schema CSDL sang LONGTEXT
    console.log('\n[1/3] Đang cập nhật kiểu cột dữ liệu sang LONGTEXT...');
    await pool.query('ALTER TABLE pitches MODIFY COLUMN avatar_url LONGTEXT');
    console.log('✓ pitches.avatar_url -> LONGTEXT');

    await pool.query('ALTER TABLE pitch_images MODIFY COLUMN image_url LONGTEXT');
    console.log('✓ pitch_images.image_url -> LONGTEXT');

    await pool.query('ALTER TABLE customers MODIFY COLUMN avatar_url LONGTEXT');
    console.log('✓ customers.avatar_url -> LONGTEXT');

    // Hàm chuyển file sang Data URI Base64
    function fileToDataUri(filePath) {
      if (!fs.existsSync(filePath)) {
        console.warn('  [!] File không tồn tại:', filePath);
        return null;
      }
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';

      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString('base64');
      return `data:${mimeType};base64,${base64}`;
    }

    const uploadsDir = path.join(__dirname, '../backend/uploads/pitches');

    // Giai đoạn 2: Migrate bảng pitches
    console.log('\n[2/3] Đang chuyển đổi ảnh đại diện trong bảng pitches...');
    const [pitches] = await pool.query('SELECT id, name, avatar_url FROM pitches');
    for (const p of pitches) {
      if (!p.avatar_url) continue;

      if (p.avatar_url.startsWith('data:image')) {
        console.log(`  Sân #${p.id} (${p.name}): Đã là Base64, bỏ qua.`);
        continue;
      }

      // Lấy filename từ URL hoặc path
      const filename = path.basename(p.avatar_url);
      const localFilePath = path.join(uploadsDir, filename);

      const base64Uri = fileToDataUri(localFilePath);
      if (base64Uri) {
        await pool.query('UPDATE pitches SET avatar_url = ? WHERE id = ?', [base64Uri, p.id]);
        console.log(`  ✓ Sân #${p.id} (${p.name}): Đã chuyển đổi sang Base64 (${Math.round(base64Uri.length / 1024)} KB)`);
      } else {
        console.warn(`  ✗ Sân #${p.id} (${p.name}): Không tìm thấy file gốc ${filename}`);
      }
    }

    // Giai đoạn 3: Migrate bảng pitch_images
    console.log('\n[3/3] Đang chuyển đổi ảnh phụ trong bảng pitch_images...');
    const [pitchImages] = await pool.query('SELECT id, pitch_id, image_url FROM pitch_images');
    for (const img of pitchImages) {
      if (!img.image_url) continue;

      if (img.image_url.startsWith('data:image')) {
        console.log(`  Ảnh phụ #${img.id} (Sân #${img.pitch_id}): Đã là Base64, bỏ qua.`);
        continue;
      }

      const filename = path.basename(img.image_url);
      const localFilePath = path.join(uploadsDir, filename);

      const base64Uri = fileToDataUri(localFilePath);
      if (base64Uri) {
        await pool.query('UPDATE pitch_images SET image_url = ? WHERE id = ?', [base64Uri, img.id]);
        console.log(`  ✓ Ảnh phụ #${img.id} (Sân #${img.pitch_id}): Đã chuyển đổi sang Base64 (${Math.round(base64Uri.length / 1024)} KB)`);
      } else {
        console.warn(`  ✗ Ảnh phụ #${img.id}: Không tìm thấy file gốc ${filename}`);
      }
    }

    console.log('\n=== HOÀN TẤT MIGRATION ẢNH SANG BASE64 THÀNH CÔNG 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('\n[LỖI MIGRATION]:', err);
    process.exit(1);
  }
}

migrateImagesToBase64();

