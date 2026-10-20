import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import WeekStrip from '../components/WeekStrip';
import axiosClient from '../api/axiosClient';
import { useConfirm } from '../context/ConfirmContext';

function AdminDashboard() {
  const navigate = useNavigate();
  const { confirm, showAlert } = useConfirm();
  const [activeTab, setActiveTab] = useState('overview'); // overview | pitches | timerules | staff | services

  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, pendingCount: 0 });
  const [pitches, setPitches] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [timeRules, setTimeRules] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(false);

  // Bộ lọc và tìm kiếm thao tác đơn nhanh cho Admin
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    bookingId: null,
    bookingData: null,
    servicesOrder: [],
    totalServiceAmount: 0
  });

  // State chỉnh sửa hệ số khung giờ (Ngày thường & Cuối tuần T7/CN)
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ price_multiplier: 1.0, weekend_multiplier: 1.0, note: '' });

  // State thêm / sửa sân (hỗ trợ chọn file từ máy tính)
  const [editingPitch, setEditingPitch] = useState(null);
  const [pitchForm, setPitchForm] = useState({
    name: '',
    type: 'Sân 5',
    price_default: 250000
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // State quản lý đánh giá & góp ý (Review Management)
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilterPitch, setReviewFilterPitch] = useState('all');

  // State Modal quản lý ảnh mô tả (Pitch Gallery)
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

  // Danh mục 4 ca trực ban chính
  const shiftDefinitions = [
    { id: 'sang', label: 'Ca Sáng', time: '05:00 - 11:00', fullName: 'Ca Sáng (05:00 - 11:00)' },
    { id: 'chieu', label: 'Ca Chiều', time: '14:00 - 18:00', fullName: 'Ca Chiều (14:00 - 18:00)' },
    { id: 'toi', label: 'Ca Tối - Giờ Vàng', time: '18:00 - 22:00', fullName: 'Ca Tối - Giờ Vàng (18:00 - 22:00)' },
    { id: 'dem', label: 'Ca Đêm Muộn', time: '22:00 - 23:00', fullName: 'Ca Đêm Muộn (22:00 - 23:00)' }
  ];

  const [staffForm, setStaffForm] = useState({
    username: '',
    password: '',
    full_name: '',
    selectedShifts: ['Ca Sáng (05:00 - 11:00)']
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'drink',
    price: 15000,
    unit: 'chai'
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [resBookings, resPitches, resServices, resStaff, resRules] = await Promise.all([
        axiosClient.get('/bookings'),
        axiosClient.get('/pitches?all=true'),
        axiosClient.get('/services'),
        axiosClient.get('/auth/staff'),
        axiosClient.get('/pitches/time-rules')
      ]);

      if (resBookings.data.success) {
        const list = resBookings.data.data;
        const total = list.length;
        const pending = list.filter(b => b.status === 'pending').length;
        const revenue = list
          .filter(b => b.status !== 'cancelled')
          .reduce((sum, b) => sum + Number(b.total_price), 0);

        setStats({ totalBookings: total, totalRevenue: revenue, pendingCount: pending });
        setAllBookings(list);
        setRecentBookings(list.slice(0, 8));
      }

      if (resPitches.data.success) setPitches(resPitches.data.data);
      if (resServices.data.success) setServices(resServices.data.data);
      if (resStaff.data.success) setStaffList(resStaff.data.data);
      if (resRules.data.success) setTimeRules(resRules.data.data);

      // Tải danh sách đánh giá
      fetchReviews();
    } catch (err) {
      console.error('Lỗi tải dữ liệu admin:', err);
    }
  };

  // Tải danh sách toàn bộ đánh giá của các sân
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

  // Xóa đánh giá của khách hàng (Admin)
  const handleDeleteReview = async (reviewId, customerName) => {
    const ok = await confirm({
      title: 'Xóa đánh giá & góp ý',
      message: `Bạn có chắc muốn xóa nhận xét của khách "${customerName}" không? Hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa vĩnh viễn'
    });
    if (!ok) return;

    try {
      const res = await axiosClient.delete(`/pitches/reviews/${reviewId}`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: 'Đã xóa đánh giá thành công!', type: 'success' });
        fetchReviews();
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi xóa đánh giá.',
        type: 'danger'
      });
    }
  };

  // Mở modal quản lý ảnh mô tả của sân (Pitch Gallery)
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
      const res = await axiosClient.get(`/pitches/${pitch.id}`);
      if (res.data.success) {
        setGalleryModal(prev => ({
          ...prev,
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
    if (!galleryModal.pitch) return;

    if (galleryForm.uploadMethod === 'file' && !galleryForm.imageFile) {
      await showAlert({ title: 'Thiếu ảnh', message: 'Vui lòng chọn một file ảnh từ máy tính.', type: 'warning' });
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

      const res = await axiosClient.post(`/pitches/${galleryModal.pitch.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: 'Đã thêm ảnh mô tả thành công!', type: 'success' });
        setGalleryForm({
          caption: '',
          imageFile: null,
          imagePreview: null,
          imageUrl: '',
          uploadMethod: 'file'
        });
        // Tải lại danh sách ảnh sân
        const refresh = await axiosClient.get(`/pitches/${galleryModal.pitch.id}`);
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

    try {
      const res = await axiosClient.delete(`/pitches/${galleryModal.pitch.id}/images/${imageId}`);
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

  // CÁC THAO TÁC ĐƠN NHANH CHO ADMIN
  const handleQuickStatus = async (bookingId, status) => {
    let title = 'Xác nhận đổi trạng thái';
    let message = `Bạn có chắc muốn đổi trạng thái đơn #${bookingId} thành ${status}?`;
    let type = 'primary';
    let confirmText = 'Xác nhận';

    if (status === 'cancelled') {
      title = 'Hủy đơn đặt sân';
      message = `Bạn có chắc chắn muốn HỦY đơn đặt sân #${bookingId}? Hành động này sẽ giải phóng khung giờ trên sân.`;
      type = 'danger';
      confirmText = 'Hủy đơn ngay';
    } else if (status === 'confirmed') {
      title = 'Duyệt đơn đặt sân';
      message = `Xác nhận DUYỆT đơn đặt sân #${bookingId} cho khách hàng?`;
      type = 'success';
      confirmText = 'Duyệt đơn';
    } else if (status === 'completed') {
      title = 'Hoàn tất ca đá';
      message = `Xác nhận ca đá #${bookingId} đã HOÀN THÀNH tốt đẹp?`;
      type = 'success';
      confirmText = 'Hoàn tất ca';
    }

    const ok = await confirm({ title, message, type, confirmText });
    if (!ok) return;

    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchDashboardData();
        if (detailModal.isOpen && detailModal.bookingId === bookingId) {
          setDetailModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, status }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi cập nhật trạng thái đơn.',
        type: 'danger'
      });
    }
  };

  const handleQuickCheckin = async (bookingId) => {
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
        fetchDashboardData();
        if (detailModal.isOpen && detailModal.bookingId === bookingId) {
          setDetailModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, status: 'checked_in' }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi check-in.',
        type: 'danger'
      });
    }
  };

  const handleQuickPayment = async (bookingId, payment_status) => {
    try {
      const res = await axiosClient.patch(`/bookings/${bookingId}/payment`, { payment_status });
      if (res.data.success) {
        await showAlert({
          title: 'Cập nhật thanh toán',
          message: `Đã cập nhật thanh toán đơn #${bookingId}: ${payment_status === 'paid' ? 'Đã thanh toán 100%' : payment_status === 'deposited' ? 'Đã cọc' : 'Chưa thanh toán'}`,
          type: 'success'
        });
        fetchDashboardData();
        if (detailModal.isOpen && detailModal.bookingId === bookingId) {
          setDetailModal(prev => ({
            ...prev,
            bookingData: { ...prev.bookingData, payment_status }
          }));
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi thanh toán',
        message: err.response?.data?.message || 'Lỗi cập nhật thanh toán.',
        type: 'danger'
      });
    }
  };

  const handleOpenDetailModal = async (bookingId) => {
    try {
      const resDetail = await axiosClient.get(`/bookings/${bookingId}`);
      if (resDetail.data.success) {
        const b = resDetail.data.data;
        setDetailModal({
          isOpen: true,
          bookingId,
          bookingData: b,
          servicesOrder: b.services || [],
          totalServiceAmount: b.total_service_amount || 0
        });
      }
    } catch (err) {
      await showAlert({
        title: 'Lỗi tải đơn',
        message: err.response?.data?.message || 'Lỗi khi tải chi tiết đơn.',
        type: 'danger'
      });
    }
  };

  // Xử lý chọn file ảnh từ máy
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Bắt đầu sửa sân bóng
  const handleEditPitch = (pitch) => {
    setEditingPitch(pitch);
    setPitchForm({
      name: pitch.name,
      type: pitch.type,
      price_default: pitch.price_default
    });
    setImageFile(null);
    setImagePreview(pitch.avatar_url || null);

    // Scroll nhẹ đến form
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Hủy sửa sân bóng, quay lại form thêm
  const handleCancelEditPitch = () => {
    setEditingPitch(null);
    setPitchForm({
      name: '',
      type: 'Sân 5',
      price_default: 250000
    });
    setImageFile(null);
    setImagePreview(null);
  };

  // Thêm hoặc cập nhật sân bóng dạng FormData (multipart/form-data)
  const handleSubmitPitch = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', pitchForm.name);
      formData.append('type', pitchForm.type);
      formData.append('price_default', pitchForm.price_default);
      if (imageFile) {
        formData.append('avatar', imageFile);
      }

      if (editingPitch) {
        // CẬP NHẬT SÂN ĐÃ CÓ
        const res = await axiosClient.put(`/pitches/${editingPitch.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.data.success) {
          await showAlert({
            title: 'Thành công',
            message: res.data.message || 'Cập nhật thông tin sân bóng thành công!',
            type: 'success'
          });
          handleCancelEditPitch();
          fetchDashboardData();
        }
      } else {
        // TẠO SÂN MỚI
        const res = await axiosClient.post('/pitches', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.data.success) {
          await showAlert({
            title: 'Thành công',
            message: 'Thêm sân bóng mới thành công!',
            type: 'success'
          });
          handleCancelEditPitch();
          fetchDashboardData();
        }
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi lưu thông tin sân.',
        type: 'danger'
      });
    }
  };

  // Xóa sân bóng
  const handleDeletePitch = async (pitchId, pitchName) => {
    const ok = await confirm({
      title: 'Xóa sân bóng',
      message: `Bạn có chắc chắn muốn xóa sân "${pitchName}" không? Hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: 'Xóa sân',
    });
    if (!ok) return;

    try {
      const res = await axiosClient.delete(`/pitches/${pitchId}`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi xóa sân.',
        type: 'danger',
      });
    }
  };

  // Bật/tắt bảo trì
  const handleTogglePitchStatus = async (pitchId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'maintenance' : 'active';
    const isMaintenance = nextStatus === 'maintenance';

    const ok = await confirm({
      title: isMaintenance ? 'Chuyển sang bảo trì' : 'Mở lại hoạt động sân',
      message: isMaintenance
        ? 'Chuyển sân này sang BẢO TRÌ? (Khung giờ sẽ bị khóa không cho khách đặt)'
        : 'Đưa sân này trở lại trạng thái HOẠT ĐỘNG bình thường?',
      type: isMaintenance ? 'warning' : 'success',
      confirmText: isMaintenance ? 'Bật bảo trì' : 'Kích hoạt lại',
    });

    if (!ok) return;

    try {
      const res = await axiosClient.patch(`/pitches/${pitchId}/status`, { status: nextStatus });
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi cập nhật trạng thái sân.',
        type: 'danger',
      });
    }
  };

  // Chỉnh sửa hệ số khung giờ
  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      price_multiplier: rule.price_multiplier,
      weekend_multiplier: rule.weekend_multiplier !== undefined && rule.weekend_multiplier !== null
        ? rule.weekend_multiplier
        : rule.price_multiplier,
      note: rule.note || ''
    });
  };

  // Lưu hệ số khung giờ (Ngày thường & Cuối tuần T7/CN)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const res = await axiosClient.put(`/pitches/time-rules/${editingRule.id}`, {
        price_multiplier: Number(ruleForm.price_multiplier),
        weekend_multiplier: Number(ruleForm.weekend_multiplier),
        note: ruleForm.note
      });

      if (res.data.success) {
        await showAlert({
          title: 'Thành công',
          message: res.data.message || 'Cập nhật hệ số khung giờ thành công!',
          type: 'success'
        });
        setEditingRule(null);
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi cập nhật hệ số khung giờ.',
        type: 'danger'
      });
    }
  };

  // Tạo nhân viên mới
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const shiftStr = staffForm.selectedShifts.length > 0
        ? staffForm.selectedShifts.join(', ')
        : 'Vắng mặt / Nghỉ';

      const res = await axiosClient.post('/auth/create-staff', {
        username: staffForm.username,
        password: staffForm.password,
        full_name: staffForm.full_name,
        shift_assigned: shiftStr
      });

      if (res.data.success) {
        await showAlert({
          title: 'Thành công',
          message: 'Tạo tài khoản nhân viên thành công!',
          type: 'success'
        });
        setStaffForm({
          username: '',
          password: '',
          full_name: '',
          selectedShifts: ['Ca Sáng (05:00 - 11:00)']
        });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi tạo nhân viên.',
        type: 'danger'
      });
    }
  };

  // Xóa nhân viên
  const handleDeleteStaff = async (staffId, staffName) => {
    const ok = await confirm({
      title: 'Xóa tài khoản nhân viên',
      message: `Bạn có chắc chắn muốn xóa nhân viên "${staffName}" không? Nhân viên này sẽ không thể đăng nhập vào hệ thống nữa.`,
      type: 'danger',
      confirmText: 'Xóa nhân viên',
    });
    if (!ok) return;

    try {
      const res = await axiosClient.delete(`/auth/staff/${staffId}`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi xóa nhân viên.',
        type: 'danger',
      });
    }
  };

  // Bật/tắt ca trực ban cho nhân viên (Hỗ trợ trực nhiều ca)
  const handleToggleStaffShift = async (staffId, currentShiftStr, targetShiftName) => {
    try {
      let currentShifts = [];
      if (currentShiftStr && currentShiftStr !== 'Vắng mặt / Nghỉ') {
        currentShifts = currentShiftStr.split(',').map(s => s.trim()).filter(Boolean);
      }

      let updatedShifts;
      if (currentShifts.includes(targetShiftName)) {
        // Nếu đã có thì bỏ chọn
        updatedShifts = currentShifts.filter(s => s !== targetShiftName);
      } else {
        // Chưa có thì thêm ca vào
        updatedShifts = [...currentShifts, targetShiftName];
      }

      const finalShiftStr = updatedShifts.length > 0 ? updatedShifts.join(', ') : 'Vắng mặt / Nghỉ';

      const res = await axiosClient.patch(`/auth/staff/${staffId}/shift`, {
        shift_assigned: finalShiftStr
      });

      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi cập nhật ca trực.',
        type: 'danger',
      });
    }
  };

  // Thêm dịch vụ
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/services', serviceForm);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: 'Thêm món tiện ích thành công!', type: 'success' });
        setServiceForm({ name: '', category: 'drink', price: 15000, unit: 'chai' });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi thêm tiện ích.',
        type: 'danger',
      });
    }
  };

  // Xóa dịch vụ
  const handleDeleteService = async (serviceId, serviceName) => {
    const ok = await confirm({
      title: 'Xóa món dịch vụ',
      message: `Bạn có chắc muốn xóa món "${serviceName}" khỏi quầy không?`,
      type: 'danger',
      confirmText: 'Xóa món',
    });
    if (!ok) return;

    try {
      const res = await axiosClient.delete(`/services/${serviceId}`);
      if (res.data.success) {
        await showAlert({ title: 'Thành công', message: res.data.message, type: 'success' });
        fetchDashboardData();
      }
    } catch (err) {
      await showAlert({
        title: 'Có lỗi xảy ra',
        message: err.response?.data?.message || 'Lỗi khi xóa tiện ích.',
        type: 'danger',
      });
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {/* TABS */}
        <div className="tab-row">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Tổng Quan
          </button>
          <button className={`tab-btn ${activeTab === 'pitches' ? 'active' : ''}`} onClick={() => setActiveTab('pitches')}>
            ⚽ Quản Lý Sân ({pitches.length})
          </button>
          <button className={`tab-btn ${activeTab === 'timerules' ? 'active' : ''}`} onClick={() => setActiveTab('timerules')}>
            ⏰ Hệ Số Khung Giờ ({timeRules.length})
          </button>
          <button className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
            👤 Quản Lý Nhân Viên ({staffList.length})
          </button>
          <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            🥤 Quầy Nước & Tiện Ích ({services.length})
          </button>
          <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => { setActiveTab('reviews'); fetchReviews(); }}>
            ⭐ Đánh Giá & Góp Ý ({reviewsList.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>💰</div>
                <div>
                  <div className="stat-label">Doanh Thu Tiền Sân</div>
                  <div className="stat-num">{stats.totalRevenue.toLocaleString('vi-VN')} đ</div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>📅</div>
                <div>
                  <div className="stat-label">Tổng Lượt Đặt</div>
                  <div className="stat-num">{stats.totalBookings}</div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>⏳</div>
                <div>
                  <div className="stat-label">Đơn Chờ Duyệt</div>
                  <div className="stat-num">{stats.pendingCount}</div>
                </div>
              </div>
            </div>

            {/* THANH CHỌN THỨ TRONG TUẦN (THỨ 2 - CHỦ NHẬT) CHO ADMIN */}
            <WeekStrip
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                setFilterByDate(true);
              }}
              allowPast={true}
              title="Tra Cứu Đơn Đặt Theo Tuần"
              subtitle="Bấm chọn nhanh từ Thứ 2 đến Chủ Nhật để lọc danh sách đơn đặt trên toàn hệ thống"
            />

            <div className="panel-card">
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
                      ? `Quản lý, duyệt đơn, check-in, hủy hoặc đổi thanh toán cho ngày ${selectedDate}`
                      : 'Quản lý toàn bộ danh sách đơn đặt trên hệ thống với thao tác 1-click'}
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

                  {filterByDate && (
                    <button
                      type="button"
                      onClick={() => setFilterByDate(false)}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
                    >
                      🌐 Xem Toàn Bộ Đơn
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/staff')}
                    className="btn-action-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px' }}
                  >
                    ⚽ Mở Sơ Đồ Lịch Sân (Ma Trận 30p)
                  </button>
                </div>
              </div>

              {/* BỘ LỌC TRẠNG THÁI & TÌM KIẾM NHANH */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm nhanh: tên khách, SĐT, sân bóng hoặc #Mã đơn..."
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
                      <th>Thời Gian Đá</th>
                      <th>Tiền Sân</th>
                      <th>Trạng Thái Ca</th>
                      <th style={{ minWidth: '120px' }}>Thanh Toán</th>
                      <th style={{ minWidth: '210px', textAlign: 'center' }}>Thao Tác Nhanh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const baseList = filterByDate
                        ? allBookings.filter(b => {
                            if (!b.booking_date) return false;
                            const bDate = String(b.booking_date).slice(0, 10);
                            return bDate === selectedDate;
                          })
                        : allBookings;

                      const displayList = baseList.filter(b => {
                        if (bookingFilterStatus !== 'all' && b.status !== bookingFilterStatus) return false;
                        if (bookingSearch.trim()) {
                          const q = bookingSearch.trim().toLowerCase();
                          const matchId = String(b.id).includes(q);
                          const matchName = b.customer_name && b.customer_name.toLowerCase().includes(q);
                          const matchPhone = b.customer_phone && b.customer_phone.includes(q);
                          const matchPitch = b.pitch_name && b.pitch_name.toLowerCase().includes(q);
                          const matchDate = b.booking_date && String(b.booking_date).includes(q);
                          return matchId || matchName || matchPhone || matchPitch || matchDate;
                        }
                        return true;
                      });

                      if (displayList.length === 0) {
                        return (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              Không tìm thấy đơn đặt sân nào phù hợp với bộ lọc.
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
                            <div style={{ fontSize: '11px', color: '#64748b' }}>📅 {b.booking_date}</div>
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
                              onChange={(e) => handleQuickPayment(b.id, e.target.value)}
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
                                  onClick={() => handleQuickStatus(b.id, 'confirmed')}
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
                                  onClick={() => handleQuickCheckin(b.id)}
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
                                  onClick={() => handleQuickStatus(b.id, 'completed')}
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
                                  onClick={() => handleQuickStatus(b.id, 'cancelled')}
                                  title="Hủy đơn đặt sân này"
                                >
                                  ✕ Hủy
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                                onClick={() => handleOpenDetailModal(b.id)}
                                title="Xem chi tiết đơn và dịch vụ đi kèm"
                              >
                                🔍 Chi tiết
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

        {/* TAB 2: PITCHES (CÓ CHỨC NĂNG UPLOAD ẢNH TỪ MÁY TÍNH) */}
        {activeTab === 'pitches' && (
          <div>
            <div className="panel-card">
              <h3 className="panel-title" style={{ marginBottom: '14px' }}>⚽ Danh Sách Sân Bóng</h3>
              <div className="pitches-cards-grid">
                {pitches.map(p => {
                  const isMaintenance = p.status === 'maintenance';
                  return (
                    <div key={p.id} className="pitch-item-card" style={{ opacity: isMaintenance ? 0.75 : 1, border: isMaintenance ? '2px dashed #f59e0b' : '1px solid #e2e8f0' }}>
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
                            {isMaintenance ? '🛠️ ĐANG BẢO TRÌ' : '🟢 ĐANG HOẠT ĐỘNG'}
                          </span>
                        </div>

                        <h4 style={{ margin: '8px 0 6px 0', fontSize: '16px' }}>{p.name}</h4>
                        <div style={{ color: '#059669', fontWeight: 'bold' }}>{Number(p.price_default).toLocaleString('vi-VN')} đ / giờ</div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenGalleryModal(p)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              fontSize: '12px',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            title="Quản lý thư viện ảnh mô tả của sân này"
                          >
                            🖼️ Quản Lý Ảnh Góc Sân (Gallery)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPitch(p)}
                            style={{
                              flex: 1,
                              padding: '7px 10px',
                              fontSize: '12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            title="Chỉnh sửa thông tin sân này"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePitchStatus(p.id, p.status)}
                            style={{
                              padding: '7px 10px',
                              fontSize: '12px',
                              backgroundColor: isMaintenance ? '#10b981' : '#f59e0b',
                              color: 'white',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {isMaintenance ? '✅ Mở' : '🛠️ Bảo Trì'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePitch(p.id, p.name)}
                            style={{
                              padding: '7px 10px',
                              fontSize: '12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORM THÊM / CẬP NHẬT SÂN BÓNG */}
            <div className="panel-card" style={{ maxWidth: '540px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title">
                  {editingPitch ? `✏️ Chỉnh Sửa Sân: ${editingPitch.name}` : '➕ Thêm Sân Mới (Chọn Ảnh Từ Máy)'}
                </h3>
                {editingPitch && (
                  <button
                    type="button"
                    onClick={handleCancelEditPitch}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Hủy sửa
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitPitch} style={{ marginTop: '14px' }}>
                <div className="form-group">
                  <label>Tên sân:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Sân 5 - Số 4"
                    value={pitchForm.name}
                    onChange={(e) => setPitchForm({ ...pitchForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Loại sân:</label>
                  <select value={pitchForm.type} onChange={(e) => setPitchForm({ ...pitchForm, type: e.target.value })}>
                    <option value="Sân 5">Sân 5 người</option>
                    <option value="Sân 7">Sân 7 người</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Giá cơ bản (VNĐ / giờ):</label>
                  <input
                    type="number"
                    required
                    value={pitchForm.price_default}
                    onChange={(e) => setPitchForm({ ...pitchForm, price_default: e.target.value })}
                  />
                </div>

                {/* INPUT CHỌN FILE ẢNH TỪ MÁY */}
                <div className="form-group">
                  <label>
                    {editingPitch ? 'Thay đổi ảnh đại diện (Để trống nếu giữ nguyên):' : 'Chọn ảnh đại diện từ máy tính:'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ padding: '6px' }}
                  />
                </div>

                {/* XEM TRƯỚC ẢNH VỪA CHỌN */}
                {imagePreview && (
                  <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Ảnh xem trước:</p>
                    <img
                      src={imagePreview}
                      alt="Xem trước"
                      style={{
                        width: '100%',
                        maxHeight: '180px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-action-primary" style={{ flex: 1 }}>
                    {editingPitch ? '💾 Cập Nhật Sân Bóng' : '➕ Lưu & Thêm Sân'}
                  </button>
                  {editingPitch && (
                    <button
                      type="button"
                      onClick={handleCancelEditPitch}
                      className="btn-secondary"
                    >
                      Hủy Bỏ
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: TIME RULES */}
        {activeTab === 'timerules' && (
          <div>
            <div className="panel-card">
              <h3 className="panel-title" style={{ marginBottom: '6px' }}>⏰ Cấu Hình Hệ Số Giá Theo Khung Giờ</h3>
              <p className="panel-subtitle" style={{ marginBottom: '16px' }}>
                Hệ số giá sẽ nhân trực tiếp với đơn giá sân khi khách hàng hoặc nhân viên đặt sân. Hệ số tự động phân biệt giữa <b>Ngày thường (T2 - T6)</b> và <b>Cuối tuần (Thứ 7 & Chủ Nhật)</b>.
              </p>

              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Ca</th>
                    <th>Tên Ca Trực / Khung Giờ</th>
                    <th>Khoảng Thời Gian</th>
                    <th style={{ textAlign: 'center' }}>Hệ Số Ngày Thường (T2 - T6)</th>
                    <th style={{ textAlign: 'center' }}>Hệ Số Cuối Tuần (T7 & CN)</th>
                    <th>Ghi Chú Mô Tả</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRules.map(r => (
                    <tr key={r.id}>
                      <td><b>#{r.id}</b></td>
                      <td><b>{r.shift_name}</b></td>
                      <td><code>{r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}</code></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          fontWeight: '800',
                          fontSize: '13px',
                          border: '1px solid #a7f3d0'
                        }}>
                          x{r.price_multiplier}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontWeight: '800',
                          fontSize: '13px',
                          border: '1px solid #fde68a'
                        }}>
                          x{r.weekend_multiplier !== undefined && r.weekend_multiplier !== null ? r.weekend_multiplier : r.price_multiplier}
                        </span>
                      </td>
                      <td>{r.note || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-info"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleEditRule(r)}
                        >
                          ✏️ Chỉnh Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingRule && (
              <div className="panel-card" style={{ maxWidth: '520px', border: '2px solid #10b981' }}>
                <h3 className="panel-title">✏️ Chỉnh Sửa Hệ Số: {editingRule.shift_name}</h3>
                <form onSubmit={handleSaveRule} style={{ marginTop: '14px' }}>
                  <div className="form-group">
                    <label>Khung giờ áp dụng:</label>
                    <input type="text" disabled value={`${editingRule.start_time.slice(0, 5)} - ${editingRule.end_time.slice(0, 5)}`} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Hệ số Ngày thường (T2 - T6):</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        required
                        value={ruleForm.price_multiplier}
                        onChange={(e) => setRuleForm({ ...ruleForm, price_multiplier: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Hệ số Cuối tuần (T7 & CN):</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        required
                        value={ruleForm.weekend_multiplier}
                        onChange={(e) => setRuleForm({ ...ruleForm, weekend_multiplier: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ghi chú mô tả ca:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Giờ cao điểm cuối tuần..."
                      value={ruleForm.note}
                      onChange={(e) => setRuleForm({ ...ruleForm, note: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="submit" className="btn-action-primary">
                      💾 Lưu Cấu Hình Hệ Số
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingRule(null)}>
                      Hủy Bỏ
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STAFF */}
        {activeTab === 'staff' && (
          <div>
            <div className="panel-card">
              <h3 className="panel-title" style={{ marginBottom: '6px' }}>👥 Danh Sách Nhân Viên Trực Ban</h3>
              <p className="panel-subtitle" style={{ marginBottom: '16px' }}>
                Admin có thể <b>gán 1 hoặc nhiều ca trực cùng lúc</b> cho mỗi nhân viên bằng cách bấm vào các huy hiệu ca bên dưới.
              </p>

              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Mã NV</th>
                    <th style={{ width: '180px' }}>Họ Và Tên</th>
                    <th style={{ width: '130px' }}>Tài Khoản</th>
                    <th>Ca Trực Phân Công (Bấm để gán / bỏ ca trực)</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(st => {
                    const assignedStr = st.shift_assigned || '';
                    const isAbsent = !assignedStr || assignedStr === 'Vắng mặt / Nghỉ';

                    return (
                      <tr key={st.id}>
                        <td><b>#{st.id}</b></td>
                        <td><b>{st.full_name}</b></td>
                        <td><code>{st.username}</code></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {shiftDefinitions.map(def => {
                              const isChecked = assignedStr.includes(def.label) || assignedStr.includes(def.fullName);
                              return (
                                <button
                                  key={def.id}
                                  type="button"
                                  onClick={() => handleToggleStaffShift(st.id, assignedStr, def.fullName)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: isChecked ? '700' : '500',
                                    cursor: 'pointer',
                                    border: isChecked ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                                    backgroundColor: isChecked ? '#ecfdf5' : '#f8fafc',
                                    color: isChecked ? '#064e3b' : '#64748b',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={`Bấm để ${isChecked ? 'hủy' : 'thêm'} ca ${def.label} (${def.time})`}
                                >
                                  <span>{isChecked ? '✓' : '+'}</span>
                                  <span>{def.label}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.85 }}>({def.time})</span>
                                </button>
                              );
                            })}

                            {isAbsent && (
                              <span style={{
                                fontSize: '11px',
                                color: '#ef4444',
                                fontStyle: 'italic',
                                paddingLeft: '4px'
                              }}>
                                (Chưa xếp ca / Vắng mặt)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(st.id, st.full_name)}
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              padding: '6px 12px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Xóa NV
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {staffList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        Chưa có tài khoản nhân viên nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="panel-card" style={{ maxWidth: '560px' }}>
              <h3 className="panel-title">➕ Cấp Tài Khoản Nhân Viên Mới</h3>
              <form onSubmit={handleCreateStaff} style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Họ và tên nhân viên:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Trực Ban"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Tên đăng nhập (Username):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: staff2"
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Mật khẩu:</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu..."
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Chọn các ca trực phân công (có thể chọn nhiều ca):</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '6px' }}>
                    {shiftDefinitions.map(def => {
                      const isChecked = staffForm.selectedShifts.includes(def.fullName);
                      return (
                        <label
                          key={def.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                            backgroundColor: isChecked ? '#ecfdf5' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: isChecked ? '#064e3b' : '#334155',
                            fontWeight: isChecked ? '600' : 'normal'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStaffForm(prev => ({
                                  ...prev,
                                  selectedShifts: [...prev.selectedShifts, def.fullName]
                                }));
                              } else {
                                setStaffForm(prev => ({
                                  ...prev,
                                  selectedShifts: prev.selectedShifts.filter(s => s !== def.fullName)
                                }));
                              }
                            }}
                          />
                          <div>
                            <div><b>{def.label}</b></div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{def.time}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="btn-action-primary" style={{ marginTop: '10px' }}>
                  Tạo Tài Khoản Nhân Viên
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: SERVICES */}
        {activeTab === 'services' && (
          <div>
            <div className="panel-card">
              <h3 className="panel-title" style={{ marginBottom: '14px' }}>🥤 Danh Mục Quầy Nước & Dịch Vụ</h3>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tên Món</th>
                    <th>Loại</th>
                    <th>Đơn Vị</th>
                    <th>Đơn Giá</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td><b>{s.name}</b></td>
                      <td>{s.category === 'drink' ? 'Nước uống' : s.category === 'rental' ? 'Thuê đồ' : 'Đồ ăn nhẹ'}</td>
                      <td>{s.unit}</td>
                      <td><b style={{ color: '#059669' }}>{Number(s.price).toLocaleString('vi-VN')} đ</b></td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(s.id, s.name)}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '4px 10px',
                            fontSize: '12px',
                            borderRadius: '6px'
                          }}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel-card" style={{ maxWidth: '500px' }}>
              <h3 className="panel-title">➕ Thêm Món Vào Quầy</h3>
              <form onSubmit={handleCreateService} style={{ marginTop: '14px' }}>
                <div className="form-group">
                  <label>Tên món / dịch vụ:</label>
                  <input type="text" required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phân loại:</label>
                  <select value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}>
                    <option value="drink">Nước uống</option>
                    <option value="rental">Thuê đồ (Áo bib, bóng...)</option>
                    <option value="snack">Đồ ăn nhẹ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Đơn giá (VNĐ):</label>
                  <input type="number" required value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đơn vị tính:</label>
                  <input type="text" required placeholder="chai, lon, bộ, quả..." value={serviceForm.unit} onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })} />
                </div>
                <button type="submit" className="btn-action-primary">Lưu Món</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: REVIEWS (QUẢN LÝ ĐÁNH GIÁ & GÓP Ý TỪ KHÁCH HÀNG) */}
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
                  <div className="stat-label">Cần Cải Thiện (≤3★)</div>
                  <div className="stat-num">
                    {reviewsList.filter(r => Number(r.rating) <= 3).length}
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG QUẢN LÝ ĐÁNH GIÁ */}
            <div className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="panel-title" style={{ margin: 0 }}>⭐ Danh Sách Đánh Giá & Góp Ý</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Theo dõi phản hồi chất lượng mặt sân, hệ thống đèn và dịch vụ từ khách hàng
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
                    {pitches.map(p => {
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
                        <th style={{ minWidth: '150px' }}>Khách Hàng</th>
                        <th style={{ minWidth: '120px' }}>Điểm Sao</th>
                        <th>Nội Dung Nhận Xét & Góp Ý</th>
                        <th style={{ minWidth: '130px' }}>Thời Gian</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Thao Tác</th>
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
                              <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                Chưa có nhận xét hay góp ý nào phù hợp với bộ lọc.
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
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id, rev.customer_name)}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                                title="Xóa đánh giá vi phạm hoặc spam"
                              >
                                🗑️ Xóa
                              </button>
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

      {/* MODAL QUẢN LÝ ẢNH MÔ TẢ GÓC SÂN (PITCH GALLERY) DÀNH CHO ADMIN */}
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
                  🖼️ Thư Viện Ảnh Mô Tả: {galleryModal.pitch.name} ({galleryModal.pitch.type})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Tải lên hình ảnh các góc sân, khán đài, mặt cỏ nhân tạo để người dùng chiêm ngưỡng
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
                  Chưa có ảnh mô tả nào cho sân này. Hãy chọn file bên dưới để tải lên!
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
                      name="uploadMethod"
                      checked={galleryForm.uploadMethod === 'file'}
                      onChange={() => setGalleryForm({ ...galleryForm, uploadMethod: 'file' })}
                    />
                    📁 Chọn file từ máy tính (Khuyên dùng)
                  </label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="uploadMethod"
                      checked={galleryForm.uploadMethod === 'url'}
                      onChange={() => setGalleryForm({ ...galleryForm, uploadMethod: 'url' })}
                    />
                    🔗 Nhập liên kết (URL ảnh trực tuyến)
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
                    placeholder="Ví dụ: Góc nhìn từ khung thành A, Khán đài có mái che, Mặt cỏ ban đêm..."
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

      {/* MODAL CHI TIẾT ĐƠN CHO ADMIN */}
      {detailModal.isOpen && detailModal.bookingData && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Chi Tiết Đơn Đặt Sân #{detailModal.bookingId}</h3>
              <button className="btn-close" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.8' }}>
                <div>Khách hàng: <b>{detailModal.bookingData.customer_name}</b> ({detailModal.bookingData.customer_phone})</div>
                <div>Sân: <b>{detailModal.bookingData.pitch_name}</b> ({detailModal.bookingData.pitch_type})</div>
                <div>Ngày đá: <b>{detailModal.bookingData.booking_date}</b></div>
                <div>Khung giờ: <b>{detailModal.bookingData.start_time?.slice(0, 5)} &rarr; {detailModal.bookingData.end_time?.slice(0, 5)}</b></div>
                <div>Tiền sân: <b style={{ color: '#059669' }}>{Number(detailModal.bookingData.total_price).toLocaleString('vi-VN')} đ</b></div>
                <div>Trạng thái: <b style={{ textTransform: 'uppercase' }}>{detailModal.bookingData.status}</b></div>
                <div>Thanh toán: <b style={{ textTransform: 'uppercase' }}>{detailModal.bookingData.payment_status}</b></div>
                {detailModal.bookingData.note && (
                  <div>Ghi chú: <i>{detailModal.bookingData.note}</i></div>
                )}
              </div>

              {detailModal.bookingData.status === 'confirmed' && (
                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <QRCodeSVG value={`BOOKING_${detailModal.bookingData.id}`} size={100} />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>MÃ CHECK-IN</div>
                </div>
              )}
            </div>

            {detailModal.servicesOrder.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>🥤 Tiện ích & Nước uống đi kèm:</div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {detailModal.servicesOrder.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 0' }}>{item.service_name}</td>
                          <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.total_item_price).toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', marginTop: '6px', fontWeight: 'bold', color: '#059669' }}>
                    Tiền tiện ích: {Number(detailModal.totalServiceAmount).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ecfdf5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>TỔNG CỘNG HÓA ĐƠN:</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#064e3b' }}>
                    {(Number(detailModal.bookingData.total_price) + Number(detailModal.totalServiceAmount)).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            )}

            <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Thao tác nhanh cho Admin:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {detailModal.bookingData.status === 'pending' && (
                  <button className="btn-success" onClick={() => handleQuickStatus(detailModal.bookingId, 'confirmed')}>
                    ✓ Duyệt Đơn
                  </button>
                )}
                {detailModal.bookingData.status === 'confirmed' && (
                  <button className="btn-info" onClick={() => handleQuickCheckin(detailModal.bookingId)}>
                    🏃 Check-in Vào Sân
                  </button>
                )}
                {detailModal.bookingData.status === 'checked_in' && (
                  <button className="btn-action-primary" onClick={() => handleQuickStatus(detailModal.bookingId, 'completed')}>
                    🏁 Hoàn Tất Ca Đá
                  </button>
                )}
                {detailModal.bookingData.status !== 'cancelled' && detailModal.bookingData.status !== 'completed' && (
                  <button className="btn-danger" onClick={() => handleQuickStatus(detailModal.bookingId, 'cancelled')}>
                    ✕ Hủy Đơn
                  </button>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', margin: '12px 0 6px 0' }}>Cập nhật thanh toán:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => handleQuickPayment(detailModal.bookingId, 'unpaid')}>
                  Chưa thu
                </button>
                <button className="btn-secondary" onClick={() => handleQuickPayment(detailModal.bookingId, 'deposited')}>
                  Đã cọc
                </button>
                <button className="btn-action-primary" onClick={() => handleQuickPayment(detailModal.bookingId, 'paid')}>
                  Đã trả 100%
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '18px' }}>
              <button className="btn-secondary" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default AdminDashboard;