import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function CustomerHistoryPage() {
  const navigate = useNavigate();
  const { confirm, showAlert } = useConfirm();
  const customerInfo = JSON.parse(localStorage.getItem('customer_info') || 'null');
  const token = localStorage.getItem('customer_token');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, pending, confirmed, checked_in, completed, cancelled
  const [actionLoading, setActionLoading] = useState(false);

  // Modal xem chi tiết đơn đặt (GET /api/bookings/:id)
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    loading: false,
    data: null
  });

  useEffect(() => {
    if (!token) {
      showAlert({
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập tài khoản Khách hàng để xem lịch sử đặt sân của bạn!',
        type: 'warning'
      }).then(() => navigate('/customer/auth'));
      return;
    }
    fetchMyBookings();
  }, [token]);

  // 1. Lấy danh sách toàn bộ đơn đặt sân của khách (GET /api/bookings/my)
  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/bookings/my');
      if (res.data.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử đặt sân:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        showAlert({
          title: 'Hết phiên đăng nhập',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!',
          type: 'warning'
        }).then(() => navigate('/customer/auth'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Lấy chi tiết đơn đặt sân (GET /api/bookings/:id)
  const handleViewDetail = async (bookingId) => {
    try {
      setDetailModal({ isOpen: true, loading: true, data: null });
      const res = await axiosClient.get(`/bookings/${bookingId}`);
      if (res.data.success) {
        setDetailModal({
          isOpen: true,
          loading: false,
          data: res.data.data
        });
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi tải chi tiết',
        message: err.response?.data?.message || err.message,
        type: 'danger'
      });
      setDetailModal({ isOpen: false, loading: false, data: null });
    }
  };

  // 3. Khách hàng hủy đơn (PATCH /api/bookings/:id/cancel)
  const handleCancelBooking = async (bookingId) => {
    const isConfirm = await confirm({
      title: 'Hủy đơn đặt sân',
      message: `Bạn có chắc chắn muốn hủy đơn đặt sân #${bookingId} này không?\nLưu ý: Hành động này không thể hoàn tác!`,
      type: 'danger',
      confirmText: 'Xác nhận hủy đơn',
      cancelText: 'Giữ lại đơn',
    });
    if (!isConfirm) return;

    try {
      setActionLoading(true);
      const res = await axiosClient.patch(`/bookings/${bookingId}/cancel`);
      if (res.data.success) {
        await showAlert({
          title: 'Đã hủy đơn thành công',
          message: res.data.message || `Đơn đặt sân #${bookingId} đã được hủy.`,
          type: 'success',
        });
        // Nếu đang mở modal thì đóng lại
        setDetailModal({ isOpen: false, loading: false, data: null });
        // Làm mới danh sách đơn
        fetchMyBookings();
      }
    } catch (err) {
      await showAlert({
        title: 'Không thể hủy đơn',
        message: err.response?.data?.message || 'Không thể hủy đơn này. Vui lòng thử lại hoặc liên hệ sân.',
        type: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Lọc danh sách theo trạng thái
  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'all') return true;
    return b.status === activeFilter;
  });

  // Helper render badge trạng thái đơn
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span style={{
            background: '#fffbeb',
            color: '#b45309',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            border: '1px solid #fde68a'
          }}>
            ⏳ Chờ Duyệt
          </span>
        );
      case 'confirmed':
        return (
          <span style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            border: '1px solid #bfdbfe'
          }}>
            ✅ Đã Xác Nhận
          </span>
        );
      case 'checked_in':
        return (
          <span style={{
            background: '#f5f3ff',
            color: '#6d28d9',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            border: '1px solid #ddd6fe'
          }}>
            🏃 Đang Đá (Checked-in)
          </span>
        );
      case 'completed':
        return (
          <span style={{
            background: '#ecfdf5',
            color: '#047857',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            border: '1px solid #a7f3d0'
          }}>
            🏆 Hoàn Thành
          </span>
        );
      case 'cancelled':
        return (
          <span style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '700',
            border: '1px solid #fecaca'
          }}>
            ✕ Đã Hủy
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Helper render badge thanh toán
  const renderPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return <span style={{ color: '#059669', fontWeight: 'bold' }}>Đã thanh toán 100%</span>;
      case 'deposited':
        return <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Đã đặt cọc</span>;
      case 'unpaid':
      default:
        return <span style={{ color: '#d97706', fontWeight: 'bold' }}>Chưa thanh toán</span>;
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {/* TIÊU ĐỀ & NÚT ĐẶT SÂN NHANH */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <h1 style={{ fontSize: '26px', color: '#064e3b', fontWeight: '800', margin: 0 }}>
              📋 Lịch Sử Đặt Sân Của Tôi
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
              Khách hàng: <b>{customerInfo?.full_name || 'Quý khách'}</b> ({customerInfo?.phone})
            </p>
          </div>

          <button
            onClick={() => navigate('/booking')}
            className="btn-action-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            ⚽ Đặt Sân Mới Ngay
          </button>
        </div>

        {/* THỐNG KÊ NHANH */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>📋</div>
            <div>
              <div className="stat-label">Tổng lượt đặt</div>
              <div className="stat-num">{bookings.length}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>⏳</div>
            <div>
              <div className="stat-label">Chờ duyệt</div>
              <div className="stat-num">{bookings.filter(b => b.status === 'pending').length}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>✅</div>
            <div>
              <div className="stat-label">Đã xác nhận</div>
              <div className="stat-num">{bookings.filter(b => b.status === 'confirmed').length}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>🏃</div>
            <div>
              <div className="stat-label">Đang đá / Đã đá</div>
              <div className="stat-num">{bookings.filter(b => ['checked_in', 'completed'].includes(b.status)).length}</div>
            </div>
          </div>
        </div>

        {/* BỘ LỌC THEO TRẠNG THÁI */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px'
        }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'confirmed', label: 'Đã xác nhận' },
            { id: 'checked_in', label: 'Đang đá' },
            { id: 'completed', label: 'Hoàn thành' },
            { id: 'cancelled', label: 'Đã hủy' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: activeFilter === tab.id ? '2px solid #059669' : '1px solid #cbd5e1',
                background: activeFilter === tab.id ? '#ecfdf5' : '#ffffff',
                color: activeFilter === tab.id ? '#064e3b' : '#64748b',
                fontWeight: activeFilter === tab.id ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DANH SÁCH ĐƠN ĐẶT */}
        {loading ? (
          <div className="panel-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b' }}>Đang tải lịch sử đặt sân của bạn...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="panel-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>⚽</div>
            <h3 style={{ color: '#064e3b', marginBottom: '8px' }}>Chưa có đơn đặt sân nào</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              {activeFilter === 'all'
                ? 'Bạn chưa từng đặt sân bóng tại hệ thống. Hãy chọn khung giờ và đặt ngay!'
                : `Không có đơn nào ở trạng thái "${activeFilter}".`}
            </p>
            <button onClick={() => navigate('/booking')} className="btn-action-primary">
              Đi đến trang đặt sân
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredBookings.map(b => {
              const canCancel = ['pending', 'confirmed'].includes(b.status);
              return (
                <div
                  key={b.id}
                  className="panel-card"
                  style={{
                    margin: 0,
                    padding: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    borderLeft: `5px solid ${
                      b.status === 'confirmed' ? '#2563eb' :
                      b.status === 'pending' ? '#f59e0b' :
                      b.status === 'checked_in' ? '#7c3aed' :
                      b.status === 'completed' ? '#059669' : '#ef4444'
                    }`
                  }}
                >
                  {/* THÔNG TIN CHÍNH */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: '1 1 340px' }}>
                    {b.pitch_avatar && (
                      <img
                        src={b.pitch_avatar}
                        alt={b.pitch_name}
                        style={{
                          width: '90px',
                          height: '90px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0'
                        }}
                      />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#064e3b' }}>
                          Mã đơn: #{b.id}
                        </span>
                        {renderStatusBadge(b.status)}
                      </div>

                      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>
                        {b.pitch_name} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>({b.pitch_type})</span>
                      </h3>

                      <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <span>📅 Ngày: <b>{b.booking_date}</b></span>
                        <span>⏰ Giờ: <b>{b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* THÔNG TIN TIỀN & THANH TOÁN */}
                  <div style={{ textAlign: 'right', minWidth: '180px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Tiền sân tạm tính:</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669', margin: '2px 0 4px 0' }}>
                      {Number(b.total_price).toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      {renderPaymentBadge(b.payment_status)}
                    </div>
                  </div>

                  {/* CÁC NÚT THAO TÁC */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleViewDetail(b.id)}
                      className="btn-info"
                      style={{ fontSize: '13px', padding: '8px 14px', borderRadius: '8px' }}
                    >
                      👁️ Xem Chi Tiết
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="btn-danger"
                        disabled={actionLoading}
                        style={{ fontSize: '13px', padding: '8px 14px', borderRadius: '8px' }}
                      >
                        ✕ Hủy Đơn
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL CHI TIẾT ĐƠN ĐẶT SÂN (GET /api/bookings/:id) */}
      {detailModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#064e3b' }}>
                Chi Tiết Đơn Đặt Sân #{detailModal.data?.id}
              </h3>
              <button
                className="btn-close"
                onClick={() => setDetailModal({ isOpen: false, loading: false, data: null })}
              >
                &times;
              </button>
            </div>

            {detailModal.loading || !detailModal.data ? (
              <p style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Đang tải dữ liệu chi tiết...
              </p>
            ) : (
              <div>
                {/* KHỐI TRẠNG THÁI & MÃ QR CHECK-IN */}
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '18px'
                }}>
                  <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.8' }}>
                    <div>Trạng thái đơn: {renderStatusBadge(detailModal.data.status)}</div>
                    <div>Thanh toán: {renderPaymentBadge(detailModal.data.payment_status)}</div>
                    <div>Thời điểm tạo: <b>{new Date(detailModal.data.created_at).toLocaleString('vi-VN')}</b></div>
                  </div>

                  {/* MÃ QR CODE CHO KHÁCH HÀNG CHECK-IN */}
                  {['confirmed', 'checked_in'].includes(detailModal.data.status) && (
                    <div style={{
                      textAlign: 'center',
                      background: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1'
                    }}>
                      <QRCodeSVG value={`BOOKING_${detailModal.data.id}`} size={90} />
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#064e3b', marginTop: '4px' }}>
                        MÃ CHECK-IN
                      </div>
                    </div>
                  )}
                </div>

                {['confirmed'].includes(detailModal.data.status) && (
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '16px'
                  }}>
                    💡 <b>Mẹo:</b> Khi đến sân, quý khách chỉ cần đưa mã QR trên cho nhân viên trực ban để được quét check-in vào sân ngay!
                  </div>
                )}

                {/* THÔNG TIN SÂN & THỜI GIAN */}
                <div style={{ fontSize: '13px', lineHeight: '1.9', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#064e3b', marginBottom: '4px' }}>
                    ⚽ {detailModal.data.pitch_name} ({detailModal.data.pitch_type})
                  </div>
                  <div>📅 Ngày thi đấu: <b>{detailModal.data.booking_date}</b></div>
                  <div>⏰ Khung giờ: <b>{detailModal.data.start_time?.slice(0, 5)} &rarr; {detailModal.data.end_time?.slice(0, 5)}</b></div>
                  <div>👤 Người nhận sân: <b>{detailModal.data.customer_name}</b> ({detailModal.data.customer_phone})</div>
                  {detailModal.data.note && (
                    <div>📝 Ghi chú: <i>{detailModal.data.note}</i></div>
                  )}
                  <div>💰 Tiền sân: <b style={{ color: '#059669' }}>{Number(detailModal.data.total_price).toLocaleString('vi-VN')} đ</b></div>
                </div>

                {/* DANH SÁCH TIỆN ÍCH / NƯỚC UỐNG ĐÃ SỬ DỤNG */}
                {detailModal.data.services && detailModal.data.services.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                      🥤 Nước uống & Dịch vụ đi kèm tại sân:
                    </div>
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      padding: '10px'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                            <th style={{ textAlign: 'left', padding: '4px 0' }}>Tên món</th>
                            <th style={{ textAlign: 'center' }}>SL</th>
                            <th style={{ textAlign: 'right' }}>Đơn giá</th>
                            <th style={{ textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailModal.data.services.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                              <td style={{ padding: '6px 0' }}><b>{item.service_name}</b></td>
                              <td style={{ textAlign: 'center' }}>x{item.quantity} {item.unit}</td>
                              <td style={{ textAlign: 'right' }}>{Number(item.unit_price).toLocaleString('vi-VN')} đ</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.total_item_price).toLocaleString('vi-VN')} đ</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>
                        Cộng tiền dịch vụ: {Number(detailModal.data.total_service_amount).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                )}

                {/* TỔNG TIỀN THANH TOÁN TOÀN BỘ */}
                <div style={{
                  background: '#ecfdf5',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #10b981',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#064e3b' }}>
                    TỔNG THANH TOÁN (Sân + Dịch vụ):
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>
                    {Number(detailModal.data.final_total_amount || detailModal.data.total_price).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* NÚT THAO TÁC */}
                <div className="modal-actions">
                  {['pending', 'confirmed'].includes(detailModal.data.status) && (
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={actionLoading}
                      onClick={() => handleCancelBooking(detailModal.data.id)}
                    >
                      ✕ Hủy Đơn Đặt Sân Này
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDetailModal({ isOpen: false, loading: false, data: null })}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerHistoryPage;

