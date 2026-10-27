import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:dio/dio.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/booking_model.dart';
import '../providers/booking_provider.dart';
import '../providers/auth_provider.dart';
import 'ticket_detail_screen.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
  String _selectedStatusFilter = 'all'; // 'all', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
    });
  }

  // Mở màn hình Chi Tiết Vé Điện Tử
  void _openTicketDetail(BookingModel booking) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TicketDetailScreen(
          bookingId: booking.id,
          initialBooking: booking,
        ),
      ),
    ).then((_) {
      if (mounted) {
        Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
      }
    });
  }

  // Xử lý yêu cầu hủy đơn đặt sân
  void _handleCancelBooking(BookingModel booking) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hủy vé đặt sân', style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Bạn có chắc chắn muốn hủy đơn vé #${booking.id} (${booking.pitchName}) ngày ${booking.bookingDate}?',
          style: const TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Giữ lại', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Xác nhận Hủy', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final res = await Provider.of<BookingProvider>(context, listen: false).cancelBooking(booking.id);
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message']),
          backgroundColor: res['success'] ? AppColors.success : AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // Mở hộp thoại đánh giá chất lượng sân khi trận đấu hoàn tất
  void _openReviewDialog(BookingModel booking) {
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
                  'Đánh giá ${booking.pitchName}',
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Chất lượng sân bóng và dịch vụ thế nào?',
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
                      size: 30,
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

              // Ô nhập nhận xét
              TextField(
                controller: commentController,
                maxLines: 3,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Nhập cảm nhận của bạn về mặt cỏ, ánh sáng, phục vụ...',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
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
                    customerName = booking.customerName.trim();
                  }
                  if (customerName.isEmpty) {
                    customerName = authProvider.user?.username.trim() ?? 'Khách hàng';
                  }
                  String customerPhone = authProvider.user?.phone?.trim() ?? booking.customerPhone.trim();

                  final res = await _dio.post(
                    ApiEndpoints.pitchReviews(booking.pitchId),
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
                              'Cảm ơn bạn đã gửi đánh giá cho ${booking.pitchName}. Ý kiến của bạn sẽ giúp ban quản lý nâng cao chất lượng sân cỏ và dịch vụ!',
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
    final bookingProvider = Provider.of<BookingProvider>(context);

    // Lọc danh sách theo trạng thái
    final filteredBookings = bookingProvider.myBookings.where((b) {
      if (_selectedStatusFilter == 'all') return true;
      return b.status.toLowerCase() == _selectedStatusFilter.toLowerCase();
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('Vé & Lịch Đã Đặt', style: TextStyle(color: AppColors.textPrimary, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primaryLight),
            onPressed: () => bookingProvider.fetchMyBookings(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Thanh lọc trạng thái 6 mức
          Container(
            height: 48,
            color: AppColors.surface.withValues(alpha: 0.5),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              children: [
                _buildStatusFilterChip('Tất cả', 'all'),
                _buildStatusFilterChip('Chờ duyệt', 'pending'),
                _buildStatusFilterChip('Đã duyệt', 'confirmed'),
                _buildStatusFilterChip('Đang đá', 'checked_in'),
                _buildStatusFilterChip('Hoàn tất', 'completed'),
                _buildStatusFilterChip('Hủy', 'cancelled'),
              ],
            ),
          ),

          // Nội dung danh sách vé
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => bookingProvider.fetchMyBookings(),
              color: AppColors.primary,
              child: bookingProvider.isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : bookingProvider.errorMessage != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
                                const SizedBox(height: 12),
                                Text(
                                  bookingProvider.errorMessage!,
                                  style: const TextStyle(color: AppColors.textSecondary),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                  onPressed: () => bookingProvider.fetchMyBookings(),
                                  child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          ),
                        )
                      : filteredBookings.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.confirmation_number_outlined, size: 64, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  Text(
                                    _selectedStatusFilter == 'all'
                                        ? 'Bạn chưa có đơn đặt sân nào.'
                                        : 'Không có vé nào ở trạng thái này.',
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 16),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Hãy ra trang chủ để chọn sân và khung giờ phù hợp nhé!',
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredBookings.length,
                              itemBuilder: (ctx, idx) {
                                final booking = filteredBookings[idx];
                                return _buildTicketCard(booking);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilterChip(String label, String value) {
    final isSelected = _selectedStatusFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedStatusFilter = value;
          });
        },
        selectedColor: AppColors.primary,
        backgroundColor: AppColors.surface,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : AppColors.textSecondary,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          fontSize: 12,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        side: BorderSide(color: isSelected ? AppColors.primary : AppColors.surfaceLight),
      ),
    );
  }

  // Thẻ vé bóng đá điện tử chuẩn mã vé #ID và mã QR Check-in
  Widget _buildTicketCard(BookingModel booking) {
    final status = booking.status.toLowerCase();
    final canCancel = status == 'pending' || status == 'confirmed';
    final canReview = status == 'completed';

    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header vé: Mã vé rút gọn (#ID) và Trạng thái
          InkWell(
            onTap: () => _openTicketDetail(booking),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight.withValues(alpha: 0.6),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.sports_soccer, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'VÉ ĐIỆN TỬ #${booking.id}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 14,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  _buildStatusTag(booking.status),
                ],
              ),
            ),
          ),

          // Thân vé: Mã QR Check-in + Thông tin trận đấu (Chạm để mở chi tiết vé)
          InkWell(
            onTap: () => _openTicketDetail(booking),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Khung mã QR
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: QrImageView(
                      data: booking.qrCode ?? 'BOOKING_${booking.id}',
                      version: QrVersions.auto,
                      size: 88.0,
                      gapless: false,
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Thông tin trận đấu
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          booking.pitchName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(booking.bookingDate, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time, size: 14, color: AppColors.primaryLight),
                            const SizedBox(width: 6),
                            Text(
                              '${booking.startTime.length >= 5 ? booking.startTime.substring(0, 5) : booking.startTime} - ${booking.endTime.length >= 5 ? booking.endTime.substring(0, 5) : booking.endTime}',
                              style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _currencyFormat.format(booking.totalAmount),
                              style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            _buildPaymentTag(booking.paymentStatus),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Đường kẻ đứt ngăn cách (Dấu vé đục lỗ)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: List.generate(
                30,
                (i) => Expanded(
                  child: Container(
                    height: 1,
                    color: i % 2 == 0 ? Colors.blueGrey.shade700 : Colors.transparent,
                  ),
                ),
              ),
            ),
          ),

          // Phần đuôi vé: Thao tác hành động (Hủy vé / Đánh giá)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Quét mã tại quầy để check-in',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontStyle: FontStyle.italic),
                ),
                Row(
                  children: [
                    if (canCancel)
                      TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: AppColors.danger, padding: EdgeInsets.zero),
                        onPressed: () => _handleCancelBooking(booking),
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        label: const Text('Hủy vé', style: TextStyle(fontSize: 12)),
                      ),
                    if (canReview)
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber.shade700,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () => _openReviewDialog(booking),
                        icon: const Icon(Icons.star, size: 14),
                        label: const Text('Đánh giá', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ],
            ),
          ),

          // Nút bấm mở Chi tiết vé điện tử
          InkWell(
            onTap: () => _openTicketDetail(booking),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight.withValues(alpha: 0.35),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                border: const Border(top: BorderSide(color: AppColors.surfaceLight, width: 0.8)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info_outline, size: 15, color: AppColors.primaryLight),
                  SizedBox(width: 6),
                  Text(
                    'Xem Chi Tiết Vé & Dịch Vụ',
                    style: TextStyle(
                      color: AppColors.primaryLight,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.primaryLight),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Quản lý 5 trạng thái đơn chuẩn:
  // 1. Chờ duyệt (pending)
  // 2. Đã duyệt (confirmed)
  // 3. Đang đá (checked_in)
  // 4. Hoàn tất (completed)
  // 5. Hủy (cancelled)
  Widget _buildStatusTag(String status) {
    Color color = Colors.blueGrey;
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
        text = 'Hủy';
        break;
      case 'pending':
      default:
        color = Colors.orangeAccent;
        text = 'Chờ duyệt';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 0.8),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildPaymentTag(String paymentStatus) {
    Color color = AppColors.danger;
    String text = 'Chưa thanh toán';

    if (paymentStatus == 'paid') {
      color = AppColors.success;
      text = 'Đã thanh toán';
    } else if (paymentStatus == 'deposited') {
      color = Colors.amber;
      text = 'Đã đặt cọc';
    }

    return Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold));
  }
}
