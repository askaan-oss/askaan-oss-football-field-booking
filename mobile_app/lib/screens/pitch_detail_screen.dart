import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/app_colors.dart';
import '../providers/pitch_provider.dart';
import '../core/constants.dart';
import '../models/pitch_model.dart';
import 'booking_screen.dart';

class PitchDetailScreen extends StatefulWidget {
  final int pitchId;
  const PitchDetailScreen({super.key, required this.pitchId});

  @override
  State<PitchDetailScreen> createState() => _PitchDetailScreenState();
}

class _PitchDetailScreenState extends State<PitchDetailScreen> {
  int _activeImageIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PitchProvider>(context, listen: false).fetchPitchDetail(widget.pitchId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pitchProvider = Provider.of<PitchProvider>(context);
    final pitch = pitchProvider.selectedPitch;
    final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    if (pitchProvider.isLoading || pitch == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    // Danh sách tất cả ảnh bao gồm ảnh chính + các ảnh gallery
    final List<String> allImages = [
      if (pitch.image != null && pitch.image!.isNotEmpty) pitch.image!,
      ...pitch.images.map((img) => img.imageUrl),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(pitch.name, style: const TextStyle(color: AppColors.textPrimary, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gallery ảnh mô tả sân
            if (allImages.isNotEmpty) ...[
              SizedBox(
                height: 240,
                child: PageView.builder(
                  itemCount: allImages.length,
                  onPageChanged: (idx) {
                    setState(() {
                      _activeImageIndex = idx;
                    });
                  },
                  itemBuilder: (ctx, idx) {
                    final imgUrl = ApiConstants.formatImageUrl(allImages[idx]);
                    return CachedNetworkImage(
                      imageUrl: imgUrl,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      placeholder: (ctx, url) => Container(
                        color: AppColors.surfaceLight,
                        child: const Center(
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        ),
                      ),
                      errorWidget: (ctx, url, err) => Container(
                        color: AppColors.surfaceLight,
                        child: const Icon(Icons.image_not_supported, size: 50, color: AppColors.textMuted),
                      ),
                    );
                  },
                ),
              ),

              // Chỉ số indicator dots
              if (allImages.length > 1)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      allImages.length,
                      (index) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _activeImageIndex == index ? 18 : 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: _activeImageIndex == index ? AppColors.primary : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                ),
            ],

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tên sân & Loại sân
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          pitch.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.primary),
                        ),
                        child: Text(
                          'Sân ${pitch.type} người',
                          style: const TextStyle(
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Đánh giá sao trung bình
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const SizedBox(width: 4),
                      Text(
                        '${pitch.averageRating.toStringAsFixed(1)} / 5.0',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        ' (${pitch.reviewCount} lượt đánh giá từ khách hàng)',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Thẻ giá tiền
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Đơn giá cơ bản:',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                        ),
                        Text(
                          '${currencyFormatter.format(pitch.priceDefault)} / giờ',
                          style: const TextStyle(
                            color: AppColors.primaryLight,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Mô tả sân
                  const Text(
                    'Mô tả sân bóng',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    pitch.description != null && pitch.description!.isNotEmpty
                        ? pitch.description!
                        : 'Mặt cỏ nhân tạo tiêu chuẩn FIFA, hệ thống chiếu sáng LED ban đêm hiện đại, trang bị thoát nước tốt và lưới chắn bóng cao cấp.',
                    style: const TextStyle(color: AppColors.textSecondary, height: 1.4, fontSize: 13),
                  ),
                  const SizedBox(height: 24),

                  // Đánh giá & nhận xét
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Đánh giá & Nhận xét',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '${pitch.reviews.length} nhận xét',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (pitch.reviews.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text(
                          'Chưa có nhận xét nào. Hãy là người đầu tiên trải nghiệm sân bóng này!',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ...pitch.reviews.map((r) => _buildReviewItem(r)),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SizedBox(
          height: 50,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: pitch.isMaintenance
                ? null
                : () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BookingScreen(pitch: pitch),
                      ),
                    );
                  },
            icon: const Icon(Icons.flash_on),
            label: Text(
              pitch.isMaintenance ? 'SÂN ĐANG BẢO TRÌ' : 'ĐẶT SÂN NGAY',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReviewItem(PitchReviewModel review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                review.reviewerName,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    Icons.star,
                    size: 14,
                    color: i < review.rating ? Colors.amber : AppColors.surfaceLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            review.comment != null && review.comment!.isNotEmpty
                ? review.comment!
                : 'Khách hàng không để lại nhận xét chi tiết.',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

