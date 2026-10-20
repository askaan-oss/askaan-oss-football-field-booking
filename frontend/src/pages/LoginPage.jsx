import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginNavbar from '../components/LoginNavbar';
import axiosClient from '../api/axiosClient';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axiosClient.post('/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.data.success) {
        // Lưu thông tin phiên đăng nhập nội bộ
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));

        // Phân luồng điều hướng theo đúng Role
        if (res.data.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/staff');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)'
    }}>
      {/* THANH ĐIỀU HƯỚNG TRANG LOGIN */}
      <LoginNavbar />

      {/* FORM ĐĂNG NHẬP NỘI BỘ */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '100px 20px 40px 20px' // Đẩy xuống để không bị Navbar fixed che mất
      }}>
        <div style={{
          background: '#ffffff',
          padding: '36px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: '#ecfdf5',
              color: '#059669',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              margin: '0 auto 12px auto'
            }}>
              🔐
            </div>
            <h2 style={{ color: '#064e3b', fontSize: '22px', fontWeight: '800' }}>
              Quản Trị Hệ Thống
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Dành cho Chủ sân (Admin) và Nhân viên trực ca (Staff)
            </p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Tên đăng nhập:</label>
              <input
                type="text"
                required
                placeholder="admin hoặc staff1..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Mật khẩu:</label>
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
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              disabled={loading}
            >
              {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}
            </button>
          </form>

          {/* GỢI Ý TÀI KHOẢN MẪU DEMO */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: '1.6'
          }}>
            <div>👑 <b>Admin:</b> tài khoản <code>admin</code> / pass <code>123456</code></div>
            <div>🧑‍💼 <b>Staff:</b> tài khoản <code>staff1</code> / pass <code>123456</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;