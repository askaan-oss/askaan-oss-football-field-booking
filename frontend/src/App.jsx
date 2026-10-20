import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CustomerAuthPage from './pages/CustomerAuthPage';
import CustomerBookingPage from './pages/CustomerBookingPage';
import CustomerHistoryPage from './pages/CustomerHistoryPage';
import LoginPage from './pages/LoginPage';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { ConfirmProvider } from './context/ConfirmContext';
import './App.css';

// Guard bảo vệ tuyến đường Quản trị (Admin / Staff)
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/staff" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <Routes>
          {/* Tuyến đường công khai & đặt sân cho Khách hàng */}
          <Route path="/" element={<HomePage />} />
          <Route path="/customer/auth" element={<CustomerAuthPage />} />
          <Route path="/booking" element={<CustomerBookingPage />} />
          <Route path="/my-bookings" element={<CustomerHistoryPage />} />
          <Route path="/customer/history" element={<CustomerHistoryPage />} />

          {/* Đăng nhập nội bộ (Admin / Staff) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Tuyến đường Quản trị nội bộ */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Chuyển hướng mặc định */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;