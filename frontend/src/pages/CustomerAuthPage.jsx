import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function CustomerAuthPage() {
  const navigate = useNavigate();
  const { showAlert } = useConfirm();
  const [isRegister, setIsRegister] = useState(false); // false: Đăng nhập, true: Đăng ký
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Luồng Đăng ký tài khoản Khách hàng
        const res = await axiosClient.post('/auth/customer/register', {
          phone,
          password,
          full_name: fullName
        });

        if (res.data.success) {
          localStorage.setItem('customer_token', res.data.data.token);
          localStorage.setItem('customer_info', JSON.stringify(res.data.data.customer));
          await showAlert({
            title: 'Thành công',
            message: 'Đăng ký tài khoản thành công! Hệ thống sẽ đưa bạn về trang chủ.',
            type: 'success'
          });
          navigate('/');
        }
      } else {
        // Luồng Đăng nhập Khách hàng
        const res = await axiosClient.post('/auth/customer/login', {
          phone,
          password
        });

        if (res.data.success) {
          localStorage.setItem('customer_token', res.data.data.token);
          localStorage.setItem('customer_info', JSON.stringify(res.data.data.customer));
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 20px',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '420px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
        }}>
          <h2 style={{ textAlign: 'center', color: '#064e3b', marginBottom: '8px' }}>
            {isRegister ? '👤 Đăng Ký Khách Hàng' : '⚽ Đăng Nhập Khách Hàng'}
          </h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            {isRegister
              ? 'Tạo tài khoản để đặt sân và nhận ưu đãi'
              : 'Đăng nhập để xem lịch sử đặt sân của bạn'}
          </p>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label>Họ và tên của bạn:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Số điện thoại (Tên đăng nhập):</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: 0987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu:</label>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-action-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : isRegister ? 'Tạo Tài Khoản Ngay' : 'Đăng Nhập'}
            </button>
          </form>

          {/* CHUYỂN ĐỔI GIỮA ĐĂNG KÝ VÀ ĐĂNG NHẬP */}
          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: '#64748b' }}>
            {isRegister ? (
              <span>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); }}
                  style={{ background: 'none', color: '#059669', fontWeight: 'bold', textDecoration: 'underline' }}
                >
                  Đăng nhập tại đây
                </button>
              </span>
            ) : (
              <span>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); }}
                  style={{ background: 'none', color: '#059669', fontWeight: 'bold', textDecoration: 'underline' }}
                >
                  Đăng ký miễn phí
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerAuthPage;