class BookingModel {
  final int id;
  final int pitchId;
  final String pitchName;
  final String? pitchType;
  final String bookingDate;
  final String startTime;
  final String endTime;
  final double totalAmount;
  final String status; // 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'
  final String paymentStatus; // 'unpaid', 'deposited', 'paid'
  final String customerName;
  final String customerPhone;
  final String? qrCode;
  final String? createdAt;

  BookingModel({
    required this.id,
    required this.pitchId,
    required this.pitchName,
    this.pitchType,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    required this.customerName,
    required this.customerPhone,
    this.qrCode,
    this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] ?? 0,
      pitchId: json['pitch_id'] ?? 0,
      pitchName: json['pitch_name'] ?? 'Sân bóng',
      pitchType: json['pitch_type']?.toString(),
      bookingDate: json['booking_date'] ?? '',
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'] ?? '',
      totalAmount: double.tryParse(json['total_amount']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'pending',
      paymentStatus: json['payment_status'] ?? 'unpaid',
      customerName: json['customer_name'] ?? '',
      customerPhone: json['customer_phone'] ?? '',
      qrCode: json['qr_code'] ?? 'BOOKING_${json['id']}',
      createdAt: json['created_at'],
    );
  }

  String get formattedStatus {
    switch (status) {
      case 'confirmed':
        return 'Đã xác nhận';
      case 'checked_in':
        return 'Đang đá (Đã check-in)';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Chờ duyệt';
    }
  }

  String get formattedPaymentStatus {
    switch (paymentStatus) {
      case 'paid':
        return 'Đã thanh toán 100%';
      case 'deposited':
        return 'Đã đặt cọc';
      default:
        return 'Chưa thanh toán';
    }
  }
}

