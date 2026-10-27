import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../widgets/app_image.dart';

class AdminPitchesScreen extends StatefulWidget {
  const AdminPitchesScreen({super.key});

  @override
  State<AdminPitchesScreen> createState() => _AdminPitchesScreenState();
}

class _AdminPitchesScreenState extends State<AdminPitchesScreen> {
  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _pitches = [];

  @override
  void initState() {
    super.initState();
    _fetchPitches();
  }

  Future<void> _fetchPitches() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _dio.get(ApiEndpoints.pitchesAll);
      if (res.data['success'] == true) {
        setState(() {
          _pitches = res.data['data'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Lỗi tải danh sách sân: $e';
      });
    }
  }

  // Bật/tắt bảo trì sân trực tiếp
  Future<void> _toggleMaintenance(int pitchId, bool isCurrentlyMaintenance) async {
    final nextStatus = isCurrentlyMaintenance ? 'active' : 'maintenance';

    try {
      final res = await _dio.patch(
        ApiEndpoints.updatePitchStatus(pitchId),
        data: {'status': nextStatus},
      );

      if (res.data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(nextStatus == 'maintenance' ? 'Đã bật chế độ bảo trì cho sân!' : 'Đã mở lại sân hoạt động bình thường!'),
            backgroundColor: nextStatus == 'maintenance' ? Colors.orange : AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchPitches();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi cập nhật bảo trì: $e'), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('Giám Sát & Bảo Trì Sân', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primaryLight),
            onPressed: _fetchPitches,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger)))
              : _pitches.isEmpty
                  ? const Center(child: Text('Chưa có sân bóng nào.', style: TextStyle(color: AppColors.textMuted)))
                  : RefreshIndicator(
                      onRefresh: _fetchPitches,
                      color: AppColors.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _pitches.length,
                        itemBuilder: (ctx, idx) {
                          final p = _pitches[idx];
                          final isMaintenance = (p['status'] ?? '').toString().toLowerCase() == 'maintenance';
                          final price = double.tryParse((p['price_default'] ?? 0).toString()) ?? 0.0;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isMaintenance ? Colors.orangeAccent.withValues(alpha: 0.6) : AppColors.surfaceLight,
                                width: isMaintenance ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: AppImage(
                                            imageUrl: p['avatar_url'] ?? p['image'],
                                            width: 44,
                                            height: 44,
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          p['name'] ?? 'Sân bóng',
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                      ],
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        'Sân ${p['type']} người',
                                        style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Giá cơ bản: ${_currencyFormat.format(price)}/giờ',
                                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.star, color: Colors.amber, size: 16),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${p['average_rating'] ?? 5.0}',
                                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(color: AppColors.surfaceLight, height: 20),

                                // Công tắc gạt Bật/Tắt bảo trì
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          isMaintenance ? Icons.handyman : Icons.check_circle,
                                          color: isMaintenance ? Colors.orangeAccent : AppColors.success,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          isMaintenance ? 'Đang BẢO TRÌ (Khóa đặt)' : 'Đang HOẠT ĐỘNG',
                                          style: TextStyle(
                                            color: isMaintenance ? Colors.orangeAccent : AppColors.success,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Switch(
                                      value: isMaintenance,
                                      activeColor: Colors.orangeAccent,
                                      onChanged: (_) => _toggleMaintenance(p['id'], isMaintenance),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

