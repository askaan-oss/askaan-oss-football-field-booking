import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';

class AdminBookingsScreen extends StatefulWidget {
  const AdminBookingsScreen({super.key});

  @override
  State<AdminBookingsScreen> createState() => _AdminBookingsScreenState();
}

class _AdminBookingsScreenState extends State<AdminBookingsScreen> {
  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _allBookings = [];
  String _selectedFilter = 'all'; // all, pending, confirmed, checked_in, completed, cancelled
  String _searchQuery = '';
  DateTime? _selectedDate; // Lọc theo ngày (null = tất cả các ngày)

  @override
  void initState() {
    super.initState();
    _fetchBookings();
  }

  Future<void> _fetchBookings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _dio.get(ApiEndpoints.allBookings);
      if (res.data['success'] == true) {
        setState(() {
          _allBookings = res.data['data'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Lỗi tải danh sách đơn: $e';
      });
    }
  }

  Future<void> _updateStatus(int bookingId, String newStatus) async {
    try {
      final res = await _dio.patch(
        ApiEndpoints.updateBookingStatus(bookingId),
        data: {'status': newStatus},
      );

      if (res.data['success'] == true) {
        if (!mounted) return;
        String statusLabel = newStatus;
        if (newStatus == 'confirmed') statusLabel = 'Đã duyệt';
        if (newStatus == 'checked_in') statusLabel = 'Đang đá (Check-in)';
        if (newStatus == 'completed') statusLabel = 'Hoàn tất trận đấu';
        if (newStatus == 'cancelled') statusLabel = 'Đã hủy đơn';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đơn #$bookingId đã chuyển sang: $statusLabel'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchBookings();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi cập nhật trạng thái: $e'), backgroundColor: AppColors.danger),
      );
    }
  }

  void _confirmCompleteBooking(int bookingId, String pitchName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: Colors.greenAccent),
            SizedBox(width: 8),
            Text('Hoàn tất trận đấu', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Xác nhận trận đấu tại đơn #$bookingId ($pitchName) đã kết thúc và chuyển trạng thái sang "Hoàn tất"?',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus(bookingId, 'completed');
            },
            child: const Text('Xác nhận hoàn tất', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmCancelBooking(int bookingId, String pitchName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: AppColors.danger),
            SizedBox(width: 8),
            Text('Hủy đơn đặt sân', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Bạn có chắc chắn muốn hủy đơn đặt sân #$bookingId ($pitchName)?',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus(bookingId, 'cancelled');
            },
            child: const Text('Xác nhận hủy', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _pickCustomDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.surface,
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: AppColors.surface,
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _allBookings.where((b) {
      // 1. Lọc theo trạng thái
      final statusMatch = _selectedFilter == 'all' || (b['status'] ?? '').toString().toLowerCase() == _selectedFilter;

      // 2. Lọc theo thanh tìm kiếm
      final custName = (b['customer_name'] ?? '').toString().toLowerCase();
      final custPhone = (b['customer_phone'] ?? '').toString().toLowerCase();
      final pitchName = (b['pitch_name'] ?? '').toString().toLowerCase();
      final bookingIdStr = (b['id'] ?? '').toString();
      final q = _searchQuery.toLowerCase();
      final searchMatch = _searchQuery.isEmpty ||
          custName.contains(q) ||
          custPhone.contains(q) ||
          pitchName.contains(q) ||
          bookingIdStr.contains(q);

      // 3. Lọc theo ngày
      bool dateMatch = true;
      if (_selectedDate != null) {
        final filterDateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);
        final bookingDateRaw = (b['booking_date'] ?? '').toString();
        final bookingDateStr = bookingDateRaw.split('T')[0];
        dateMatch = bookingDateStr == filterDateStr;
      }

      return statusMatch && searchMatch && dateMatch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('Quản Lý Đơn Đặt Sân', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            icon: const Icon(Icons.refresh, color: AppColors.primaryLight),
            onPressed: _fetchBookings,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Thanh tìm kiếm
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: TextField(
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Tìm theo tên khách, SĐT, mã đơn, tên sân...',
                hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 16, color: AppColors.textMuted),
                        onPressed: () {
                          setState(() {
                            _searchQuery = '';
                          });
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val.trim();
                });
              },
            ),
          ),

