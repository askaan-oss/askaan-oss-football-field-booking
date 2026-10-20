import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/pitch_model.dart';
import '../providers/auth_provider.dart';
import '../providers/booking_provider.dart';
import 'my_bookings_screen.dart';

class BookingScreen extends StatefulWidget {
  final PitchModel pitch;

  const BookingScreen({super.key, required this.pitch});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  DateTime _selectedDate = DateTime.now();
  int _selectedDuration = 60; // 60, 90, 120 phút
  String? _selectedStartTime; // Ví dụ: "19:00:00"
  final _noteController = TextEditingController();

  bool _isLoadingSlots = false;
  List<dynamic> _availableSlots = [];
  List<dynamic> _timeRules = [];
  String? _slotError;

  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  @override
  void initState() {
    super.initState();
    _fetchSlotsForDate();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  // Tải danh sách khung giờ từ máy chủ
  Future<void> _fetchSlotsForDate() async {
    setState(() {
      _isLoadingSlots = true;
      _slotError = null;
      _selectedStartTime = null;
    });

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

    try {
      final res = await _dio.get('${ApiEndpoints.checkAvailability}?date=$dateStr');
      if (res.data['success'] == true) {
        final List pitchesData = res.data['data'] ?? [];
        _timeRules = res.data['rules'] ?? [];

        // Tìm sân tương ứng linh hoạt (khớp pitch_id hoặc id hoặc tên sân)
        dynamic currentPitch;
        for (var p in pitchesData) {
          final pid = p['pitch_id'] ?? p['id'];
          if (pid.toString() == widget.pitch.id.toString()) {
            currentPitch = p;
            break;
          }
        }

        // Fallback theo tên sân nếu ID có sai lệch
        if (currentPitch == null) {
          for (var p in pitchesData) {
            final pName = (p['pitch_name'] ?? p['name'] ?? '').toString().toLowerCase().trim();
            if (pName == widget.pitch.name.toLowerCase().trim()) {
              currentPitch = p;
              break;
            }
          }
        }

        // Fallback lấy sân đầu tiên nếu vẫn null
        if (currentPitch == null && pitchesData.isNotEmpty) {
          currentPitch = pitchesData.first;
        }

        if (currentPitch != null) {
          setState(() {
            _availableSlots = currentPitch['slots'] ?? [];
          });
        }
      }
    } on DioException catch (e) {
      setState(() {
        _slotError = e.error?.toString() ?? 'Lỗi tải lịch khung giờ.';
      });
    } catch (e) {
      setState(() {
        _slotError = 'Lỗi không xác định: $e';
      });
    } finally {
      setState(() {
        _isLoadingSlots = false;
      });
    }
  }

  // Định dạng ngày tiếng Việt an toàn 100% không lo lỗi LocaleData
  String _formatVietnameseDate(DateTime date) {
    const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    final weekdayName = weekdays[date.weekday - 1];
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year;
    return '$weekdayName, $d/$m/$y';
  }

  // Tính giờ kết thúc dựa trên giờ bắt đầu và thời lượng
  String _calculateEndTime(String start, int durationMinutes) {
    final parts = start.split(':');
    int h = int.parse(parts[0]);
    int m = int.parse(parts[1]);

    int totalMinutes = h * 60 + m + durationMinutes;
    int endH = (totalMinutes ~/ 60) % 24;
    int endM = totalMinutes % 60;

    return '${endH.toString().padLeft(2, '0')}:${endM.toString().padLeft(2, '0')}:00';
  }

  // Tính giá tạm tính theo hệ số (giờ vàng, thứ 7 & CN)
  double _calculateEstimatedPrice() {
    if (_selectedStartTime == null) return 0.0;

    final isWeekend = _selectedDate.weekday == DateTime.saturday || _selectedDate.weekday == DateTime.sunday;
    final startH = int.parse(_selectedStartTime!.split(':')[0]);

    // Tìm hệ số ca tương ứng
    double multiplier = 1.0;
    for (var r in _timeRules) {
      final rStartH = int.parse(r['start_time'].toString().split(':')[0]);
      final rEndH = int.parse(r['end_time'].toString().split(':')[0]);

      if (startH >= rStartH && startH < rEndH) {
        multiplier = isWeekend
            ? double.tryParse(r['weekend_multiplier']?.toString() ?? '1.0') ?? 1.0
            : double.tryParse(r['price_multiplier']?.toString() ?? '1.0') ?? 1.0;
        break;
      }
    }

    final hours = _selectedDuration / 60.0;
    return widget.pitch.priceDefault * hours * multiplier;
  }

  // Chọn ngày đá bóng
  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      builder: (ctx, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              surface: AppColors.surface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchSlotsForDate();
    }
  }

