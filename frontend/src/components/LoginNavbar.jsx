import React from 'react';
import { useNavigate } from 'react-router-dom';

function LoginNavbar() {
  const navigate = useNavigate();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 32px',
      background: 'rgba(6, 78, 59, 0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100
    }}>
      {/* LOGO & TIÊU ĐỀ HỆ THỐNG */}
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          fontWeight: '800',
          fontSize: '18px'
        }}
      >
        <span>⚽ Sân Bóng Mini 2026</span>
        <span style={{
          fontSize: '11px',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '2px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Nội Bộ
        </span>
      </div>

      {/* CÁC NÚT ĐIỀU HƯỚNG */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          &larr; Về Trang Chủ
        </button>

        <button
          type="button"
          onClick={() => navigate('/customer/auth')}
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          👤 Cổng Khách Hàng
        </button>
      </div>
    </nav>
  );
}

export default LoginNavbar;