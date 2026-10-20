import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WeekStrip from '../components/WeekStrip';
import PitchDetailModal from '../components/PitchDetailModal';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function CustomerBookingPage() {
  const navigate = useNavigate();
  const { confirm, showAlert } = useConfirm();
  const customerInfo = JSON.parse(localStorage.getItem('customer_info') || '{}');
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [matrixData, setMatrixData] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetailPitchId, setSelectedDetailPitchId] = useState(null);

  // Lấy tên Thứ trong tuần theo ngày YYYY-MM-DD
  const getDayOfWeekName = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const daysMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return daysMap[d.getDay()];
  };

  // Định dạng ngày hiển thị DD/MM/YYYY
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  // Lấy danh sách 7 ngày từ Thứ 2 đến Chủ Nhật của tuần chứa baseDateStr
  const getWeekDays = (baseDateStr) => {
    const curr = new Date(baseDateStr + 'T00:00:00');
    const day = curr.getDay(); // 0 là Chủ Nhật, 1 là Thứ Hai...
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const week = [];
    const dayShortLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const dayFullNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      week.push({
        dateStr,
        label: dayShortLabels[i],
        fullName: dayFullNames[i],
        dayNum: dd,
        monthNum: mm,
        displayDate: `${dd}/${mm}`,
        isWeekend: i >= 5, // Thứ 7 & Chủ Nhật
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    return week;
  };

  const handlePrevWeek = () => {
    const curr = new Date(selectedDate + 'T00:00:00');
    curr.setDate(curr.getDate() - 7);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    setSelectedDate(todayStr);
  };

  const handleNextWeek = () => {
    const curr = new Date(selectedDate + 'T00:00:00');
    curr.setDate(curr.getDate() + 7);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const weekDays = getWeekDays(selectedDate);

  // Modal chọn đặt sân linh hoạt
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    pitchId: null,
    pitchName: '',
    pitchPrice: 0,
    startTime: '18:00',
    duration: 60
  });

  const [form, setForm] = useState({
    customer_name: customerInfo.full_name || '',
    customer_phone: customerInfo.phone || '',
    note: ''
  });

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/bookings/check-availability?date=${selectedDate}`);
      if (res.data.success) {
        setMatrixData(res.data.data);
        setRules(res.data.rules || []);
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi tải lịch sân',
        message: err.response?.data?.message || err.message,
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startStr, durationMin) => {
    const [h, m] = startStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Number(durationMin);
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  // Tính sẵn giá tiền chuẩn theo từng block 30 phút (Hỗ trợ ca vắt ngang qua 2 khung giờ)
  const getEstimatedPrice = () => {
    if (!bookingModal.pitchPrice) return { total: 0, shiftName: '' };

    const [h, m] = bookingModal.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + Number(bookingModal.duration);
    const pricePer30Min = Number(bookingModal.pitchPrice) / 2;

    // Kiểm tra xem ngày được chọn có phải Thứ 7 hoặc Chủ Nhật không
    let isWeekend = false;
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const day = dt.getDay();
      isWeekend = (day === 0 || day === 6);
    }

    let total = 0;
    const shiftsUsed = new Set();
    const multipliersUsed = [];

    let cur = startMin;
    while (cur < endMin) {
      const curH = String(Math.floor(cur / 60)).padStart(2, '0');
      const curM = String(cur % 60).padStart(2, '0');
      const timeStr = `${curH}:${curM}:00`;

      const matchedRule = rules.find(r => timeStr >= r.start_time && timeStr < r.end_time);
      let multiplier = 1.0;
      if (matchedRule) {
        multiplier = isWeekend && matchedRule.weekend_multiplier !== undefined && matchedRule.weekend_multiplier !== null
          ? Number(matchedRule.weekend_multiplier)
          : Number(matchedRule.price_multiplier);
        shiftsUsed.add(matchedRule.shift_name);
      }
      multipliersUsed.push(multiplier);

      total += pricePer30Min * multiplier;
      cur += 30;
    }

    const shiftName = Array.from(shiftsUsed).join(' + ') || 'Tiêu chuẩn';
    const distinctMultipliers = Array.from(new Set(multipliersUsed)).map(m => `x${m}`).join(', ');

    return {
      total: Math.round(total),
      shiftName,
      isWeekend,
      multiplierText: distinctMultipliers || 'x1'
    };
  };

  const isTimeInPast = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
    const [y, mon, d] = dateStr.split('-').map(Number);
    const target = new Date(y, mon - 1, d, h, m, 0);
    return target < new Date();
  };

  const startOptions = [
    // Sáng: 05:00 - 10:00
    '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00',
    // Chiều: 14:00 - 17:00
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    // Tối & Đêm: 18:00 - 22:00
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const handleOpenBookingModal = async (pitch, startSlotTime = '18:00') => {
    if (pitch.pitch_status === 'maintenance') {
      await showAlert({
        title: 'Sân đang bảo trì',
        message: 'Sân này đang trong quá trình bảo dưỡng mặt cỏ, quý khách vui lòng chọn sân khác!',
        type: 'warning'
      });
      return;
    }

    const token = localStorage.getItem('customer_token');
    if (!token) {
      await showAlert({
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập tài khoản Khách hàng để thực hiện đặt sân trực tuyến!',
        type: 'warning'
      });
      navigate('/');
      return;
    }

    let initialTime = startSlotTime.slice(0, 5);
    if (isTimeInPast(selectedDate, initialTime)) {
      const nextAvailable = startOptions.find(t => !isTimeInPast(selectedDate, t));
      if (!nextAvailable) {
        await showAlert({
          title: 'Khung giờ đã qua',
          message: 'Tất cả khung giờ của ngày hôm nay đều đã kết thúc trong quá khứ. Quý khách vui lòng chọn ngày tiếp theo!',
          type: 'info'
        });
        return;
      }
      initialTime = nextAvailable;
    }

    setBookingModal({
      isOpen: true,
      pitchId: pitch.pitch_id,
      pitchName: pitch.pitch_name,
      pitchPrice: pitch.price_default,
      startTime: initialTime,
      duration: 60
    });
  };

  // Kiểm tra 5 Quy tắc nghiệp vụ BR-BOOKING-01 -> BR-BOOKING-05 tại Frontend
  const validateBooking = () => {
    if (!bookingModal.isOpen) return { isValid: true };

    const endTime = calculateEndTime(bookingModal.startTime, bookingModal.duration);
    const [startH, startM] = bookingModal.startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    // BR-BOOKING-01: Không cho phép đặt sân trong quá khứ
    const [bYear, bMonth, bDay] = selectedDate.split('-').map(Number);
    const bookingDateTime = new Date(bYear, bMonth - 1, bDay, startH, startM, 0);
    const now = new Date();
    if (bookingDateTime < now) {
      return {
        isValid: false,
        code: 'BR-BOOKING-01',
        message: '[BR-BOOKING-01] Không cho phép đặt sân trong quá khứ. Vui lòng chọn ngày và giờ trong tương lai.'
      };
    }

    // BR-BOOKING-02: start_time phải nhỏ hơn end_time
    if (startMin >= endMin) {
      return {
        isValid: false,
        code: 'BR-BOOKING-02',
        message: '[BR-BOOKING-02] Giờ bắt đầu (start_time) phải nhỏ hơn giờ kết thúc (end_time).'
      };
    }

    // BR-BOOKING-05: Thời lượng đặt sân tối thiểu là 60 phút
    if (Number(bookingModal.duration) < 60 || (endMin - startMin) < 60) {
      return {
        isValid: false,
        code: 'BR-BOOKING-05',
        message: '[BR-BOOKING-05] Thời lượng đặt sân tối thiểu là 60 phút (1 tiếng).'
      };
    }

    // BR-BOOKING-03: Booking phải nằm trong giờ hoạt động của sân
    const openTime = 5 * 60;   // 05:00
    const closeTime = 23 * 60; // 23:00
    const lunchStart = 11 * 60; // 11:00
    const lunchEnd = 14 * 60;   // 14:00

    if (startMin < openTime || endMin > closeTime || (startMin < lunchEnd && endMin > lunchStart)) {
      return {
        isValid: false,
        code: 'BR-BOOKING-03',
        message: '[BR-BOOKING-03] Booking phải nằm trong giờ hoạt động của sân (Ca sáng: 05:00 - 11:00, Ca chiều & tối: 14:00 - 23:00; không được kéo dài qua giờ nghỉ trưa 11:00 - 14:00 hoặc sau 23:00).'
      };
    }

    // BR-BOOKING-04: Không cho phép booking trùng thời gian với booking đã tồn tại
    const targetPitch = matrixData.find(p => p.pitch_id === bookingModal.pitchId);
    if (targetPitch && targetPitch.slots) {
      for (const slot of targetPitch.slots) {
        const [sSH, sSM] = slot.start_time.split(':').map(Number);
        const [sEH, sEM] = slot.end_time.split(':').map(Number);
        const slotStartMin = sSH * 60 + sSM;
        const slotEndMin = sEH * 60 + sEM;

        if (startMin < slotEndMin && endMin > slotStartMin && slot.is_booked) {
          return {
            isValid: false,
            code: 'BR-BOOKING-04',
            message: `[BR-BOOKING-04] Trùng thời gian với booking đã có trên sân (${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}). Vui lòng chọn khung giờ khác.`
          };
        }
      }
    }

    return { isValid: true };
  };

  const bookingValidation = validateBooking();

  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    // Xác thực kiểm tra trước các quy tắc BR-BOOKING-01 -> BR-BOOKING-05
    const check = validateBooking();
    if (!check.isValid) {
      await showAlert({
        title: 'Quy định đặt sân',
        message: check.message,
        type: 'warning'
      });
      return;
    }

    try {
      const endTime = calculateEndTime(bookingModal.startTime, bookingModal.duration);

      const payload = {
        pitch_id: bookingModal.pitchId,
        booking_date: selectedDate,
        start_time: `${bookingModal.startTime}:00`,
        end_time: `${endTime}:00`,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        note: form.note
      };

      const res = await axiosClient.post('/bookings/online', payload);
      if (res.data.success) {
        setBookingModal({ ...bookingModal, isOpen: false });
        fetchAvailability();
        const goToHistory = await confirm({
          title: '🎉 Đặt sân thành công!',
          message: `Ca đá của bạn: ${bookingModal.startTime} - ${endTime}.\nTổng tiền: ${res.data.data.total_price.toLocaleString('vi-VN')} đ.\n\nBạn có muốn chuyển sang trang xem "Lịch Sử Đơn Đặt" ngay bây giờ không?`,
          type: 'success',
          confirmText: 'Xem lịch sử đơn',
          cancelText: 'Ở lại trang này',
        });
        if (goToHistory) {
          navigate('/my-bookings');
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Đặt sân không thành công',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi đặt sân.',
        type: 'danger',
      });
    }
  };

  const estimated = getEstimatedPrice();

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {/* BẢNG QUY ĐỊNH KHUNG GIỜ VÀ HỆ SỐ GIÁ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {rules.map((r, idx) => (
            <div key={idx} style={{ background: 'white', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#064e3b' }}>{r.shift_name}</div>
              <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', margin: '4px 0' }}>
                {r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                <div>Ngày thường (T2 - T6): <b style={{ color: '#059669' }}>x{r.price_multiplier}</b></div>
                <div>Cuối tuần (T7 & CN): <b style={{ color: '#d97706' }}>x{r.weekend_multiplier !== undefined && r.weekend_multiplier !== null ? r.weekend_multiplier : r.price_multiplier}</b></div>
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>{r.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* THANH CHỌN THỨ TRONG TUẦN TỪ THỨ 2 ĐẾN CHỦ NHẬT (CHỐNG TRÀN VIỀN) */}
        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          allowPast={false}
          title="Lịch Sân Theo Tuần"
          subtitle="Bấm chọn nhanh các thứ trong tuần (Thứ 2 → Chủ Nhật) để xem lịch sân trống"
        />

        {/* BẢNG LỊCH TRỰC QUAN THEO MỐC 30 PHÚT */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                ⚽ Sơ Đồ Lịch Sân: {getDayOfWeekName(selectedDate)}, {formatDisplayDate(selectedDate)}
              </h2>
              <p className="panel-subtitle">Bước nhảy 30 phút | Đặt tối thiểu 60 phút (1 tiếng) | Nhấn ô xanh để chọn giờ.</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/my-bookings')}
                style={{
                  background: '#ecfdf5',
                  color: '#064e3b',
                  border: '1px solid #a7f3d0',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📋 Đơn Của Tôi
              </button>
              <button className="btn-action-primary" onClick={fetchAvailability}>Làm mới</button>
            </div>
          </div>

          <div className="legend-bar">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>Xanh: Mốc 30p đang trống</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#cbd5e1', border: '1px solid #94a3b8' }}></div><span>Xám: Đã qua giờ (Không khả dụng)</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }}></div><span>Đỏ: Đã có đội chiếm giờ</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}></div><span>Vàng nhạt: Sân đang bảo trì (Khóa)</span></div>
          </div>

          <div className="schedule-table-wrap">
            {loading ? (
              <p style={{ textAlign: 'center', padding: '30px' }}>Đang tải lịch sân...</p>
            ) : (
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="time-col">Khung Giờ (30p)</th>
                    {matrixData.map(p => {
                      const isMaintenance = p.pitch_status === 'maintenance';
                      return (
                        <th
                          key={p.pitch_id}
                          style={{
                            backgroundColor: isMaintenance ? '#fffbeb' : '#f8fafc',
                            borderTop: isMaintenance ? '3px solid #f59e0b' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{p.pitch_name}</span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>({p.pitch_type})</span>
                            <button
                              type="button"
                              onClick={() => setSelectedDetailPitchId(p.pitch_id)}
                              style={{
                                marginTop: '4px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                color: '#065f46',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                              title="Xem hình ảnh góc sân & đánh giá"
                            >
                              🔍 Ảnh & Đánh giá
                            </button>
                            {isMaintenance ? (
                              <span style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                border: '1px solid #fcd34d'
                              }}>
                                🛠️ BẢO TRÌ
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                background: '#ecfdf5',
                                color: '#059669',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                🟢 CÒN TRỐNG
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrixData[0]?.slots.map((slotItem, slotIdx) => {
                    const prevSlot = slotIdx > 0 ? matrixData[0].slots[slotIdx - 1] : null;
                    const isNewShift = prevSlot && prevSlot.shift !== slotItem.shift;

                    return (
                      <React.Fragment key={slotIdx}>
                        {isNewShift && (
                          <tr>
                            <td
                              colSpan={matrixData.length + 1}
                              style={{
                                background: '#e2e8f0',
                                borderTop: '3px solid #065f46',
                                borderBottom: '1px solid #cbd5e1',
                                padding: '6px 16px',
                                textAlign: 'left',
                                fontWeight: '800',
                                fontSize: '12px',
                                color: '#064e3b',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}
                            >
                              ⚡ CHUYỂN TIẾP: {slotItem.shift}
                            </td>
                          </tr>
                        )}

                        <tr>
                          <td className="time-col">
                            <b>{slotItem.label}</b>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{slotItem.shift}</div>
                          </td>

                          {matrixData.map(pitch => {
                            const s = pitch.slots[slotIdx];
                            if (!s) return <td key={pitch.pitch_id}>-</td>;

                            const isMaintenance = pitch.pitch_status === 'maintenance';

                            if (isMaintenance) {
                              return (
                                <td key={pitch.pitch_id} style={{ backgroundColor: '#fffdf5' }}>
                                  <div
                                    className="slot-card"
                                    style={{
                                      minHeight: '44px',
                                      padding: '4px',
                                      backgroundColor: '#fef3c7',
                                      border: '1px dashed #f59e0b',
                                      color: '#b45309',
                                      cursor: 'not-allowed'
                                    }}
                                    title="Sân đang bảo trì, không thể đặt"
                                  >
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>🛠️ BẢO TRÌ</span>
                                  </div>
                                </td>
                              );
                            }

                            if (!s.is_booked) {
                              const isPast = s.is_past !== undefined ? s.is_past : isTimeInPast(selectedDate, s.start_time);
                              if (isPast) {
                                return (
                                  <td key={pitch.pitch_id} style={{ backgroundColor: '#f8fafc' }}>
                                    <div
                                      className="slot-card"
                                      style={{
                                        minHeight: '44px',
                                        padding: '4px',
                                        backgroundColor: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        color: '#94a3b8',
                                        cursor: 'not-allowed',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.85
                                      }}
                                      title="Khung giờ này đã qua trong quá khứ, không khả dụng để đặt"
                                    >
                                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>⛔ ĐÃ QUA</span>
                                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>Không khả dụng</span>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={pitch.pitch_id}>
                                  <div
                                    className="slot-card slot-state-free"
                                    style={{ minHeight: '44px', padding: '4px' }}
                                    onClick={() => handleOpenBookingModal(pitch, s.start_time)}
                                  >
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>+ TRỐNG</span>
                                    <span style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}>Đặt ngay &rarr;</span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={pitch.pitch_id}>
                                <div
                                  className="slot-card"
                                  style={{
                                    minHeight: '44px',
                                    padding: '4px',
                                    backgroundColor: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    color: '#b91c1c',
                                    cursor: 'not-allowed'
                                  }}
                                >
                                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>ĐÃ KÍN</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* MODAL ĐẶT SÂN: TÍNH SẴN GIÁ TIỀN TỰ ĐỘNG */}
      {bookingModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>⚽ Đặt Sân: {bookingModal.pitchName}</h3>
              <button className="btn-close" onClick={() => setBookingModal({ ...bookingModal, isOpen: false })}>&times;</button>
            </div>

            <form onSubmit={handleSubmitBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label>Giờ bắt đầu:</label>
                  <select
                    value={bookingModal.startTime}
                    onChange={(e) => setBookingModal({ ...bookingModal, startTime: e.target.value })}
                  >
                    {startOptions.map((t, idx) => {
                      const isPastOpt = isTimeInPast(selectedDate, t);
                      return (
                        <option
                          key={idx}
                          value={t}
                          disabled={isPastOpt}
                          style={isPastOpt ? { color: '#94a3b8', backgroundColor: '#f1f5f9' } : {}}
                        >
                          {t} {isPastOpt ? '— [Đã qua - Không khả dụng]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Thời lượng thuê:</label>
                  <select
                    value={bookingModal.duration}
                    onChange={(e) => setBookingModal({ ...bookingModal, duration: Number(e.target.value) })}
                  >
                    <option value={60}>60 phút (1 tiếng - Tối thiểu)</option>
                    <option value={90}>90 phút (1.5 tiếng)</option>
                    <option value={120}>120 phút (2 tiếng)</option>
                    <option value={150}>150 phút (2.5 tiếng)</option>
                    <option value={180}>180 phút (3 tiếng)</option>
                  </select>
                </div>
              </div>

              {/* KHỐI TÍNH SẴN GIÁ TIỀN RÕ RÀNG */}
              <div style={{
                background: '#ecfdf5',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '16px',
                border: '1.5px solid #10b981'
              }}>
                <div style={{ fontSize: '13px', color: '#064e3b', fontWeight: 'bold', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📅 Ngày đá: {getDayOfWeekName(selectedDate)}, {formatDisplayDate(selectedDate)}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: estimated.isWeekend ? '#fef3c7' : '#e0f2fe',
                    color: estimated.isWeekend ? '#b45309' : '#0369a1',
                    fontWeight: 'bold',
                    border: estimated.isWeekend ? '1px solid #fde68a' : '1px solid #bae6fd'
                  }}>
                    {estimated.isWeekend ? '🏖️ Biểu giá Cuối Tuần (T7/CN)' : '🏢 Biểu giá Ngày Thường (T2-T6)'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#064e3b' }}>
                  Thời gian: <b>{bookingModal.startTime}</b> &rarr; <b>{calculateEndTime(bookingModal.startTime, bookingModal.duration)}</b> ({bookingModal.duration} phút)
                </div>
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                  Ca áp dụng: <b>{estimated.shiftName}</b> ({estimated.multiplierText}) | Giá gốc: {Number(bookingModal.pitchPrice).toLocaleString('vi-VN')} đ/h
                </div>

                <div style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px dashed #a7f3d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#064e3b' }}>TỔNG TIỀN TẠM TÍNH:</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>
                    {estimated.total.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Họ tên người đặt:</label>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại liên hệ:</label>
                <input
                  type="text"
                  required
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Ghi chú:</label>
                <input
                  type="text"
                  placeholder="Yêu cầu áo bib, chuẩn bị bóng..."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              {/* CẢNH BÁO NẾU VI PHẠM QUY TẮC NGHIỆP VỤ BR-BOOKING-01 -> BR-BOOKING-05 */}
              {!bookingValidation.isValid && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  lineHeight: '1.4'
                }}>
                  ⚠️ {bookingValidation.message}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setBookingModal({ ...bookingModal, isOpen: false })}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-action-primary"
                  disabled={!bookingValidation.isValid}
                  style={{
                    opacity: bookingValidation.isValid ? 1 : 0.6,
                    cursor: bookingValidation.isValid ? 'pointer' : 'not-allowed'
                  }}
                  title={!bookingValidation.isValid ? bookingValidation.message : ''}
                >
                  Xác Nhận Đặt Sân ({estimated.total.toLocaleString('vi-VN')} đ)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP XEM CHI TIẾT SÂN, ẢNH GÓC SÂN & ĐÁNH GIÁ */}
      <PitchDetailModal
        pitchId={selectedDetailPitchId}
        isOpen={Boolean(selectedDetailPitchId)}
        onClose={() => setSelectedDetailPitchId(null)}
        onBookPitch={() => setSelectedDetailPitchId(null)}
      />
    </div>
  );
}

export default CustomerBookingPage;