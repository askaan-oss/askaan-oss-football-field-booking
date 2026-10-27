import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/booking_model.dart';
import '../providers/booking_provider.dart';
import '../providers/auth_provider.dart';

class TicketDetailScreen extends StatefulWidget {
  final int bookingId;
  final BookingModel? initialBooking;

  const TicketDetailScreen({
    super.key,
    required this.bookingId,
    this.initialBooking,
  });

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _detailData;

  @override
  void initState() {
    super.initState();
    _fetchBookingDetail();
  }

  Future<void> _fetchBookingDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _dio.get(ApiEndpoints.bookingDetail(widget.bookingId));
      if (res.data['success'] == true) {
        setState(() {
          _detailData = res.data['data'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = res.data['message'] ?? 'Không tải được chi tiết vé.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Lỗi kết nối khi tải chi tiết vé: $e';
      });
    }
  }

  // Hủy vé đặt sân
  Future<void> _handleCancelBooking() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: AppColors.danger),
            SizedBox(width: 8),
            Text('Hủy vé đặt sân', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: Text(
          'Bạn có chắc chắn muốn hủy vé điện tử #${widget.bookingId}?',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Giữ lại', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Xác nhận Hủy', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final res = await Provider.of<BookingProvider>(context, listen: false).cancelBooking(widget.bookingId);
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message']),
          backgroundColor: res['success'] ? AppColors.success : AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );

      if (res['success']) {
        _fetchBookingDetail();
      }
    }
  }

  // Mở modal chấm sao đánh giá sau trận
  void _openReviewDialog(String pitchName, int pitchId) {
    int rating = 5;
    final commentController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.star, color: Colors.amber, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Đánh giá $pitchName',
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Chất lượng mặt cỏ, ánh sáng đèn và dịch vụ tại sân thế nào?',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 14),

              // Chọn số sao
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (idx) {
                  final star = idx + 1;
                  return IconButton(
                    icon: Icon(
                      star <= rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 32,
                    ),
                    onPressed: () {
                      setDialogState(() {
                        rating = star;
                      });
                    },
                  );
                }),
              ),
              const SizedBox(height: 10),

              TextField(
                controller: commentController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Nhập cảm nhận của bạn về trận đấu...',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Bỏ qua', style: TextStyle(color: AppColors.textMuted)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                Navigator.of(ctx).pop();
                try {
                  final authProvider = Provider.of<AuthProvider>(context, listen: false);
                  String customerName = authProvider.user?.fullName.trim() ?? '';
                  if (customerName.isEmpty) {
                    customerName = (_detailData?['customer_name']?.toString() ?? widget.initialBooking?.customerName ?? '').trim();
                  }
                  if (customerName.isEmpty) {
                    customerName = authProvider.user?.username.trim() ?? 'Khách hàng';
                  }
                  String customerPhone = authProvider.user?.phone?.trim() ?? _detailData?['customer_phone']?.toString().trim() ?? widget.initialBooking?.customerPhone.trim() ?? '';

                  final res = await _dio.post(
                    ApiEndpoints.pitchReviews(pitchId),
                    data: {
                      'customer_name': customerName,
                      'customer_phone': customerPhone,
                      'rating': rating,
                      'comment': commentController.text.trim(),
                    },
                  );

                  if (mounted && (res.data['success'] == true || res.statusCode == 200 || res.statusCode == 201)) {
                    showDialog(
                      context: context,
                      builder: (dialogCtx) => AlertDialog(
                        backgroundColor: AppColors.surface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.success,
                                size: 48,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Đánh Giá Thành Công!',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(5, (i) => Icon(
                                i < rating ? Icons.star : Icons.star_border,
                                color: Colors.amber,
                                size: 22,
                              )),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Cảm ơn bạn đã gửi đánh giá cho $pitchName. Ý kiến của bạn sẽ giúp ban quản lý nâng cao chất lượng sân cỏ và dịch vụ!',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                height: 1.45,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 22),
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                onPressed: () => Navigator.of(dialogCtx).pop(),
                                child: const Text(
                                  'Xác Nhận & Đóng',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  } else {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(res.data['message'] ?? 'Không thể gửi đánh giá.'),
                          backgroundColor: AppColors.danger,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  }
                } on DioException catch (e) {
                  final errorMsg = e.response?.data is Map && e.response?.data['message'] != null
                      ? e.response!.data['message']
                      : 'Lỗi gửi đánh giá, vui lòng kiểm tra kết nối.';
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(errorMsg), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Lỗi gửi đánh giá: $e'), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating),
                    );
                  }
                }
              },
              child: const Text('Gửi Đánh Giá', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Ưu tiên dữ liệu chi tiết tải từ API, nếu đang tải dùng initialBooking hiển thị khung
    final b = _detailData;
    final status = (b?['status'] ?? widget.initialBooking?.status ?? 'pending').toString().toLowerCase();
    final pitchName = b?['pitch_name'] ?? widget.initialBooking?.pitchName ?? 'Sân bóng';
    final pitchType = b?['pitch_type'] ?? 'Sân mini';
    final bookingDate = b?['booking_date']?.toString().split('T')[0] ?? widget.initialBooking?.bookingDate ?? '';
    final startTime = b?['start_time'] ?? widget.initialBooking?.startTime ?? '';
    final endTime = b?['end_time'] ?? widget.initialBooking?.endTime ?? '';
    final totalPrice = double.tryParse((b?['final_amount'] ?? b?['total_price'] ?? widget.initialBooking?.totalAmount ?? 0).toString()) ?? 0.0;
    final pitchPrice = double.tryParse((b?['total_price'] ?? widget.initialBooking?.totalAmount ?? 0).toString()) ?? 0.0;
    final paymentStatus = (b?['payment_status'] ?? widget.initialBooking?.paymentStatus ?? 'unpaid').toString();
    final customerName = b?['customer_name'] ?? 'Khách hàng';
    final customerPhone = b?['customer_phone'] ?? 'Chưa cập nhật';
    final note = b?['note'] ?? '';
    final services = (b?['services'] as List<dynamic>?) ?? [];
    final pitchId = b?['pitch_id'] ?? 1;

    final canCancel = status == 'pending' || status == 'confirmed';
    final canReview = status == 'completed';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Text(
          'Chi Tiết Vé #${widget.bookingId}',
          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            icon: const Icon(Icons.refresh, color: AppColors.primaryLight),
            onPressed: _fetchBookingDetail,
          ),
        ],
      ),
      body: _isLoading && b == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null && b == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchBookingDetail,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      // THẺ VÉ ĐIỆN TỬ PHONG CÁCH BOARDING PASS
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 14,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            // 1. Header vé: Mã vé + Trạng thái
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight.withValues(alpha: 0.7),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.2),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.confirmation_number, color: AppColors.primary, size: 22),
                                      ),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'VÉ ĐIỆN TỬ SÂN BÓNG',
                                            style: TextStyle(color: AppColors.textMuted, fontSize: 10, letterSpacing: 1),
                                          ),
                                          Text(
                                            'MÃ VÉ #${widget.bookingId}',
                                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  _buildStatusTag(status),
                                ],
                              ),
                            ),

                            // 2. Thân vé: Mã QR to rõ + Hướng dẫn Check-in
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                              child: Column(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.15),
                                          blurRadius: 10,
                                        ),
                                      ],
                                    ),
                                    child: QrImageView(
                                      data: 'BOOKING_${widget.bookingId}',
                                      version: QrVersions.auto,
                                      size: 160.0,
                                      gapless: false,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Xuất trình mã QR này tại quầy lễ tân để Check-in vào sân',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),

                            // 3. Đường đục lỗ vé (Dấu vé thể thao)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                children: List.generate(
                                  35,
                                  (i) => Expanded(
                                    child: Container(
                                      height: 1.5,
                                      color: i % 2 == 0 ? Colors.blueGrey.shade700 : Colors.transparent,
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            // 4. Khung chi tiết trận đấu
                            Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Tên sân & loại sân
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          pitchName,
                                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: AppColors.primaryLight, width: 1),
                                        ),
                                        child: Text(
                                          pitchType.toString().toUpperCase(),
                                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  // Lịch đá: Ngày & Giờ
                                  _buildInfoRow(Icons.calendar_today, 'Ngày thi đấu', bookingDate),
                                  const SizedBox(height: 10),
                                  _buildInfoRow(
                                    Icons.access_time,
                                    'Khung giờ',
                                    '${startTime.length >= 5 ? startTime.substring(0, 5) : startTime} - ${endTime.length >= 5 ? endTime.substring(0, 5) : endTime}',
                                    highlightValue: true,
                                  ),
                                  const SizedBox(height: 10),
                                  _buildInfoRow(Icons.person, 'Người đặt', customerName),
                                  const SizedBox(height: 10),
                                  _buildInfoRow(Icons.phone, 'Số điện thoại', customerPhone),
                                  if (note.isNotEmpty) ...[
                                    const SizedBox(height: 10),
                                    _buildInfoRow(Icons.notes, 'Lời nhắn', note),
                                  ],

                                  const SizedBox(height: 18),
                                  const Divider(color: AppColors.surfaceLight),
                                  const SizedBox(height: 12),

                                  // Bảng kê chi phí
                                  const Text(
                                    'CHI TIẾT THANH TOÁN',
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                                  ),
                                  const SizedBox(height: 10),

                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Tiền thuê sân bóng:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                                      Text(_currencyFormat.format(pitchPrice), style: const TextStyle(color: Colors.white, fontSize: 13)),
                                    ],
                                  ),

                                  // Dịch vụ gọi thêm (nếu có)
                                  if (services.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    ...services.map((s) => Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                '• ${s['service_name']} (x${s['quantity']} ${s['unit']}):',
                                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                              ),
                                              Text(
                                                _currencyFormat.format(double.tryParse((s['total_item_price'] ?? 0).toString()) ?? 0),
                                                style: const TextStyle(color: Colors.white, fontSize: 12),
                                              ),
                                            ],
                                          ),
                                        )),
                                  ],

                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceLight.withValues(alpha: 0.4),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text(
                                          'TỔNG CỘNG:',
                                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        Text(
                                          _currencyFormat.format(totalPrice),
                                          style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Trạng thái thanh toán:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                      _buildPaymentBadge(paymentStatus),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // NÚT HÀNH ĐỘNG DƯỚI ĐÁY TRANG
                      if (canCancel)
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.danger,
                              side: const BorderSide(color: AppColors.danger),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _handleCancelBooking,
                            icon: const Icon(Icons.cancel_outlined),
                            label: const Text('HỦY VÉ ĐẶT SÂN NÀY', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),

                      if (canReview) ...[
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.amber.shade700,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => _openReviewDialog(pitchName, pitchId),
                            icon: const Icon(Icons.star),
                            label: const Text('ĐÁNH GIÁ TRẬN ĐẤU (1-5 ⭐)', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],

                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: TextButton.icon(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.arrow_back, color: AppColors.textSecondary),
                          label: const Text('Quay lại danh sách vé', style: TextStyle(color: AppColors.textSecondary)),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInfoRow(IconData icon, String title, String value, {bool highlightValue = false}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.primaryLight),
        const SizedBox(width: 10),
        Text('$title: ', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: highlightValue ? AppColors.primaryLight : Colors.white,
              fontWeight: highlightValue ? FontWeight.bold : FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusTag(String status) {
    Color color = Colors.grey;
    String text = 'Chờ duyệt';

    switch (status.toLowerCase()) {
      case 'confirmed':
        color = AppColors.primary;
        text = 'Đã duyệt';
        break;
      case 'checked_in':
      case 'in_progress':
        color = Colors.cyan;
        text = 'Đang đá';
        break;
      case 'completed':
        color = Colors.green;
        text = 'Hoàn tất';
        break;
      case 'cancelled':
        color = AppColors.danger;
        text = 'Đã hủy';
        break;
      case 'pending':
      default:
        color = Colors.orangeAccent;
        text = 'Chờ duyệt';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildPaymentBadge(String paymentStatus) {
    Color color = AppColors.danger;
    String text = 'Chưa thanh toán';

    if (paymentStatus == 'paid') {
      color = AppColors.success;
      text = 'Đã thanh toán 100%';
    } else if (paymentStatus == 'deposited') {
      color = Colors.cyanAccent;
      text = 'Đã đặt cọc';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 0.8),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

