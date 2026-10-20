import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PitchDetailModal from '../components/PitchDetailModal';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function HomePage() {
  const navigate = useNavigate();
  const { showAlert } = useConfirm();

  // Dữ liệu sân và dịch vụ
  const [pitches, setPitches] = useState([]);
  const [selectedPitchDetailId, setSelectedPitchDetailId] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái đăng nhập của khách hàng
  const [customer, setCustomer] = useState(null);

  // Trạng thái form xác thực tại trang chủ
  const [authMode, setAuthMode] = useState('login'); // 'login' hoặc 'register'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Kiểm tra session hiện tại
    const savedCustomer = localStorage.getItem('customer_info');
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch (err) {
        setCustomer(null);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPitches, resServices] = await Promise.all([
        axiosClient.get('/pitches'),
        axiosClient.get('/services')
      ]);

      if (resPitches.data.success) setPitches(resPitches.data.data);
      if (resServices.data.success) setServices(resServices.data.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu trang chủ:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi form Đăng nhập / Đăng ký trực tiếp trên Trang Chủ
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await axiosClient.post('/auth/customer/login', {
          phone: phone.trim(),
          password: password.trim()
        });

        if (res.data.success) {
          localStorage.setItem('customer_token', res.data.data.token);
          localStorage.setItem('customer_info', JSON.stringify(res.data.data.customer));
          setCustomer(res.data.data.customer);
          setPhone('');
          setPassword('');
          await showAlert({ title: 'Thành công', message: 'Đăng nhập thành công! Chào mừng bạn quay trở lại.', type: 'success' });
        }
      } else {
        const res = await axiosClient.post('/auth/customer/register', {
          phone: phone.trim(),
          password: password.trim(),
          full_name: fullName.trim()
        });

        if (res.data.success) {
          localStorage.setItem('customer_token', res.data.data.token);
          localStorage.setItem('customer_info', JSON.stringify(res.data.data.customer));
          setCustomer(res.data.data.customer);
          setPhone('');
          setPassword('');
          setFullName('');
          await showAlert({ title: 'Thành công', message: 'Đăng ký tài khoản thành công! Bạn có thể đặt sân ngay.', type: 'success' });
        }
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    setCustomer(null);
  };

  const handleBookingRedirect = async (pitchId = null) => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      await showAlert({
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập hoặc tạo tài khoản ở khung bên cạnh trước khi đặt sân!',
        type: 'warning'
      });
      // Cuộn lên đầu trang tới khung đăng nhập
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (pitchId) {
      navigate(`/booking?pitchId=${pitchId}`);
    } else {
      navigate('/booking');
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      {/* HERO BANNER KÈM KHUNG ĐĂNG KÝ / ĐĂNG NHẬP TRỰC TIẾP */}
      <section style={{
        background: 'linear-gradient(rgba(6, 78, 59, 0.92), rgba(6, 78, 59, 0.96)), url("https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1600") center/cover no-repeat',
        color: '#ffffff',
        padding: '50px 20px',
        borderBottom: '1px solid #047857'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '40px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          
          {/* CỘT TRÁI: GIỚI THIỆU SÂN BÓNG */}
          <div style={{ flex: '1 1 500px' }}>
            <span style={{
              background: 'rgba(52, 211, 153, 0.2)',
              color: '#34d399',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              Hệ Thống Sân Bóng Tiêu Chuẩn 2026
            </span>
            <h1 style={{ fontSize: '38px', fontWeight: '900', margin: '18px 0 14px 0', lineHeight: '1.2' }}>
              Đặt Sân Bóng Nhanh Chóng & Chuyên Nghiệp
            </h1>
            <p style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.6' }}>
              Mặt cỏ nhân tạo êm chân, dàn đèn LED không lóa, có phục vụ đầy đủ nước uống và áo tập tại quầy. Đăng nhập ngay để giữ khung giờ vàng cho đội bóng của bạn!
            </p>

            <button
              onClick={() => handleBookingRedirect()}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '12px 28px',
                fontSize: '15px',
                borderRadius: '8px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              ⚽ Xem Lịch & Đặt Sân Ngay &rarr;
            </button>
          </div>

          {/* CỘT PHẢI: KHUNG ĐĂNG KÝ / ĐĂNG NHẬP HOẶC THẺ THÀNH VIÊN */}
          <div style={{
            flex: '0 1 420px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            color: '#1e293b',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            {customer ? (
              // NẾU ĐÃ ĐĂNG NHẬP: HIỂN THỊ THÔNG TIN KHÁCH
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  margin: '0 auto 14px auto'
                }}>
                  ⚽
                </div>
                <h3 style={{ color: '#064e3b', fontSize: '20px', marginBottom: '4px' }}>
                  Xin chào, {customer.full_name}!
                </h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                  Số điện thoại: <b>{customer.phone}</b>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => handleBookingRedirect()}
                    className="btn-action-primary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    ⚽ Vào Trang Chọn Ca Đặt Sân
                  </button>
                  <button
                    onClick={() => navigate('/my-bookings')}
                    className="btn-info"
                    style={{ width: '100%', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
                  >
                    📋 Xem Lịch Sử Đơn Đặt Của Tôi
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: '#f1f5f9',
                      color: '#ef4444',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}
                  >
                    Đăng Xuất Khỏi Tài Khoản
                  </button>
                </div>
              </div>
            ) : (
              // NẾU CHƯA ĐĂNG NHẬP: FORM ĐĂNG NHẬP / ĐĂNG KÝ
              <div>
                {/* TAB CHUYỂN ĐỔI GIỮA ĐĂNG NHẬP VÀ ĐĂNG KÝ */}
                <div style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '10px',
                  marginBottom: '20px'
                }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: authMode === 'login' ? '#ffffff' : 'transparent',
                      color: authMode === 'login' ? '#064e3b' : '#64748b',
                      fontWeight: authMode === 'login' ? 'bold' : 'normal',
                      boxShadow: authMode === 'login' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: authMode === 'register' ? '#ffffff' : 'transparent',
                      color: authMode === 'register' ? '#064e3b' : '#64748b',
                      fontWeight: authMode === 'register' ? 'bold' : 'normal',
                      boxShadow: authMode === 'register' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    Tạo Tài Khoản
                  </button>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '18px', color: '#064e3b', fontWeight: 'bold' }}>
                    {authMode === 'login' ? 'Đăng Nhập Khách Hàng' : 'Đăng Ký Thành Viên Mới'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {authMode === 'login' ? 'Nhập số điện thoại để giữ sân' : 'Đăng ký trong 10 giây để nhận ưu đãi'}
                  </p>
                </div>

                {authError && <div className="error-alert">{authError}</div>}

                <form onSubmit={handleAuthSubmit}>
                  {authMode === 'register' && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px' }}>Họ và tên của bạn:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Lê Văn Nam"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px' }}>Số điện thoại:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 0987654321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px' }}>Mật khẩu:</label>
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-action-primary"
                    style={{ width: '100%', padding: '10px' }}
                    disabled={authLoading}
                  >
                    {authLoading ? 'Đang kết nối...' : authMode === 'login' ? 'Đăng Nhập Ngay' : 'Xác Nhận Đăng Ký'}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* DANH SÁCH SÂN */}
      <main className="main-content">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '26px', color: '#064e3b', fontWeight: '800' }}>Danh Sách Sân Bóng</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Chọn sân phù hợp với số lượng cầu thủ của đội bạn</p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '30px' }}>Đang tải danh sách sân...</p>
        ) : (
          <div className="pitches-cards-grid">
            {pitches.map(p => (
              <div key={p.id} className="pitch-item-card">
                <img src={p.avatar_url} alt={p.name} className="pitch-item-img" />
                <div className="pitch-item-body">
                  <span className="pitch-badge-tag">{p.type}</span>
                  <h3 style={{ fontSize: '18px', margin: '4px 0 8px 0' }}>{p.name}</h3>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>
                    {Number(p.price_default).toLocaleString('vi-VN')} đ <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>/ ca đá</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#f59e0b', margin: '8px 0 14px 0', cursor: 'pointer' }} onClick={() => setSelectedPitchDetailId(p.id)}>
                    ⭐ {p.average_rating} ({p.total_reviews} đánh giá) • <span style={{ color: '#059669', textDecoration: 'underline' }}>Xem chi tiết</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPitchDetailId(p.id)}
                      style={{
                        flex: 1,
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '10px 8px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      🔍 Xem Ảnh Sân
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBookingRedirect(p.id)}
                      style={{
                        flex: 1,
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '10px 8px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚽ Đặt Sân
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QUẦY DỊCH VỤ / TIỆN ÍCH */}
        <section style={{ marginTop: '50px' }}>
          <div className="panel-card">
            <h3 className="panel-title" style={{ marginBottom: '6px' }}>🥤 Bảng Giá Quầy Nước & Dịch Vụ Tại Sân</h3>
            <p className="panel-subtitle" style={{ marginBottom: '16px' }}>Có thể gọi thêm tại quầy trực ban, tiền sẽ được cộng trực tiếp vào hóa đơn ca đá.</p>

            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tên Dịch Vụ</th>
                  <th>Phân Loại</th>
                  <th>Đơn Vị Tính</th>
                  <th>Đơn Giá</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b></td>
                    <td>{s.category === 'drink' ? 'Nước uống' : s.category === 'rental' ? 'Thuê đồ tập' : 'Đồ ăn nhẹ'}</td>
                    <td>{s.unit}</td>
                    <td><b style={{ color: '#059669' }}>{Number(s.price).toLocaleString('vi-VN')} đ</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: '#064e3b', color: '#cbd5e1', padding: '24px 20px', textAlign: 'center', fontSize: '13px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>⚽ CỤM SÂN BÓNG ĐÁ MINI TIÊU CHUẨN</p>
        <p>Đồ Án Tốt Nghiệp Chuyên Ngành Công Nghệ Thông Tin</p>
      </footer>

      {/* POPUP XEM CHI TIẾT SÂN, ẢNH GÓC SÂN & ĐÁNH GIÁ */}
      <PitchDetailModal
        pitchId={selectedPitchDetailId}
        isOpen={Boolean(selectedPitchDetailId)}
        onClose={() => setSelectedPitchDetailId(null)}
        onBookPitch={(id) => handleBookingRedirect(id)}
      />
    </div>
  );
}

export default HomePage;