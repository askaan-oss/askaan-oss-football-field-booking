class ApiEndpoints {
  // Xác thực & Tài khoản
  static const String customerLogin = '/auth/customer/login';
  static const String customerRegister = '/auth/customer/register';
  static const String authProfile = '/auth/me';

  // Sân bóng
  static const String pitches = '/pitches';
  static String pitchDetail(int id) => '/pitches/$id';
  static const String timeSlots = '/pitches/time-slots';
  static const String timeRules = '/pitches/time-rules';
  static String pitchReviews(int pitchId) => '/pitches/$pitchId/reviews';

  // Đặt sân & Lịch sân
  static const String checkAvailability = '/bookings/check-availability';
  static const String createOnlineBooking = '/bookings/online';
  static const String myBookings = '/bookings/my';
  static String bookingDetail(int id) => '/bookings/$id';
  static String cancelBooking(int id) => '/bookings/$id/cancel';

  // Dịch vụ quầy nước
  static const String services = '/services';
  static const String orderService = '/services/order';
  static String bookingServices(int bookingId) => '/services/order/$bookingId';

  // Tuyến đường Quản trị viên & Chủ sân (Admin Mobile Dashboard)
  static const String allBookings = '/bookings';
  static String updateBookingStatus(int id) => '/bookings/$id/status';
  static const String pitchesAll = '/pitches?all=true';
  static String updatePitchStatus(int id) => '/pitches/$id/status';
  static const String staffList = '/auth/staff';
}
