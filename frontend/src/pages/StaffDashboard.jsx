import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import WeekStrip from '../components/WeekStrip';
import PitchDetailModal from '../components/PitchDetailModal';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function StaffDashboard() {
  const { confirm, showAlert } = useConfirm();
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'gallery' | 'reviews'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [matrixData, setMatrixData] = useState([]);
  const [rules, setRules] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [pitchesList, setPitchesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Popup xem chi tiết sân bóng cho Staff
  const [selectedDetailPitchId, setSelectedDetailPitchId] = useState(null);

  // Quản lý đánh giá & góp ý từ khách hàng
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilterPitch, setReviewFilterPitch] = useState('all');

  // Modal quản lý ảnh mô tả sân (Pitch Gallery) cho Staff
  const [galleryModal, setGalleryModal] = useState({
    isOpen: false,
    pitch: null,
    images: [],
    loading: false
  });
  const [galleryForm, setGalleryForm] = useState({
    caption: '',
    imageFile: null,
    imagePreview: null,
    imageUrl: '',
    uploadMethod: 'file'
  });
  const [galleryUploading, setGalleryUploading] = useState(false);

  const getDayOfWeekName = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const daysMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return daysMap[d.getDay()];
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  // Modal đặt sân nhanh tại quầy (Desk Booking)
  const [deskModal, setDeskModal] = useState({
    isOpen: false,
    pitchId: null,
    pitchName: '',
    pitchPrice: 0,
    startTime: '18:00',
    duration: 60
  });

  const [deskForm, setDeskForm] = useState({
    customer_name: '',
    customer_phone: '',
    note: '',
    payment_status: 'unpaid'
  });

  // Modal chi tiết đơn đặt sân
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    bookingId: null,
    bookingData: null,
    servicesOrder: [],
    totalServiceAmount: 0
  });

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQty, setServiceQty] = useState(1);
  const [qrInput, setQrInput] = useState('');

  // Danh sách đơn đặt trong ngày và toàn hệ thống
  const [dayBookings, setDayBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [filterByDate, setFilterByDate] = useState(true);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');

  const startOptions = [
    // Ca Sáng: 05:00 - 10:00
    '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00',
    // Ca Chiều: 14:00 - 17:00
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    // Ca Tối & Đêm: 18:00 - 22:00
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  useEffect(() => {
    fetchServicesAndStaff();
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchServicesAndStaff = async () => {
    try {
      const [resServices, resStaff, resPitches] = await Promise.all([
        axiosClient.get('/services'),
        axiosClient.get('/auth/staff').catch(() => ({ data: { success: false, data: [] } })),
        axiosClient.get('/pitches').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (resServices.data.success) {
        setServicesList(resServices.data.data);
        if (resServices.data.data.length > 0) setSelectedServiceId(resServices.data.data[0].id);
      }

      if (resStaff.data?.success) {
        setStaffList(resStaff.data.data);
      }

      if (resPitches.data?.success) {
        setPitchesList(resPitches.data.data);
      }

      // Tải danh sách đánh giá của khách hàng
      fetchReviews();
    } catch (err) {
      console.error('Lỗi lấy danh sách tiện ích và nhân sự:', err);
    }
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const [resMatrix, resBookings, resAllBookings] = await Promise.all([
        axiosClient.get(`/bookings/check-availability?date=${selectedDate}`),
        axiosClient.get(`/bookings?date=${selectedDate}`),
        axiosClient.get('/bookings').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (resMatrix.data.success) {
        setMatrixData(resMatrix.data.data);
        setRules(resMatrix.data.rules || []);
      }
      if (resBookings.data.success) {
        setDayBookings(resBookings.data.data);
      }
      if (resAllBookings.data?.success) {
        setAllBookings(resAllBookings.data.data);
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi tải dữ liệu',
        message: 'Lỗi tải dữ liệu lịch sân: ' + (err.response?.data?.message || err.message),
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách đánh giá cho nhân viên trực ban theo dõi
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await axiosClient.get('/pitches/reviews');
      if (res.data.success) {
        setReviewsList(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đánh giá:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Mở modal quản lý ảnh mô tả của sân (Pitch Gallery) cho Staff
  const handleOpenGalleryModal = async (pitch) => {
    setGalleryModal({
      isOpen: true,
      pitch,
      images: [],
      loading: true
    });
    setGalleryForm({
      caption: '',
      imageFile: null,
      imagePreview: null,
      imageUrl: '',
      uploadMethod: 'file'
    });

    try {
      const res = await axiosClient.get(`/pitches/${pitch.id || pitch.pitch_id}`);
      if (res.data.success) {
        setGalleryModal(prev => ({
          ...prev,
          pitch: res.data.data,
          images: res.data.data.images || [],
          loading: false
        }));
      }
    } catch (err) {
      console.error('Lỗi tải ảnh gallery:', err);
      setGalleryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseGalleryModal = () => {
    setGalleryModal({
      isOpen: false,
      pitch: null,
      images: [],
      loading: false
    });
    setGalleryForm({
      caption: '',
      imageFile: null,
      imagePreview: null,
      imageUrl: '',
      uploadMethod: 'file'
    });
  };

  const handleGalleryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGalleryForm(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleAddPitchImage = async (e) => {
    e.preventDefault();
    const currentPitch = galleryModal.pitch;
    if (!currentPitch) return;
    const pitchId = currentPitch.id || currentPitch.pitch_id;

    if (galleryForm.uploadMethod === 'file' && !galleryForm.imageFile) {
      await showAlert({ title: 'Thiếu ảnh', message: 'Vui lòng chọn một file ảnh từ máy tính hoặc điện thoại.', type: 'warning' });
      return;
    }
    if (galleryForm.uploadMethod === 'url' && !galleryForm.imageUrl.trim()) {
      await showAlert({ title: 'Thiếu ảnh', message: 'Vui lòng dán liên kết (URL) hình ảnh.', type: 'warning' });
      return;
    }

    try {
      setGalleryUploading(true);
      const formData = new FormData();
      formData.append('caption', galleryForm.caption.trim());

      if (galleryForm.uploadMethod === 'file') {
        formData.append('image', galleryForm.imageFile);
      } else {
        formData.append('image_url', galleryForm.imageUrl.trim());
      }

      const res = await axiosClient.post(`/pitches/${pitchId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: 'Đã tải ảnh góc sân lên thư viện thành công!', type: 'success' });
        setGalleryForm({
          caption: '',
          imageFile: null,
          imagePreview: null,
          imageUrl: '',
          uploadMethod: 'file'
        });
        // Tải lại danh sách ảnh sân
        const refresh = await axiosClient.get(`/pitches/${pitchId}`);
        if (refresh.data.success) {
          setGalleryModal(prev => ({ ...prev, images: refresh.data.data.images || [] }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi tải ảnh lên.',
        type: 'danger'
      });
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDeletePitchImage = async (imageId) => {
    const ok = await confirm({
      title: 'Xóa ảnh mô tả',
      message: 'Bạn có chắc chắn muốn xóa ảnh góc sân này không?',
      type: 'danger',
      confirmText: 'Xóa ảnh'
    });
    if (!ok) return;

    const pitchId = galleryModal.pitch?.id || galleryModal.pitch?.pitch_id;
    try {
      const res = await axiosClient.delete(`/pitches/${pitchId}/images/${imageId}`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: 'Đã xóa ảnh thành công!', type: 'success' });
        setGalleryModal(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== imageId)
        }));
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi xóa ảnh.',
        type: 'danger'
      });
    }
  };

  const calculateEndTime = (startStr, durationMin) => {
    const [h, m] = startStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Number(durationMin);
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  // Tính sẵn giá tiền cho Desk Booking theo block 30 phút
  const getDeskEstimatedPrice = () => {
    if (!deskModal.pitchPrice) return { total: 0, shiftName: '' };

    const [h, m] = deskModal.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + Number(deskModal.duration);
    const pricePer30Min = Number(deskModal.pitchPrice) / 2;

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

  const activePitches = matrixData.filter(p => p.pitch_status !== 'maintenance');
  const total30MinSlots = activePitches.reduce((acc, p) => acc + (p.slots ? p.slots.length : 0), 0);
  const booked30MinSlots = activePitches.reduce((acc, p) => acc + (p.slots ? p.slots.filter(s => s.is_booked).length : 0), 0);
  const free30MinSlots = total30MinSlots - booked30MinSlots;

  const isTimeInPast = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
    const [y, mon, d] = dateStr.split('-').map(Number);
    const target = new Date(y, mon - 1, d, h, m, 0);
    return target < new Date();
  };

  const handleOpenDeskBooking = async (pitch, slot) => {
    if (pitch.pitch_status === 'maintenance') {
      await showAlert({
        title: 'Sân đang bảo trì',
        message: 'Sân này đang trong thời gian bảo trì, không thể nhận lịch đặt!',
        type: 'warning'
      });
      return;
    }

    let initialTime = slot.start_time.slice(0, 5);
    if (isTimeInPast(selectedDate, initialTime)) {
      const nextAvailable = startOptions.find(t => !isTimeInPast(selectedDate, t));
      if (!nextAvailable) {
        await showAlert({
          title: 'Hết khung giờ',
          message: 'Tất cả khung giờ của ngày hôm nay đều đã kết thúc trong quá khứ. Không thể đặt tại quầy!',
          type: 'warning'
        });
        return;
      }
      initialTime = nextAvailable;
    }

    setDeskModal({
      isOpen: true,
      pitchId: pitch.pitch_id,
      pitchName: pitch.pitch_name,
      pitchPrice: pitch.price_default,
      startTime: initialTime,
      duration: 60
    });
    setDeskForm({ customer_name: '', customer_phone: '', note: '', payment_status: 'unpaid' });
  };

  // Kiểm tra 5 Quy tắc nghiệp vụ BR-BOOKING-01 -> BR-BOOKING-05 cho nhân viên đặt tại quầy
  const validateDeskBooking = () => {
    if (!deskModal.isOpen) return { isValid: true };

    const endTime = calculateEndTime(deskModal.startTime, deskModal.duration);
    const [startH, startM] = deskModal.startTime.split(':').map(Number);
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
    if (Number(deskModal.duration) < 60 || (endMin - startMin) < 60) {
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
        message: '[BR-BOOKING-03] Booking phải nằm trong giờ hoạt động của sân (Ca sáng: 05:00 - 11:00, Ca chiều & tối: 14:00 - 23:00; không vượt quá 23:00 hoặc rơi vào giờ nghỉ trưa 11:00 - 14:00).'
      };
    }

    // BR-BOOKING-04: Không cho phép booking trùng thời gian với booking đã tồn tại
    const targetPitch = matrixData.find(p => p.pitch_id === deskModal.pitchId);
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

  const deskValidation = validateDeskBooking();

  const handleSubmitDeskBooking = async (e) => {
    e.preventDefault();

    // Kiểm tra toàn bộ 5 quy tắc nghiệp vụ BR-BOOKING-01 -> BR-BOOKING-05
    const check = validateDeskBooking();
    if (!check.isValid) {
      await showAlert({
        title: 'Quy định đặt sân',
        message: check.message,
        type: 'warning'
      });
      return;
    }

    try {
      const endTime = calculateEndTime(deskModal.startTime, deskModal.duration);

      const payload = {
        pitch_id: deskModal.pitchId,
        booking_date: selectedDate,
        start_time: `${deskModal.startTime}:00`,
        end_time: `${endTime}:00`,
        customer_name: deskForm.customer_name,
        customer_phone: deskForm.customer_phone,
        note: deskForm.note,
        payment_status: deskForm.payment_status
      };

      const res = await axiosClient.post('/bookings/desk', payload);
      if (res.data.success) {
        await showAlert({
          title: 'Thành công',
          message: 'Đặt sân tại quầy thành công!',
          type: 'success'
        });
        setDeskModal({ ...deskModal, isOpen: false });
        fetchAvailability();
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi đặt sân',
        message: err.response?.data?.message || 'Lỗi khi tạo đơn tại quầy.',
        type: 'danger'
      });
    }
  };

  const handleOpenActionModal = async (bookingId) => {
    try {
      const [resBookings, resServices] = await Promise.all([
        axiosClient.get(`/bookings?date=${selectedDate}`),
        axiosClient.get(`/services/order/${bookingId}`)
      ]);

      if (resBookings.data.success) {
        const found = resBookings.data.data.find(b => b.id === bookingId);
        if (found) {
          setActionModal({
            isOpen: true,
            bookingId,
            bookingData: found,
            servicesOrder: resServices.data.success ? resServices.data.data : [],
            totalServiceAmount: resServices.data.success ? resServices.data.total_service_amount : 0
          });
        }
      }
    } catch (err) {
      console.error('Lỗi khi mở chi tiết đơn:', err);
    }
  };

  const handleAddServiceToOrder = async () => {
    try {
      const res = await axiosClient.post('/services/order', {
        booking_id: actionModal.bookingId,
        service_id: selectedServiceId,
        quantity: serviceQty
      });
      if (res.data.success) {
        await showAlert({
          title: 'Thành công',
          message: res.data.message || 'Thêm tiện ích thành công!',
          type: 'success'
        });
        const resServices = await axiosClient.get(`/services/order/${actionModal.bookingId}`);
        if (resServices.data.success) {
          setActionModal(prev => ({
            ...prev,
            servicesOrder: resServices.data.data,
            totalServiceAmount: resServices.data.total_service_amount
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi',
        message: err.response?.data?.message || 'Lỗi khi thêm tiện ích.',
        type: 'danger'
      });
    }
  };

  const handleQuickQrCheckin = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    const bookingId = qrInput.toUpperCase().replace('BOOKING_', '').trim();
    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/checkin`);
      if (res.data.success) {
        await showAlert({
          title: 'Check-in thành công',
          message: `Check-in thành công cho Đơn #${bookingId}!`,
          type: 'success'
        });
        setQrInput('');
        fetchAvailability();
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi Check-in',
        message: err.response?.data?.message || 'Check-in thất bại.',
        type: 'danger'
      });
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await axiosClient.patch(`/bookings/${actionModal.bookingId}/status`, { status });
      await showAlert({
        title: 'Cập nhật trạng thái',
        message: `Đã cập nhật trạng thái đơn: ${status}`,
        type: 'success'
      });
      setActionModal(prev => ({ ...prev, isOpen: false }));
      fetchAvailability();
    } catch (err) {
      await showAlert({
        title: 'Lỗi cập nhật',
        message: err.response?.data?.message || 'Thao tác thất bại.',
        type: 'danger'
      });
    }
  };

  const handleCheckin = async () => {
    try {
      await axiosClient.patch(`/bookings/${actionModal.bookingId}/checkin`);
      await showAlert({
        title: 'Check-in đón khách',
        message: 'Khách đã check-in vào sân thành công!',
        type: 'success'
      });
      setActionModal(prev => ({ ...prev, isOpen: false }));
      fetchAvailability();
    } catch (err) {
      await showAlert({
        title: 'Lỗi Check-in',
        message: err.response?.data?.message || 'Check-in thất bại.',
        type: 'danger'
      });
    }
  };

  const handleUpdatePayment = async (payment_status) => {
    try {
      await axiosClient.patch(`/bookings/${actionModal.bookingId}/payment`, { payment_status });
      await showAlert({
        title: 'Cập nhật thanh toán',
        message: 'Cập nhật thanh toán thành công!',
        type: 'success'
      });
      setActionModal(prev => ({ ...prev, isOpen: false }));
      fetchAvailability();
    } catch (err) {
      await showAlert({
        title: 'Lỗi thanh toán',
        message: err.response?.data?.message || 'Cập nhật thất bại.',
        type: 'danger'
      });
    }
  };

  // THAO TÁC ĐƠN NHANH TRỰC TIẾP TỪ BẢNG ĐƠN
  const handleDirectUpdateStatus = async (bookingId, status) => {
    let title = 'Xác nhận đổi trạng thái';
    let message = `Đổi trạng thái đơn #${bookingId} thành ${status}?`;
    let type = 'primary';
    let confirmText = 'Xác nhận';

    if (status === 'cancelled') {
      title = 'Hủy đơn đặt sân';
      message = `Bạn có chắc chắn muốn HỦY đơn #${bookingId}? Thao tác này sẽ giải phóng khung giờ trên lịch trực ban.`;
      type = 'danger';
      confirmText = 'Hủy đơn ngay';
    } else if (status === 'confirmed') {
      title = 'Duyệt đơn đặt sân';
      message = `Xác nhận DUYỆT đơn #${bookingId} cho khách hàng?`;
      type = 'success';
      confirmText = 'Duyệt đơn';
    } else if (status === 'completed') {
      title = 'Hoàn tất ca đá';
      message = `Xác nhận ca đá #${bookingId} đã HOÀN THÀNH tốt đẹp?`;
      type = 'success';
      confirmText = 'Hoàn tất';
    }

    const ok = await confirm({ title, message, type, confirmText });
    if (!ok) return;

    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchAvailability();
        if (actionModal.isOpen && actionModal.bookingId === bookingId) {
          setActionModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, status }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Thao tác thất bại.',
        type: 'danger',
      });
    }
  };

  const handleDirectCheckin = async (bookingId) => {
    const ok = await confirm({
      title: 'Check-in đón khách',
      message: `Xác nhận đón khách CHECK-IN vào sân cho đơn #${bookingId}?`,
      type: 'info',
      confirmText: 'Check-in ngay',
    });
    if (!ok) return;

    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/checkin`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchAvailability();
        if (actionModal.isOpen && actionModal.bookingId === bookingId) {
          setActionModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, status: 'checked_in' }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Check-in thất bại.',
        type: 'danger',
      });
    }
  };

  const handleDirectUpdatePayment = async (bookingId, payment_status) => {
    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/payment`, { payment_status });
      if (res.data.success) {
        await showAlert({
          title: 'Cập nhật thanh toán',
          message: `Đã cập nhật thanh toán đơn #${bookingId}: ${payment_status === 'paid' ? 'Đã thanh toán 100%' : payment_status === 'deposited' ? 'Đã cọc' : 'Chưa thanh toán'}`,
          type: 'success'
        });
        fetchAvailability();
        if (actionModal.isOpen && actionModal.bookingId === bookingId) {
          setActionModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, payment_status }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi thanh toán',
        message: err.response?.data?.message || 'Cập nhật thanh toán thất bại.',
        type: 'danger'
      });
    }
  };

  const deskEstimated = getDeskEstimatedPrice();

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {/* TABS CHO NHÂN VIÊN */}
        <div className="tab-row" style={{ marginBottom: '18px' }}>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            ⚽ Sơ Đồ Lịch Sân & Thao Tác Đơn
          </button>
          <button
            className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            🖼️ Thư Viện Ảnh Sân ({pitchesList.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reviews'); fetchReviews(); }}
          >
            ⭐ Đánh Giá & Góp Ý ({reviewsList.length})
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div>
            {/* STATS ROW */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>🟢</div>
            <div>
              <div className="stat-label">Mốc 30p còn trống (sân hoạt động)</div>
              <div className="stat-num">{free30MinSlots}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>⚽</div>
            <div>
              <div className="stat-label">Mốc 30p đã kín</div>
              <div className="stat-num">{booked30MinSlots}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📊</div>
            <div>
              <div className="stat-label">Tỉ lệ lấp đầy sân hoạt động</div>
              <div className="stat-num">{total30MinSlots > 0 ? Math.round((booked30MinSlots / total30MinSlots) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        {/* BANNER THÔNG TIN TRỰC BAN CỦA TÀI KHOẢN ĐANG ĐĂNG NHẬP */}
        {(() => {
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          const myProfile = staffList.find(s => s.id === currentUser.id || s.username === currentUser.username) || currentUser;
          const myShifts = myProfile?.shift_assigned;
          const isAbsent = !myShifts || myShifts === 'Vắng mặt / Nghỉ';

          return (
            <div style={{
              background: isAbsent ? '#fef2f2' : '#ecfdf5',
              border: isAbsent ? '1px solid #fecaca' : '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👤</span>
                <div>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Nhân viên trực ban: </span>
                  <b style={{ fontSize: '14px', color: '#1e293b' }}>{myProfile?.full_name || currentUser.username}</b>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>Ca trực của bạn:</span>
                {isAbsent ? (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                    Chưa xếp ca / Vắng mặt
                  </span>
                ) : (
                  <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                    {myShifts}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* THÔNG TIN BIỂU GIÁ 4 CA & NHÂN SỰ PHỤ TRÁCH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {rules.map((r, idx) => {
            const isStaffAssigned = (assignedStr, shiftName) => {
              if (!assignedStr || assignedStr === 'Vắng mặt / Nghỉ') return false;
              const a = assignedStr.toLowerCase();
              const s = (shiftName || '').toLowerCase();
              if (s.includes('sáng') && a.includes('sáng')) return true;
              if (s.includes('chiều') && a.includes('chiều')) return true;
              if (s.includes('tối') && a.includes('tối')) return true;
              if (s.includes('đêm') && a.includes('đêm')) return true;
              return a.includes(s);
            };

            const assignedStaff = staffList.filter(s => isStaffAssigned(s.shift_assigned, r.shift_name));
            return (
              <div key={idx} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', color: '#064e3b' }}>{r.shift_name} ({r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)})</div>
                <div style={{ display: 'flex', gap: '8px', margin: '4px 0', fontSize: '11px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#059669', fontWeight: 'bold', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                    T2-T6: x{r.price_multiplier}
                  </span>
                  <span style={{ color: '#b45309', fontWeight: 'bold', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                    T7-CN: x{r.weekend_multiplier !== undefined && r.weekend_multiplier !== null ? r.weekend_multiplier : r.price_multiplier}
                  </span>
                </div>
                <div style={{ color: '#64748b' }}>{r.note}</div>
                
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '11px' }}>
                  <span>Trực ban: </span>
                  {assignedStaff.length > 0 ? (
                    <b style={{ color: '#059669' }}>{assignedStaff.map(s => s.full_name).join(', ')}</b>
                  ) : (
                    <b style={{ color: '#ef4444' }}>⚠️ Vắng / Chưa có người trực</b>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* THANH CHỌN THỨ TRONG TUẦN (THỨ 2 - CHỦ NHẬT) CHO QUẢN TRỊ & NHÂN VIÊN */}
        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          allowPast={true}
          title="Lịch Trực Ban Theo Tuần"
          subtitle="Bấm chọn nhanh các thứ trong tuần (Thứ 2 → Chủ Nhật) để xem lịch sân và điều phối ca trực"
        />

        {/* BẢNG LỊCH TRỰC BAN MA TRẬN 30 PHÚT */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                📋 Lịch Trực Ban: {getDayOfWeekName(selectedDate)}, {formatDisplayDate(selectedDate)}
              </h2>
              <p className="panel-subtitle">Theo dõi lịch theo mốc 30 phút | Bấm ô trống để đặt tại quầy | Sân bảo trì hiển thị cột màu vàng không thể đặt.</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <form onSubmit={handleQuickQrCheckin} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Quét QR / Nhập ID đơn..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  style={{ width: '200px' }}
                />
                <button type="submit" className="btn-info">📷 Check-in QR</button>
              </form>

              <button className="btn-action-primary" onClick={fetchAvailability}>Làm mới</button>
            </div>
          </div>

          <div className="legend-bar">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }}></div><span>Xanh lá: Mốc trống</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#cbd5e1', border: '1px solid #94a3b8' }}></div><span>Xám: Đã qua giờ (Không khả dụng)</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }}></div><span>Vàng cam: Chờ duyệt</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#2563eb' }}></div><span>Xanh dương: Đã duyệt</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#7c3aed' }}></div><span>Tím: Đang đá</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#bbf7d0', border: '1.5px solid #059669' }}></div><span style={{ fontWeight: 'bold', color: '#064e3b' }}>Huy hiệu: ✓ Đã thanh toán</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}></div><span>Vàng nhạt: Sân bảo trì (Khóa)</span></div>
          </div>

          <div className="schedule-table-wrap">
            {loading ? (
              <p style={{ textAlign: 'center', padding: '30px' }}>Đang tải sơ đồ sân...</p>
            ) : (
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="time-col">Khung Giờ (30p)</th>
                    {matrixData.map(pitch => {
                      const isMaintenance = pitch.pitch_status === 'maintenance';
                      return (
                        <th
                          key={pitch.pitch_id}
                          style={{
                            backgroundColor: isMaintenance ? '#fffbeb' : '#f8fafc',
                            borderTop: isMaintenance ? '3px solid #f59e0b' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{pitch.pitch_name}</span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>({pitch.pitch_type})</span>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailPitchId(pitch.pitch_id)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  color: '#065f46',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                                title="Xem hình ảnh góc sân & đánh giá"
                              >
                                🔍 Chi Tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenGalleryModal(pitch)}
                                style={{
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  color: '#059669',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                                title="Quản lý thư viện ảnh mô tả của sân này"
                              >
                                🖼️ Ảnh
                              </button>
                            </div>
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
                                🟢 HOẠT ĐỘNG
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
                            const currentSlot = pitch.slots[slotIdx];
                            if (!currentSlot) return <td key={pitch.pitch_id}>-</td>;

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
                                    title="Sân này đang bảo trì, không thể nhận lịch đặt"
                                  >
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>🛠️ BẢO TRÌ</span>
                                    <span style={{ fontSize: '10px', color: '#d97706' }}>Tạm ngưng</span>
                                  </div>
                                </td>
                              );
                            }

                            if (!currentSlot.is_booked) {
                              const isPast = currentSlot.is_past !== undefined ? currentSlot.is_past : isTimeInPast(selectedDate, currentSlot.start_time);
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
                                      title="Khung giờ này đã qua, không khả dụng để đặt tại quầy"
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
                                    onClick={() => handleOpenDeskBooking(pitch, currentSlot)}
                                  >
                                    <span className="slot-badge-title">+ TRỐNG</span>
                                    <span style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}>Đặt tại quầy &rarr;</span>
                                  </div>
                                </td>
                              );
                            }

                            let stateClass = 'slot-state-pending';
                            let stateTitle = 'CHỜ DUYỆT';

                            if (currentSlot.booking_status === 'confirmed') {
                              stateClass = 'slot-state-confirmed';
                              stateTitle = 'ĐÃ DUYỆT';
                            } else if (currentSlot.booking_status === 'checked_in') {
                              stateClass = 'slot-state-checkedin';
                              stateTitle = 'ĐANG ĐÁ';
                            } else if (currentSlot.booking_status === 'completed') {
                              stateClass = 'slot-state-confirmed';
                              stateTitle = 'HOÀN TẤT';
                            }

                            const isPaid = currentSlot.payment_status === 'paid';
                            const isDeposited = currentSlot.payment_status === 'deposited';

                            return (
                              <td key={pitch.pitch_id}>
                                <div
                                  className={`slot-card ${stateClass}`}
                                  style={{
                                    minHeight: '48px',
                                    padding: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxSizing: 'border-box',
                                    border: isPaid ? '2px solid #059669' : undefined,
                                    backgroundColor: isPaid ? '#f0fdf4' : undefined
                                  }}
                                  onClick={() => handleOpenActionModal(currentSlot.booking_id)}
                                  title={`Đơn #${currentSlot.booking_id} | ${stateTitle} | ${isPaid ? 'ĐÃ THANH TOÁN (PAID)' : isDeposited ? 'ĐÃ CỌC' : 'CHƯA THU TIỀN'}`}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <span className="slot-badge-title">{stateTitle}</span>
                                    <span className="slot-meta" style={{ fontSize: '9px' }}>#{currentSlot.booking_id}</span>
                                  </div>

                                  {isPaid ? (
                                    <div style={{
                                      fontSize: '9px',
                                      fontWeight: '800',
                                      color: '#064e3b',
                                      background: '#bbf7d0',
                                      border: '1px solid #86efac',
                                      padding: '1px 3px',
                                      borderRadius: '4px',
                                      textAlign: 'center',
                                      marginTop: '2px',
                                      lineHeight: '1.2',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ✓ ĐÃ THANH TOÁN
                                    </div>
                                  ) : isDeposited ? (
                                    <div style={{
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      color: '#92400e',
                                      background: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      padding: '1px 3px',
                                      borderRadius: '4px',
                                      textAlign: 'center',
                                      marginTop: '2px',
                                      lineHeight: '1.2',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      💰 ĐÃ CỌC
                                    </div>
                                  ) : (
                                    <div style={{
                                      fontSize: '8px',
                                      color: '#991b1b',
                                      background: '#fee2e2',
                                      padding: '1px 3px',
                                      borderRadius: '4px',
                                      textAlign: 'center',
                                      marginTop: '2px',
                                      lineHeight: '1.2',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      Chưa thu
                                    </div>
                                  )}
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

        {/* BẢNG QUẢN LÝ VÀ THAO TÁC ĐƠN NHANH TRONG NGÀY CHO STAFF */}
        <div className="panel-card" style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                {filterByDate ? `⚡ Thao Tác Đơn Nhanh — Ngày ${selectedDate}` : '⚡ Thao Tác Đơn Nhanh — Toàn Hệ Thống'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {filterByDate
                  ? `Xử lý duyệt đơn, check-in đón khách, hoàn tất ca đá và thu tiền ngày ${selectedDate}`
                  : 'Tra cứu và xử lý toàn bộ danh sách đơn đặt trên toàn hệ thống'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Chọn ngày:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setFilterByDate(true);
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1.5px solid #059669',
                    outline: 'none',
                    color: '#064e3b',
                    fontWeight: 'bold',
                    background: '#f0fdf4'
                  }}
                />
              </div>

              {filterByDate ? (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
                  onClick={() => setFilterByDate(false)}
                >
                  🌐 Xem Toàn Bộ Đơn
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', color: '#059669', fontWeight: 'bold' }}
                  onClick={() => setFilterByDate(true)}
                >
                  📅 Lọc Theo Ngày ({selectedDate})
                </button>
              )}

              <button
                type="button"
                className="btn-action-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={fetchAvailability}
              >
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* THANH TÌM KIẾM VÀ LỌC TRẠNG THÁI */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Tìm nhanh: tên khách, SĐT, sân hoặc #Mã đơn..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'pending', label: '⏳ Chờ Duyệt' },
                { id: 'confirmed', label: '🟢 Đã Duyệt' },
                { id: 'checked_in', label: '🏃 Đang Đá' },
                { id: 'completed', label: '🏁 Hoàn Tất' },
                { id: 'cancelled', label: '❌ Đã Hủy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBookingFilterStatus(tab.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    border: bookingFilterStatus === tab.id ? '1.5px solid #059669' : '1px solid #e2e8f0',
                    background: bookingFilterStatus === tab.id ? '#ecfdf5' : '#ffffff',
                    color: bookingFilterStatus === tab.id ? '#064e3b' : '#64748b',
                    fontWeight: bookingFilterStatus === tab.id ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Mã</th>
                  <th>Khách Hàng</th>
                  <th>Sân Bóng</th>
                  <th>Khung Giờ Đá</th>
                  <th>Tiền Sân</th>
                  <th>Trạng Thái Ca</th>
                  <th style={{ minWidth: '120px' }}>Thanh Toán</th>
                  <th style={{ minWidth: '210px', textAlign: 'center' }}>Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const baseList = filterByDate
                    ? (allBookings.length > 0
                        ? allBookings.filter(b => b.booking_date && String(b.booking_date).slice(0, 10) === selectedDate)
                        : dayBookings)
                    : (allBookings.length > 0 ? allBookings : dayBookings);

                  const displayList = baseList.filter(b => {
                    if (bookingFilterStatus !== 'all' && b.status !== bookingFilterStatus) return false;
                    if (bookingSearch.trim()) {
                      const q = bookingSearch.trim().toLowerCase();
                      const matchId = String(b.id).includes(q);
                      const matchName = b.customer_name && b.customer_name.toLowerCase().includes(q);
                      const matchPhone = b.customer_phone && b.customer_phone.includes(q);
                      const matchPitch = b.pitch_name && b.pitch_name.toLowerCase().includes(q);
                      return matchId || matchName || matchPhone || matchPitch;
                    }
                    return true;
                  });

                  if (displayList.length === 0) {
                    return (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          {filterByDate
                            ? `Không có đơn nào trong ngày ${selectedDate} phù hợp với điều kiện tìm kiếm.`
                            : 'Không tìm thấy đơn nào trên hệ thống phù hợp với từ khóa.'}
                        </td>
                      </tr>
                    );
                  }

                  return displayList.map(b => (
                    <tr key={b.id}>
                      <td><b>#{b.id}</b></td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{b.customer_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {b.customer_phone}</div>
                      </td>
                      <td>
                        <b>{b.pitch_name}</b>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{b.pitch_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}</div>
                      </td>
                      <td>
                        <b style={{ color: '#059669', fontSize: '13px' }}>
                          {Number(b.total_price).toLocaleString('vi-VN')} đ
                        </b>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          background:
                            b.status === 'confirmed' ? '#ecfdf5' :
                            b.status === 'checked_in' ? '#f5f3ff' :
                            b.status === 'completed' ? '#f0fdf4' :
                            b.status === 'cancelled' ? '#fef2f2' : '#fffbeb',
                          color:
                            b.status === 'confirmed' ? '#059669' :
                            b.status === 'checked_in' ? '#7c3aed' :
                            b.status === 'completed' ? '#15803d' :
                            b.status === 'cancelled' ? '#dc2626' : '#d97706',
                          border:
                            b.status === 'confirmed' ? '1px solid #a7f3d0' :
                            b.status === 'checked_in' ? '1px solid #ddd6fe' :
                            b.status === 'completed' ? '1px solid #86efac' :
                            b.status === 'cancelled' ? '1px solid #fecaca' : '1px solid #fde68a'
                        }}>
                          {b.status === 'pending' && '⏳ Chờ duyệt'}
                          {b.status === 'confirmed' && '🟢 Đã duyệt'}
                          {b.status === 'checked_in' && '🏃 Đang đá'}
                          {b.status === 'completed' && '🏁 Hoàn tất'}
                          {b.status === 'cancelled' && '❌ Đã hủy'}
                        </span>
                      </td>
                      <td>
                        <select
                          value={b.payment_status || 'unpaid'}
                          onChange={(e) => handleDirectUpdatePayment(b.id, e.target.value)}
                          style={{
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            border: b.payment_status === 'paid' ? '1px solid #10b981' : b.payment_status === 'deposited' ? '1px solid #f59e0b' : '1px solid #ef4444',
                            background: b.payment_status === 'paid' ? '#ecfdf5' : b.payment_status === 'deposited' ? '#fffbeb' : '#fef2f2',
                            color: b.payment_status === 'paid' ? '#064e3b' : b.payment_status === 'deposited' ? '#b45309' : '#b91c1c',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="unpaid">Chưa thu</option>
                          <option value="deposited">Đã cọc</option>
                          <option value="paid">Đã trả 100%</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {b.status === 'pending' && (
                            <button
                              type="button"
                              className="btn-success"
                              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              onClick={() => handleDirectUpdateStatus(b.id, 'confirmed')}
                              title="Duyệt đơn này ngay"
                            >
                              ✓ Duyệt
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button
                              type="button"
                              className="btn-info"
                              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              onClick={() => handleDirectCheckin(b.id)}
                              title="Đón khách check-in vào sân"
                            >
                              🏃 Vào sân
                            </button>
                          )}
                          {b.status === 'checked_in' && (
                            <button
                              type="button"
                              className="btn-action-primary"
                              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              onClick={() => handleDirectUpdateStatus(b.id, 'completed')}
                              title="Kết thúc ca đá, hoàn tất đơn"
                            >
                              🏁 Hoàn tất
                            </button>
                          )}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button
                              type="button"
                              className="btn-danger"
                              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              onClick={() => handleDirectUpdateStatus(b.id, 'cancelled')}
                              title="Hủy đơn đặt sân này"
                            >
                              ✕ Hủy
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                            onClick={() => handleOpenActionModal(b.id)}
                            title="Mở chi tiết & thêm nước uống tiện ích"
                          >
                            🥤 Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

        {/* TAB 2: THƯ VIỆN ẢNH SÂN (PITCH GALLERY CHO NHÂN VIÊN) */}
        {activeTab === 'gallery' && (
          <div>
            <div className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="panel-title" style={{ margin: 0 }}>🖼️ Quản Lý Thư Viện Ảnh Góc Sân (Pitch Gallery)</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Nhân viên có thể chụp ảnh sân thực tế, tải ảnh góc sân lên thư viện để khách hàng xem
                  </p>
                </div>
              </div>

              <div className="pitches-cards-grid">
                {pitchesList.map(p => {
                  const isMaintenance = p.status === 'maintenance';
                  return (
                    <div
                      key={p.id}
                      className="pitch-item-card"
                      style={{
                        opacity: isMaintenance ? 0.75 : 1,
                        border: isMaintenance ? '2px dashed #f59e0b' : '1px solid #e2e8f0'
                      }}
                    >
                      <img src={p.avatar_url} alt={p.name} className="pitch-item-img" />
                      <div className="pitch-item-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="pitch-badge-tag">{p.type}</span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: isMaintenance ? '#fffbeb' : '#ecfdf5',
                            color: isMaintenance ? '#b45309' : '#059669'
                          }}>
                            {isMaintenance ? '🛠️ BẢO TRÌ' : '🟢 HOẠT ĐỘNG'}
                          </span>
                        </div>

                        <h4 style={{ margin: '8px 0 6px 0', fontSize: '16px' }}>{p.name}</h4>
                        <div style={{ color: '#059669', fontWeight: 'bold' }}>
                          {Number(p.price_default).toLocaleString('vi-VN')} đ / ca
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenGalleryModal(p)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              fontSize: '12px',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title="Tải lên hoặc quản lý các góc ảnh của sân này"
                          >
                            📷 Quản Lý Ảnh Góc Sân
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailPitchId(p.id)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            title="Xem chi tiết toàn bộ ảnh và nhận xét của khách"
                          >
                            🔍 Xem
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ & GÓP Ý TỪ KHÁCH HÀNG (REVIEWS CHO STAFF) */}
        {activeTab === 'reviews' && (
          <div>
            {/* THỐNG KÊ ĐÁNH GIÁ */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#fefce8', color: '#b45309' }}>⭐</div>
                <div>
                  <div className="stat-label">Điểm Sao Trung Bình</div>
                  <div className="stat-num">
                    {reviewsList.length > 0
                      ? (reviewsList.reduce((acc, r) => acc + Number(r.rating), 0) / reviewsList.length).toFixed(1)
                      : '5.0'} / 5.0
                  </div>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>💬</div>
                <div>
                  <div className="stat-label">Tổng Lượt Đánh Giá</div>
                  <div className="stat-num">{reviewsList.length}</div>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>🌟</div>
                <div>
                  <div className="stat-label">Đánh Giá Tuyệt Đối (5★)</div>
                  <div className="stat-num">
                    {reviewsList.filter(r => Number(r.rating) === 5).length}
                  </div>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
                <div>
                  <div className="stat-label">Khách Góp Ý Cần Sửa (≤3★)</div>
                  <div className="stat-num">
                    {reviewsList.filter(r => Number(r.rating) <= 3).length}
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG THEO DÕI ĐÁNH GIÁ */}
            <div className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="panel-title" style={{ margin: 0 }}>⭐ Ý Kiến & Đánh Giá Từ Khách Hàng</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Nhân viên trực ban theo dõi phản hồi để kịp thời bảo trì mặt sân, hệ thống đèn và phục vụ tốt hơn
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Lọc theo sân:</span>
                  <select
                    value={reviewFilterPitch}
                    onChange={(e) => setReviewFilterPitch(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#064e3b',
                      background: '#f0fdf4'
                    }}
                  >
                    <option value="all">🌐 Tất cả các sân ({reviewsList.length})</option>
                    {pitchesList.map(p => {
                      const count = reviewsList.filter(r => Number(r.pitch_id) === Number(p.id)).length;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({count} đánh giá)
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={fetchReviews}
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '8px' }}
                    title="Tải lại danh sách đánh giá mới nhất"
                  >
                    🔄 Làm mới
                  </button>
                </div>
              </div>

              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                  Đang tải danh sách đánh giá...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Mã</th>
                        <th style={{ minWidth: '110px' }}>Sân Bóng</th>
                        <th style={{ minWidth: '140px' }}>Khách Hàng</th>
                        <th style={{ minWidth: '120px' }}>Điểm Sao</th>
                        <th>Nội Dung Nhận Xét & Góp Ý Của Khách</th>
                        <th style={{ minWidth: '130px' }}>Thời Gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = reviewFilterPitch === 'all'
                          ? reviewsList
                          : reviewsList.filter(r => String(r.pitch_id) === String(reviewFilterPitch));

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                Chưa có nhận xét hay góp ý nào cho sân này.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(rev => (
                          <tr key={rev.id}>
                            <td style={{ fontWeight: 'bold', color: '#64748b' }}>#{rev.id}</td>
                            <td>
                              <span style={{
                                fontWeight: 'bold',
                                color: '#064e3b',
                                background: '#ecfdf5',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}>
                                ⚽ {rev.pitch_name}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{rev.customer_name}</div>
                              {rev.customer_phone && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {rev.customer_phone}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ color: '#f59e0b', fontSize: '15px', letterSpacing: '1px' }}>
                                {'★'.repeat(rev.rating)}
                                {'☆'.repeat(5 - rev.rating)}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309', marginLeft: '4px' }}>
                                ({rev.rating}★)
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                                {rev.comment ? rev.comment : <i style={{ color: '#94a3b8' }}>(Không có nhận xét chi tiết)</i>}
                              </div>
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {rev.created_at_formatted || 'Gần đây'}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL ĐẶT SÂN TẠI QUẦY (DESK BOOKING): TÍNH SẴN GIÁ TIỀN */}
      {deskModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>⚡ Đặt Sân Tại Quầy: {deskModal.pitchName}</h3>
              <button className="btn-close" onClick={() => setDeskModal({ ...deskModal, isOpen: false })}>&times;</button>
            </div>

            <form onSubmit={handleSubmitDeskBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label>Giờ bắt đầu:</label>
                  <select
                    value={deskModal.startTime}
                    onChange={(e) => setDeskModal({ ...deskModal, startTime: e.target.value })}
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
                    value={deskModal.duration}
                    onChange={(e) => setDeskModal({ ...deskModal, duration: Number(e.target.value) })}
                  >
                    <option value={60}>60 phút (1 tiếng - Tối thiểu)</option>
                    <option value={90}>90 phút (1.5 tiếng)</option>
                    <option value={120}>120 phút (2 tiếng)</option>
                    <option value={150}>150 phút (2.5 tiếng)</option>
                    <option value={180}>180 phút (3 tiếng)</option>
                  </select>
                </div>
              </div>

              {/* KHỐI TÍNH SẴN GIÁ TIỀN CHO STAFF */}
              <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', border: '1.5px solid #10b981', fontSize: '13px' }}>
                <div style={{ fontWeight: 'bold', color: '#064e3b', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📅 Ngày đá: {getDayOfWeekName(selectedDate)}, {formatDisplayDate(selectedDate)}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: deskEstimated.isWeekend ? '#fef3c7' : '#e0f2fe',
                    color: deskEstimated.isWeekend ? '#b45309' : '#0369a1',
                    fontWeight: 'bold',
                    border: deskEstimated.isWeekend ? '1px solid #fde68a' : '1px solid #bae6fd'
                  }}>
                    {deskEstimated.isWeekend ? '🏖️ Giá Cuối Tuần (T7/CN)' : '🏢 Giá Ngày Thường (T2-T6)'}
                  </span>
                </div>
                <div>Thời gian: <b>{deskModal.startTime}</b> &rarr; <b>{calculateEndTime(deskModal.startTime, deskModal.duration)}</b> ({deskModal.duration} phút)</div>
                <div style={{ color: '#047857', marginTop: '2px', fontSize: '12px' }}>
                  Ca: <b>{deskEstimated.shiftName}</b> ({deskEstimated.multiplierText}) | Giá gốc: {Number(deskModal.pitchPrice).toLocaleString('vi-VN')} đ/h
                </div>
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#064e3b' }}>TIỀN SÂN TẠM TÍNH:</span>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>
                    {deskEstimated.total.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Họ tên khách:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Anh Tuấn"
                  value={deskForm.customer_name}
                  onChange={(e) => setDeskForm({ ...deskForm, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 0912345678"
                  value={deskForm.customer_phone}
                  onChange={(e) => setDeskForm({ ...deskForm, customer_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Thu tiền ngay:</label>
                <select
                  value={deskForm.payment_status}
                  onChange={(e) => setDeskForm({ ...deskForm, payment_status: e.target.value })}
                >
                  <option value="unpaid">Chưa thu tiền</option>
                  <option value="deposited">Đã cọc</option>
                  <option value="paid">Đã trả 100%</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ghi chú:</label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={deskForm.note}
                  onChange={(e) => setDeskForm({ ...deskForm, note: e.target.value })}
                />
              </div>

              {/* CẢNH BÁO NẾU VI PHẠM QUY TẮC NGHIỆP VỤ BR-BOOKING-01 -> BR-BOOKING-05 */}
              {!deskValidation.isValid && (
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
                  ⚠️ {deskValidation.message}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setDeskModal({ ...deskModal, isOpen: false })}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-action-primary"
                  disabled={!deskValidation.isValid}
                  style={{
                    opacity: deskValidation.isValid ? 1 : 0.6,
                    cursor: deskValidation.isValid ? 'pointer' : 'not-allowed'
                  }}
                  title={!deskValidation.isValid ? deskValidation.message : ''}
                >
                  Lưu Đơn Tại Quầy ({deskEstimated.total.toLocaleString('vi-VN')} đ)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN */}
      {actionModal.isOpen && actionModal.bookingData && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Chi Tiết Đơn #{actionModal.bookingId}</h3>
              <button className="btn-close" onClick={() => setActionModal({ ...actionModal, isOpen: false })}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.8' }}>
                <div>Khách: <b>{actionModal.bookingData.customer_name}</b> ({actionModal.bookingData.customer_phone})</div>
                <div>Sân: <b>{actionModal.bookingData.pitch_name}</b></div>
                <div>Thời gian: <b>{actionModal.bookingData.start_time.slice(0, 5)} - {actionModal.bookingData.end_time.slice(0, 5)}</b> (Ngày {actionModal.bookingData.booking_date})</div>
                <div>Tiền sân: <b style={{ color: '#059669' }}>{Number(actionModal.bookingData.total_price).toLocaleString('vi-VN')} đ</b></div>
                <div>Trạng thái: <b style={{ textTransform: 'uppercase' }}>{actionModal.bookingData.status}</b></div>
                <div>Thanh toán: <b style={{ textTransform: 'uppercase' }}>{actionModal.bookingData.payment_status}</b></div>
              </div>

              {actionModal.bookingData.status === 'confirmed' && (
                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <QRCodeSVG value={`BOOKING_${actionModal.bookingData.id}`} size={100} />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>MÃ CHECK-IN</div>
                </div>
              )}
            </div>

            <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>🥤 Quầy Nước & Dịch Vụ Đi Kèm:</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <select
                  style={{ flex: 1 }}
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  {servicesList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {Number(s.price).toLocaleString('vi-VN')} đ / {s.unit}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  style={{ width: '70px' }}
                  value={serviceQty}
                  onChange={(e) => setServiceQty(e.target.value)}
                />

                <button type="button" className="btn-success" onClick={handleAddServiceToOrder}>
                  + Thêm
                </button>
              </div>

              {actionModal.servicesOrder.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {actionModal.servicesOrder.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 0' }}>{item.service_name}</td>
                          <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.total_item_price).toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', marginTop: '6px', fontWeight: 'bold', color: '#059669' }}>
                    Tiền tiện ích: {Number(actionModal.totalServiceAmount).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              )}

              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ecfdf5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>TỔNG THANH TOÁN (Sân + Nước):</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#064e3b' }}>
                  {(Number(actionModal.bookingData.total_price) + Number(actionModal.totalServiceAmount)).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Xử lý trạng thái ca đá:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {actionModal.bookingData.status === 'pending' && (
                  <button className="btn-success" onClick={() => handleUpdateStatus('confirmed')}>✓ Duyệt Đơn</button>
                )}
                {actionModal.bookingData.status === 'confirmed' && (
                  <button className="btn-info" onClick={handleCheckin}>🏃 Check-in Vào Sân</button>
                )}
                {actionModal.bookingData.status === 'checked_in' && (
                  <button className="btn-action-primary" onClick={() => handleUpdateStatus('completed')}>🏁 Hoàn Tất Ca Đá</button>
                )}
                {actionModal.bookingData.status !== 'cancelled' && actionModal.bookingData.status !== 'completed' && (
                  <button className="btn-danger" onClick={() => handleUpdateStatus('cancelled')}>✕ Hủy Đơn</button>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', margin: '12px 0 6px 0' }}>Cập nhật thanh toán:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => handleUpdatePayment('unpaid')}>Chưa thu</button>
                <button className="btn-secondary" onClick={() => handleUpdatePayment('deposited')}>Đã Cọc</button>
                <button className="btn-action-primary" onClick={() => handleUpdatePayment('paid')}>✓ Xác Nhận Đã Thanh Toán 100%</button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '18px' }}>
              <button className="btn-secondary" onClick={() => setActionModal({ ...actionModal, isOpen: false })}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ ẢNH MÔ TẢ GÓC SÂN (PITCH GALLERY) DÀNH CHO NHÂN VIÊN */}
      {galleryModal.isOpen && galleryModal.pitch && (
        <div className="modal-overlay" onClick={handleCloseGalleryModal}>
          <div
            className="modal-box"
            style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#064e3b' }}>
                  🖼️ Thư Viện Ảnh Mô Tả: {galleryModal.pitch.name || galleryModal.pitch.pitch_name} ({galleryModal.pitch.type || galleryModal.pitch.pitch_type})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Nhân viên trực ban cập nhật hình ảnh góc sân, khán đài, mặt cỏ nhân tạo thực tế
                </p>
              </div>
              <button className="btn-close" onClick={handleCloseGalleryModal}>&times;</button>
            </div>

            {/* DANH SÁCH CÁC ẢNH GÓC SÂN HIỆN CÓ */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                  Danh sách ảnh góc sân hiện có ({galleryModal.images.length}):
                </h4>
              </div>

              {galleryModal.loading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#059669' }}>
                  Đang tải danh sách ảnh...
                </div>
              ) : galleryModal.images.length === 0 ? (
                <div style={{
                  padding: '24px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                  border: '1px dashed #cbd5e1'
                }}>
                  Chưa có ảnh mô tả nào cho sân này. Hãy chọn ảnh bên dưới để tải lên!
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {galleryModal.images.map((img) => (
                    <div
                      key={img.id}
                      style={{
                        position: 'relative',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ height: '130px', background: '#0f172a', overflow: 'hidden' }}>
                        <img
                          src={img.image_url}
                          alt={img.caption || 'Góc sân'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={img.caption || 'Góc sân'}>
                          {img.caption || 'Ảnh góc sân'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePitchImage(img.id)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                          title="Xóa ảnh này khỏi thư viện"
                        >
                          ✕ Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

            {/* FORM TẢI ẢNH MỚI */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#064e3b' }}>
                ➕ Tải Thêm Ảnh Góc Sân Mới:
              </h4>

              <form onSubmit={handleAddPitchImage}>
                {/* LỰA CHỌN PHƯƠNG THỨC TẢI */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="staffUploadMethod"
                      checked={galleryForm.uploadMethod === 'file'}
                      onChange={() => setGalleryForm({ ...galleryForm, uploadMethod: 'file' })}
                    />
                    📁 Chọn file từ máy tính / điện thoại
                  </label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="staffUploadMethod"
                      checked={galleryForm.uploadMethod === 'url'}
                      onChange={() => setGalleryForm({ ...galleryForm, uploadMethod: 'url' })}
                    />
                    🔗 Nhập liên kết (URL ảnh)
                  </label>
                </div>

                {galleryForm.uploadMethod === 'file' ? (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryFileChange}
                      style={{ padding: '6px' }}
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <input
                      type="url"
                      placeholder="https://example.com/anh-goc-san.jpg"
                      value={galleryForm.imageUrl}
                      onChange={(e) => setGalleryForm({ ...galleryForm, imageUrl: e.target.value })}
                      style={{ padding: '8px 12px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                )}

                {/* XEM TRƯỚC ẢNH NẾU CÓ */}
                {(galleryForm.imagePreview || (galleryForm.uploadMethod === 'url' && galleryForm.imageUrl)) && (
                  <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <img
                      src={galleryForm.imagePreview || galleryForm.imageUrl}
                      alt="Xem trước"
                      style={{ maxHeight: '110px', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Ghi chú góc chụp (Caption):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Góc nhìn từ khung thành A, Khán đài, Hệ thống đèn đêm..."
                    value={galleryForm.caption}
                    onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })}
                    style={{ padding: '8px 12px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCloseGalleryModal}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={galleryUploading}
                    className="btn-action-primary"
                    style={{ padding: '8px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {galleryUploading ? 'Đang tải lên...' : '🚀 Tải Lên Thư Viện'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XEM CHI TIẾT SÂN, ẢNH GÓC SÂN & ĐÁNH GIÁ CHO NHÂN VIÊN */}
      <PitchDetailModal
        pitchId={selectedDetailPitchId}
        isOpen={Boolean(selectedDetailPitchId)}
        onClose={() => setSelectedDetailPitchId(null)}
      />
    </div>
  );
}

export default StaffDashboard;