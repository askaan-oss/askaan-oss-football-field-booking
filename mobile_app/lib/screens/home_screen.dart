import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/pitch_provider.dart';
import '../core/constants.dart';
import '../models/pitch_model.dart';
import 'login_screen.dart';
import 'pitch_detail_screen.dart';
import 'booking_screen.dart';
import '../widgets/app_image.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedFilter = 'all'; // 'all', '5', '7'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPitches();
    });
  }

  void _loadPitches() {
    Provider.of<PitchProvider>(context, listen: false).fetchPitches(
      type: _selectedFilter == 'all' ? null : _selectedFilter,
    );
  }

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Đăng xuất', style: TextStyle(color: AppColors.textPrimary)),
        content: const Text('Bạn có chắc chắn muốn đăng xuất tài khoản?', style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Đăng xuất', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      await Provider.of<AuthProvider>(context, listen: false).logout();
    }
  }

  // Bấm nút Đặt Sân Ngay trên thẻ sân: Kiểm tra JWT Token
  Future<void> _handleQuickBook(PitchModel pitch) async {
    if (pitch.isMaintenance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sân bóng này đang bảo trì, vui lòng chọn sân khác.'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    if (!authProvider.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng đăng nhập để tiến hành đặt sân'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );

      final loggedIn = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => LoginScreen(
            onSuccess: () {
              Navigator.of(context).pop(true);
            },
          ),
        ),
      );

      if (loggedIn == true && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BookingScreen(pitch: pitch),
          ),
        );
      }
      return;
    }

    // Đã có Token: Chuyển thẳng sang trang Chọn giờ & Đặt sân
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BookingScreen(pitch: pitch),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final pitchProvider = Provider.of<PitchProvider>(context);
    final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    // Lọc danh sách sân chính xác 100% theo loại sân (không lẫn sân 5 và sân 7)
    final filteredPitches = pitchProvider.pitches.where((p) {
      if (_selectedFilter == 'all') return true;
      if (_selectedFilter == '5') return p.type.toLowerCase().contains('5');
      if (_selectedFilter == '7') return p.type.toLowerCase().contains('7');
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.sports_soccer, color: AppColors.primary, size: 28),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sân Bóng Cỏ Nhân Tạo',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  authProvider.isAuthenticated
                      ? 'Xin chào, ${authProvider.user?.fullName ?? "Thành viên"}'
                      : 'Khách vãng lai (Chưa đăng nhập)',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (authProvider.isAuthenticated)
            IconButton(
              icon: const Icon(Icons.logout, color: AppColors.danger, size: 22),
              tooltip: 'Đăng xuất',
              onPressed: _handleLogout,
            )
          else
            TextButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              icon: const Icon(Icons.login, size: 18, color: AppColors.primary),
              label: const Text(
                'Đăng nhập',
                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _loadPitches(),
        color: AppColors.primary,
        child: Column(
          children: [
            // Thanh lọc loại sân / chi nhánh
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: AppColors.surface.withValues(alpha: 0.5),
              child: Row(
                children: [
                  _buildFilterChip('Toàn hệ thống', 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Sân 5 người', '5'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Sân 7 người', '7'),
                ],
              ),
            ),

            // Danh sách sân bóng
            Expanded(
              child: pitchProvider.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : pitchProvider.errorMessage != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.cloud_off, size: 48, color: AppColors.danger),
                                const SizedBox(height: 12),
                                Text(
                                  pitchProvider.errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                  onPressed: _loadPitches,
                                  icon: const Icon(Icons.refresh, color: Colors.white),
                                  label: const Text('Thử lại', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          ),
                        )
                      : filteredPitches.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.sports_soccer, size: 48, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  Text(
                                    _selectedFilter == '7'
                                        ? 'Hiện chưa có sân 7 người nào.'
                                        : _selectedFilter == '5'
                                            ? 'Hiện chưa có sân 5 người nào.'
                                            : 'Hiện không tìm thấy sân bóng nào phù hợp.',
                                    style: const TextStyle(color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredPitches.length,
                              itemBuilder: (ctx, index) {
                                final pitch = filteredPitches[index];
                                return _buildPitchCard(pitch, currencyFormatter);
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedFilter = value;
          });
          _loadPitches();
        }
      },
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surface,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 13,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: BorderSide(color: isSelected ? AppColors.primary : AppColors.surfaceLight),
    );
  }

  Widget _buildPitchCard(PitchModel pitch, NumberFormat formatter) {
    final imageUrl = ApiConstants.formatImageUrl(pitch.image);
    final typeBadge = pitch.type.toLowerCase().contains('7') ? 'SÂN 7 NGƯỜI' : 'SÂN 5 NGƯỜI';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            // Khách vãng lai bấm vào card để xem chi tiết sân tự do
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => PitchDetailScreen(pitchId: pitch.id),
              ),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ảnh bìa sân
              Stack(
                children: [
                  AppImage(
                    imageUrl: pitch.image,
                    height: 170,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  ),

                  // Tag loại sân chuẩn xác (SÂN 5 NGƯỜI hoặc SÂN 7 NGƯỜI)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: pitch.type.toLowerCase().contains('7') ? Colors.cyanAccent : AppColors.primaryLight,
                          width: 1.2,
                        ),
                      ),
                      child: Text(
                        typeBadge,
                        style: TextStyle(
                          color: pitch.type.toLowerCase().contains('7') ? Colors.cyanAccent : Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                  // Tag trạng thái (Bảo trì nếu có)
                  if (pitch.isMaintenance)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Đang bảo trì',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),

              // Thông tin sân & nút thao tác
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            pitch.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        // Đánh giá sao
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              pitch.averageRating.toStringAsFixed(1),
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              ' (${pitch.reviewCount})',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Giá tiền và nút Đặt Sân Ngay
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Giá cơ bản:',
                              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                            Text(
                              '${formatter.format(pitch.priceDefault)} / giờ',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryLight,
                              ),
                            ),
                          ],
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: pitch.isMaintenance ? Colors.grey.shade700 : AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          onPressed: () => _handleQuickBook(pitch),
                          icon: const Icon(Icons.flash_on, size: 16),
                          label: const Text('Đặt Sân Ngay', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
