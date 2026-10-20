import React from 'react';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const customer = JSON.parse(localStorage.getItem('customer_info') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        ⚽ Sân Bóng Mini 2026
      </div>

      <div className="navbar-actions">
        <button className="nav-link-btn" onClick={() => navigate('/')}>
          Trang Chủ
        </button>

        {/* Menu Dành Cho Quản Trị (Admin / Staff) */}
        {user && (
          <>
            {user.role === 'admin' && (
              <button className="nav-link-btn" onClick={() => navigate('/admin')}>
                ⚙️ Admin
              </button>
            )}
            <button className="nav-link-btn" onClick={() => navigate('/staff')}>
              📋 Lịch Trực Ban
            </button>

            <span className="user-tag">{user.role}</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{user.full_name}</span>

            <button className="btn-logout-custom" onClick={handleLogout}>
              Đăng Xuất
            </button>
          </>
        )}

        {/* Menu Dành Cho Khách Hàng */}
        {!user && customer && (
          <>
            <button className="nav-link-btn" onClick={() => navigate('/booking')}>
              ⚽ Đặt Sân
            </button>
            <button className="nav-link-btn" onClick={() => navigate('/my-bookings')}>
              📋 Đơn Của Tôi
            </button>
            <span className="user-tag" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Khách Hàng</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{customer.full_name}</span>
            <button className="btn-logout-custom" onClick={handleLogout}>
              Thoát
            </button>
          </>
        )}

        {/* Chưa Đăng Nhập Gì Cả */}
        {!user && !customer && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="nav-link-btn" onClick={() => navigate('/customer/auth')}>
              👤 Khách Hàng
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              🔐 Quản Trị
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;