  // Gửi yêu cầu đặt sân
  void _handleSubmitBooking() async {
    if (_selectedStartTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn khung giờ bắt đầu đá bóng!'),
          backgroundColor: AppColors.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final endTime = _calculateEndTime(_selectedStartTime!, _selectedDuration);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;

    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final result = await bookingProvider.createBooking(
      pitchId: widget.pitch.id,
      bookingDate: dateStr,
      startTime: _selectedStartTime!,
      endTime: endTime,
      customerName: user?.fullName,
      customerPhone: user?.phone,
      note: _noteController.text,
    );

    if (!mounted) return;

    if (result['success'] == true) {
      final bookingId = result['data']?['booking_id'] ?? result['data']?['id'] ?? '';
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.check_circle_outline, color: AppColors.success, size: 28),
              SizedBox(width: 10),
              Text('Đặt sân thành công!', style: TextStyle(color: AppColors.textPrimary, fontSize: 18)),
            ],
          ),
          content: Text(
            'Đơn đặt sân #$bookingId của bạn đã được ghi nhận. Bạn có thể mở mã QR vé để check-in tại quầy!',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
                );
              },
              child: const Text('Xem Vé Điện Tử QR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.error_outline, color: AppColors.danger),
              SizedBox(width: 8),
              Text('Đặt sân thất bại', style: TextStyle(color: AppColors.textPrimary, fontSize: 18)),
            ],
          ),
          content: Text(result['message'], style: const TextStyle(color: AppColors.textSecondary)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Đã hiểu', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final estimatedPrice = _calculateEstimatedPrice();
    final isWeekend = _selectedDate.weekday == DateTime.saturday || _selectedDate.weekday == DateTime.sunday;
    final isToday = DateFormat('yyyy-MM-dd').format(_selectedDate) == DateFormat('yyyy-MM-dd').format(DateTime.now());

    // Nhóm các slot theo 4 ca trong ngày
    final Map<String, List<dynamic>> groupedSlots = {
      'Ca Sáng (05:00 - 11:00)': [],
      'Ca Chiều (14:00 - 18:00)': [],
      'Ca Tối - Giờ Vàng (18:00 - 22:00)': [],
      'Ca Đêm (22:00 - 23:00)': [],
    };

    for (var slot in _availableSlots) {
      final shift = slot['shift']?.toString() ?? '';
      if (shift.contains('Sáng')) {
        groupedSlots['Ca Sáng (05:00 - 11:00)']!.add(slot);
      } else if (shift.contains('Chiều')) {
        groupedSlots['Ca Chiều (14:00 - 18:00)']!.add(slot);
      } else if (shift.contains('Tối') || shift.contains('Vàng')) {
        groupedSlots['Ca Tối - Giờ Vàng (18:00 - 22:00)']!.add(slot);
      } else {
        groupedSlots['Ca Đêm (22:00 - 23:00)']!.add(slot);
      }
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Đặt ${widget.pitch.name}',
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Chọn ngày đá bóng
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '1. Chọn ngày đá bóng',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                // Nút chọn nhanh Ngày Mai
                if (isToday)
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedDate = DateTime.now().add(const Duration(days: 1));
                      });
                      _fetchSlotsForDate();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primaryLight),
                      ),
                      child: const Text(
                        'Đặt ngày mai ➔',
                        style: TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  )
                else
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedDate = DateTime.now();
                      });
                      _fetchSlotsForDate();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Hôm nay',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.surfaceLight),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.calendar_today, color: AppColors.primary, size: 20),
                        const SizedBox(width: 12),
                        Text(
                          _formatVietnameseDate(_selectedDate),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    if (isWeekend)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppColors.warning),
                        ),
                        child: const Text(
                          'Cuối tuần',
                          style: TextStyle(color: AppColors.warning, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 2. Chọn thời lượng đá
            const Text(
              '2. Chọn thời lượng trận đấu',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Row(
              children: [60, 90, 120].map((dur) {
                final isSelected = _selectedDuration == dur;
                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () {
                        setState(() {
                          _selectedDuration = dur;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '$dur phút',
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppColors.textSecondary,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              '(${dur / 60} tiếng)',
                              style: TextStyle(
                                color: isSelected ? Colors.white70 : AppColors.textMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // 3. Khung giờ đá
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '3. Chọn khung giờ bắt đầu đá',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                Text(
                  _selectedStartTime != null
                      ? 'Đá đến: ${_calculateEndTime(_selectedStartTime!, _selectedDuration).substring(0, 5)}'
                      : 'Chưa chọn',
                  style: const TextStyle(fontSize: 13, color: AppColors.primaryLight, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Chú thích màu sắc
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildLegend(AppColors.primary, 'Có thể đặt'),
                  _buildLegend(AppColors.danger, 'Đã có người đặt'),
                  _buildLegend(AppColors.textMuted, 'Đã qua'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Hiển thị danh sách khung giờ phân theo từng Ca
            if (_isLoadingSlots)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Column(
                    children: [
                      CircularProgressIndicator(color: AppColors.primary),
                      SizedBox(height: 12),
                      Text('Đang tải lịch sân...', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
              )
            else if (_slotError != null)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Icon(Icons.cloud_off, color: AppColors.danger, size: 36),
                      const SizedBox(height: 8),
                      Text(_slotError!, style: const TextStyle(color: AppColors.danger)),
                      const SizedBox(height: 10),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        onPressed: _fetchSlotsForDate,
                        child: const Text('Tải lại', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              // Lặp qua từng ca trong ngày
              ...groupedSlots.entries.map((entry) {
                final shiftTitle = entry.key;
                final slots = entry.value;

                if (slots.isEmpty) return const SizedBox.shrink();

                final availableCount = slots.where((s) => s['is_available'] == true).length;

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.surfaceLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header của ca
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight.withValues(alpha: 0.5),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              shiftTitle,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: availableCount > 0 ? AppColors.primary.withValues(alpha: 0.2) : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                availableCount > 0 ? '$availableCount slot trống' : 'Hết slot',
                                style: TextStyle(
                                  color: availableCount > 0 ? AppColors.primaryLight : AppColors.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Danh sách nút giờ trong ca
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: slots.map((slot) {
                            final isAvail = slot['is_available'] == true;
                            final isBooked = slot['is_booked'] == true;
                            final isPast = slot['is_past'] == true;
                            final timeText = slot['start_time'].toString().substring(0, 5);
                            final isSelected = _selectedStartTime == slot['start_time'];

                            Color bgColor = AppColors.background;
                            Color textColor = AppColors.textSecondary;
                            Border border = Border.all(color: AppColors.surfaceLight);

                            if (isBooked) {
                              bgColor = AppColors.danger.withValues(alpha: 0.12);
                              textColor = AppColors.danger;
                              border = Border.all(color: AppColors.danger.withValues(alpha: 0.3));
                            } else if (isPast) {
                              bgColor = AppColors.surfaceLight.withValues(alpha: 0.3);
                              textColor = AppColors.textMuted;
                              border = Border.all(color: Colors.transparent);
                            } else if (isAvail) {
                              if (isSelected) {
                                bgColor = AppColors.primary;
                                textColor = Colors.white;
                                border = Border.all(color: AppColors.primaryLight, width: 2);
                              } else {
                                bgColor = AppColors.primary.withValues(alpha: 0.15);
                                textColor = AppColors.primaryLight;
                                border = Border.all(color: AppColors.primary.withValues(alpha: 0.4));
                              }
                            }

                            return InkWell(
                              borderRadius: BorderRadius.circular(10),
                              onTap: isAvail
                                  ? () {
                                      setState(() {
                                        _selectedStartTime = slot['start_time'];
                                      });
                                    }
                                  : null,
                              child: Container(
                                width: 72,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: bgColor,
                                  borderRadius: BorderRadius.circular(10),
                                  border: border,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  timeText,
                                  style: TextStyle(
                                    color: textColor,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    fontSize: 14,
                                    decoration: isBooked ? TextDecoration.lineThrough : null,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: 10),

            // 4. Ghi chú
            const Text(
              '4. Ghi chú thêm (Không bắt buộc)',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _noteController,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Ví dụ: Đặt bóng số 5, mượn áo pitch chia đội...',
                hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 30),
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
        child: SafeArea(
          child: Row(
            children: [
              // Cột hiển thị giá tạm tính
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tổng tiền tạm tính:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    Text(
                      _selectedStartTime != null
                          ? _currencyFormat.format(estimatedPrice)
                          : 'Chưa chọn giờ',
                      style: const TextStyle(
                        color: AppColors.primaryLight,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // Nút xác nhận đặt sân
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _selectedStartTime != null ? _handleSubmitBooking : null,
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('XÁC NHẬN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegend(Color color, String text) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      ],
    );
  }
}
