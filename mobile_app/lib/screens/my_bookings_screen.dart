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

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
    });
  }

  // Xử lý hủy đơn
  void _handleCancelBooking(BookingModel booking) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hủy đơn đặt sân', style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Bạn có chắc chắn muốn hủy đơn đặt sân #${booking.id} (${booking.pitchName}) ngày ${booking.bookingDate}?',
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

  // Mở hộp thoại đánh giá sân
  void _openReviewDialog(BookingModel booking) {
    int rating = 5;
    final commentController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Đánh giá ${booking.pitchName}',
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 17),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Chất lượng sân bóng và dịch vụ thế nào?', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
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
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Nhận xét về mặt cỏ, ánh sáng, thái độ nhân viên...',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Bỏ qua', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                Navigator.of(ctx).pop();
                try {
                  final Dio dio = ApiClient().dio;
                  final res = await dio.post(ApiEndpoints.pitchReviews(booking.pitchId), data: {
                    'rating': rating,
                    'comment': commentController.text,
                    'reviewer_name': booking.customerName,
                  });

                  if (mounted && res.data['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Cảm ơn bạn đã gửi đánh giá sân bóng!'),
                        backgroundColor: AppColors.success,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Lỗi gửi đánh giá: $e'), backgroundColor: AppColors.danger),
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
      body: RefreshIndicator(
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
                          Text(bookingProvider.errorMessage!, style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
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
                : bookingProvider.myBookings.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.confirmation_number_outlined, size: 64, color: AppColors.textMuted),
                            SizedBox(height: 12),
                            Text('Bạn chưa có đơn đặt sân nào.', style: TextStyle(color: AppColors.textSecondary, fontSize: 16)),
                            SizedBox(height: 6),
                            Text('Hãy ra trang chủ để chọn sân và khung giờ phù hợp nhé!', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: bookingProvider.myBookings.length,
                        itemBuilder: (ctx, idx) {
                          final booking = bookingProvider.myBookings[idx];
                          return _buildTicketCard(booking);
                        },
                      ),
      ),
    );
  }

  // Thẻ vé bóng đá điện tử
  Widget _buildTicketCard(BookingModel booking) {
    final canCancel = booking.status == 'pending' || booking.status == 'confirmed';
    final canReview = booking.status == 'completed';

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
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
          // Phần đầu vé (Header)
          Container(
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
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13, letterSpacing: 0.8),
                    ),
                  ],
                ),
                _buildStatusTag(booking.status),
              ],
            ),
          ),

          // Phần thân vé (Nội dung trận đấu & Mã QR)
          Padding(
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
                    size: 90.0,
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
                          fontSize: 17,
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
                            '${booking.startTime.substring(0, 5)} - ${booking.endTime.substring(0, 5)}',
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

          // Phần đuôi vé (Thao tác hành động)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
        ],
      ),
    );
  }

  Widget _buildStatusTag(String status) {
    Color color = Colors.blueGrey;
    String text = 'Chờ duyệt';

    switch (status) {
      case 'confirmed':
        color = AppColors.primary;
        text = 'Đã xác nhận';
        break;
      case 'checked_in':
        color = Colors.cyan;
        text = 'Đang đá bóng';
        break;
      case 'completed':
        color = Colors.green;
        text = 'Hoàn thành';
        break;
      case 'cancelled':
        color = AppColors.danger;
        text = 'Đã hủy';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color, width: 0.8),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildPaymentTag(String paymentStatus) {
    Color color = AppColors.danger;
    String text = 'Chưa thanh toán';

    if (paymentStatus == 'paid') {
      color = AppColors.success;
      text = 'Đã trả 100%';
    } else if (paymentStatus == 'deposited') {
      color = Colors.amber;
      text = 'Đã cọc';
    }

    return Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold));
  }
}