          // 2. Thanh lọc theo ngày đá
          _buildDateFilterBar(),

          // 3. Thanh lọc trạng thái 6 nút
          Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildFilterChip('Tất cả (${_allBookings.length})', 'all'),
                _buildFilterChip('Chờ duyệt', 'pending'),
                _buildFilterChip('Đã duyệt', 'confirmed'),
                _buildFilterChip('Đang đá', 'checked_in'),
                _buildFilterChip('Hoàn tất', 'completed'),
                _buildFilterChip('Đã hủy', 'cancelled'),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // 4. Danh sách đơn hiển thị
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _errorMessage != null
                    ? Center(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger)))
                    : filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.inbox_outlined, size: 48, color: AppColors.textMuted),
                                const SizedBox(height: 10),
                                const Text(
                                  'Không tìm thấy đơn đặt sân phù hợp.',
                                  style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                                ),
                                if (_selectedDate != null || _searchQuery.isNotEmpty || _selectedFilter != 'all')
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: TextButton.icon(
                                      onPressed: () {
                                        setState(() {
                                          _selectedDate = null;
                                          _selectedFilter = 'all';
                                          _searchQuery = '';
                                        });
                                      },
                                      icon: const Icon(Icons.filter_alt_off, size: 16),
                                      label: const Text('Xóa bộ lọc'),
                                    ),
                                  ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchBookings,
                            color: AppColors.primary,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              itemCount: filtered.length,
                              itemBuilder: (ctx, idx) {
                                final b = filtered[idx];
                                return _buildBookingCard(b);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  // Widget thanh lọc theo ngày đá
  Widget _buildDateFilterBar() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    final isAllDates = _selectedDate == null;
    final isToday = _selectedDate != null &&
        _selectedDate!.year == today.year &&
        _selectedDate!.month == today.month &&
        _selectedDate!.day == today.day;
    final isTomorrow = _selectedDate != null &&
        _selectedDate!.year == tomorrow.year &&
        _selectedDate!.month == tomorrow.month &&
        _selectedDate!.day == tomorrow.day;
    final isCustom = _selectedDate != null && !isToday && !isTomorrow;

    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      margin: const EdgeInsets.only(bottom: 6),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          // Nút Tất cả ngày
          _buildDateChip(
            label: 'Tất cả ngày',
            isSelected: isAllDates,
            icon: Icons.calendar_view_day,
            onTap: () {
              setState(() {
                _selectedDate = null;
              });
            },
          ),
          const SizedBox(width: 6),

          // Nút Hôm nay
          _buildDateChip(
            label: 'Hôm nay (${DateFormat("dd/MM").format(today)})',
            isSelected: isToday,
            icon: Icons.today,
            onTap: () {
              setState(() {
                _selectedDate = today;
              });
            },
          ),
          const SizedBox(width: 6),

          // Nút Ngày mai
          _buildDateChip(
            label: 'Ngày mai (${DateFormat("dd/MM").format(tomorrow)})',
            isSelected: isTomorrow,
            icon: Icons.event,
            onTap: () {
              setState(() {
                _selectedDate = tomorrow;
              });
            },
          ),
          const SizedBox(width: 6),

          // Nút Chọn ngày khác (DatePicker)
          _buildDateChip(
            label: isCustom
                ? 'Ngày: ${DateFormat("dd/MM/yyyy").format(_selectedDate!)}'
                : 'Chọn ngày...',
            isSelected: isCustom,
            icon: Icons.date_range,
            onTap: _pickCustomDate,
            hasClear: isCustom,
            onClear: () {
              setState(() {
                _selectedDate = null;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDateChip({
    required String label,
    required bool isSelected,
    required IconData icon,
    required VoidCallback onTap,
    bool hasClear = false,
    VoidCallback? onClear,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.25) : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.surfaceLight,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? AppColors.primaryLight : AppColors.textSecondary),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            if (hasClear && onClear != null) ...[
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onClear,
                child: const Icon(Icons.cancel, size: 14, color: Colors.white70),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 6.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          setState(() {
            _selectedFilter = value;
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

  Widget _buildBookingCard(dynamic b) {
    final status = (b['status'] ?? '').toString().toLowerCase();
    final price = double.tryParse((b['total_price'] ?? 0).toString()) ?? 0.0;
    final isPending = status == 'pending';
    final isConfirmed = status == 'confirmed';
    final isCheckedIn = status == 'checked_in';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isPending
              ? Colors.orangeAccent.withValues(alpha: 0.6)
              : isCheckedIn
                  ? Colors.cyan.withValues(alpha: 0.6)
                  : AppColors.surfaceLight,
          width: (isPending || isCheckedIn) ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header đơn: ID và Badge trạng thái
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Đơn #${b['id']} - ${b['pitch_name'] ?? "Sân bóng"}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              _buildStatusBadge(status),
            ],
          ),
          const SizedBox(height: 8),

          // Thông tin người đặt
          Row(
            children: [
              const Icon(Icons.person, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '${b['customer_name'] ?? "Khách"} - SĐT: ${b['customer_phone'] ?? "N/A"}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // Khung giờ và ngày đá
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                '${b['booking_date']?.toString().split("T")[0]} | ${b['start_time']} - ${b['end_time']}',
                style: const TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Giá tiền & Trạng thái thanh toán
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _currencyFormat.format(price),
                style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: b['payment_status'] == 'paid'
                      ? AppColors.success.withValues(alpha: 0.15)
                      : b['payment_status'] == 'deposited'
                          ? Colors.cyan.withValues(alpha: 0.15)
                          : Colors.grey.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  b['payment_status'] == 'paid'
                      ? 'Đã thanh toán 100%'
                      : b['payment_status'] == 'deposited'
                          ? 'Đã đặt cọc'
                          : 'Chưa thanh toán',
                  style: TextStyle(
                    color: b['payment_status'] == 'paid'
                        ? AppColors.success
                        : b['payment_status'] == 'deposited'
                            ? Colors.cyanAccent
                            : Colors.grey,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          // CÁC NÚT THAO TÁC TRẠNG THÁI THEO TỪNG VÒNG ĐỜI
          // 1. Nếu Chờ duyệt (pending): Từ chối / Duyệt đơn
          if (isPending) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _confirmCancelBooking(b['id'], b['pitch_name'] ?? 'Sân'),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Từ chối', style: TextStyle(fontSize: 12)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _updateStatus(b['id'], 'confirmed'),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Duyệt đơn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ]
          // 2. Nếu Đã duyệt (confirmed): Hủy đơn / Vào đá (Check-in)
          else if (isConfirmed) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _confirmCancelBooking(b['id'], b['pitch_name'] ?? 'Sân'),
                  icon: const Icon(Icons.close, size: 14),
                  label: const Text('Hủy đơn', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.cyan.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _updateStatus(b['id'], 'checked_in'),
                  icon: const Icon(Icons.sports_soccer, size: 15),
                  label: const Text('Vào đá (Check-in)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ]
          // 3. Nếu Đang đá (checked_in): HOÀN THÀNH ĐƠN
          else if (isCheckedIn) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _confirmCompleteBooking(b['id'], b['pitch_name'] ?? 'Sân bóng'),
                  icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.greenAccent),
                  label: const Text(
                    'Hoàn thành đơn',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    String text = 'Chờ duyệt';

    switch (status) {
      case 'confirmed':
        color = AppColors.primary;
        text = 'Đã duyệt';
        break;
      case 'checked_in':
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
