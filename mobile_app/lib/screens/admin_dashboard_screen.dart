import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import 'admin_bookings_screen.dart';
import 'admin_pitches_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final Dio _dio = ApiClient().dio;
  final NumberFormat _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

  bool _isLoading = true;
  String? _errorMessage;

  // Dữ liệu thô từ backend
  List<dynamic> _rawBookings = [];

  // Tổng quan toàn hệ thống (All-time & Urgent)
  double _totalRevenue = 0;
  double _todayRevenue = 0;
  int _totalBookings = 0;
  int _pendingCount = 0;
  int _confirmedCount = 0;
  int _checkedInCount = 0;
  int _completedCount = 0;
  int _cancelledCount = 0;

  // BỘ LỌC DOANH THU (Quick Revenue Filter): 'today', 'day', 'month', 'year', 'all'
  String _revenueFilterMode = 'today';
  DateTime _selectedCustomDay = DateTime.now();
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  // Các chỉ số tính toán tự động theo bộ lọc thời gian
  double _filteredRevenue = 0;
  int _filteredBookingCount = 0;
  int _filteredCompletedCount = 0;
  double _filteredAvgPerBooking = 0;

  // Doanh thu 7 ngày gần nhất
  List<Map<String, dynamic>> _sevenDaysRevenue = [];

  // Danh sách các đơn chờ duyệt nhanh
  List<dynamic> _pendingBookings = [];

  // Danh sách nhân viên trực ban
  List<dynamic> _staffList = [];

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _dio.get(ApiEndpoints.allBookings),
        _dio.get(ApiEndpoints.staffList).catchError((_) => Response(requestOptions: RequestOptions(path: ''), data: {'success': false, 'data': []})),
      ]);

      final bookingsRes = results[0];
      final staffRes = results[1];

      if (bookingsRes.data['success'] == true) {
        _rawBookings = bookingsRes.data['data'] ?? [];
        _calculateStats(_rawBookings);
      }

      if (staffRes.data['success'] == true) {
        _staffList = staffRes.data['data'] ?? [];
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Lỗi tải dữ liệu bảng điều hành: $e';
      });
    }
  }

  void _calculateStats(List bookings) {
    _totalBookings = bookings.length;
    _totalRevenue = 0;
    _todayRevenue = 0;
    _pendingCount = 0;
    _confirmedCount = 0;
    _checkedInCount = 0;
    _completedCount = 0;
    _cancelledCount = 0;
    _pendingBookings = [];

    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);

    // Chuẩn bị khung 7 ngày gần nhất
    Map<String, double> last7DaysMap = {};
    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dateStr = DateFormat('yyyy-MM-dd').format(date);
      last7DaysMap[dateStr] = 0.0;
    }

    for (var b in bookings) {
      final status = (b['status'] ?? '').toString().toLowerCase();
      final price = double.tryParse((b['total_price'] ?? 0).toString()) ?? 0.0;
      final bDate = (b['booking_date'] ?? '').toString().split('T')[0];

      if (status == 'pending') {
        _pendingCount++;
        _pendingBookings.add(b);
      } else if (status == 'confirmed') {
        _confirmedCount++;
      } else if (status == 'checked_in') {
        _checkedInCount++;
      } else if (status == 'completed') {
        _completedCount++;
      } else if (status == 'cancelled') {
        _cancelledCount++;
      }

      if (status != 'cancelled') {
        _totalRevenue += price;
        if (bDate == todayStr) {
          _todayRevenue += price;
        }

        if (last7DaysMap.containsKey(bDate)) {
          last7DaysMap[bDate] = (last7DaysMap[bDate] ?? 0) + price;
        }
      }
    }

    _sevenDaysRevenue = last7DaysMap.entries.map((e) {
      final d = DateTime.parse(e.key);
      final label = DateFormat('dd/MM').format(d);
      return {
        'date': e.key,
        'label': label,
        'amount': e.value,
      };
    }).toList();

    // Tính toán lại các thẻ thống kê theo bộ lọc thời gian
    _recomputeFilteredRevenue();
  }

  // TÍNH TOÁN DOANH THU & CHỈ SỐ THEO BỘ LỌC (NGÀY / THÁNG / NĂM / TẤT CẢ)
  void _recomputeFilteredRevenue() {
    _filteredRevenue = 0;
    _filteredBookingCount = 0;
    _filteredCompletedCount = 0;

    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final customDayStr = DateFormat('yyyy-MM-dd').format(_selectedCustomDay);
    final monthPrefix = '$_selectedYear-${_selectedMonth.toString().padLeft(2, '0')}';
    final yearPrefix = '$_selectedYear-';

    for (var b in _rawBookings) {
      final status = (b['status'] ?? '').toString().toLowerCase();
      final price = double.tryParse((b['total_price'] ?? 0).toString()) ?? 0.0;
      final bDate = (b['booking_date'] ?? '').toString().split('T')[0];

      bool match = false;
      if (_revenueFilterMode == 'today') {
        match = (bDate == todayStr);
      } else if (_revenueFilterMode == 'day') {
        match = (bDate == customDayStr);
      } else if (_revenueFilterMode == 'month') {
        match = bDate.startsWith(monthPrefix);
      } else if (_revenueFilterMode == 'year') {
        match = bDate.startsWith(yearPrefix);
      } else if (_revenueFilterMode == 'all') {
        match = true;
      }

      if (match) {
        _filteredBookingCount++;
        if (status == 'completed') {
          _filteredCompletedCount++;
        }
        if (status != 'cancelled') {
          _filteredRevenue += price;
        }
      }
    }

    _filteredAvgPerBooking = _filteredBookingCount > 0 ? (_filteredRevenue / _filteredBookingCount) : 0;
  }

  String _getFilterLabel() {
    switch (_revenueFilterMode) {
      case 'today':
        return 'Hôm nay';
      case 'day':
        return DateFormat('dd/MM').format(_selectedCustomDay);
      case 'month':
        return 'T$_selectedMonth/$_selectedYear';
      case 'year':
        return 'Năm $_selectedYear';
      case 'all':
      default:
        return 'Tất cả';
    }
  }

  String _getFilterFullDescription() {
    switch (_revenueFilterMode) {
      case 'today':
        return 'Hôm nay (${DateFormat('dd/MM/yyyy').format(DateTime.now())})';
      case 'day':
        return 'Ngày ${DateFormat('dd/MM/yyyy').format(_selectedCustomDay)}';
      case 'month':
        return 'Tháng ${_selectedMonth.toString().padLeft(2, '0')}/$_selectedYear';
      case 'year':
        return 'Năm $_selectedYear';
      case 'all':
      default:
        return 'Toàn bộ thời gian hoạt động';
    }
  }

  // Duyệt nhanh đơn đặt sân
  Future<void> _handleUpdateStatus(int bookingId, String status) async {
    try {
      final res = await _dio.patch(
        ApiEndpoints.updateBookingStatus(bookingId),
        data: {'status': status},
      );

      if (res.data['success'] == true) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đơn #$bookingId đã chuyển sang: $status'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _fetchDashboardData();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi cập nhật: $e'), backgroundColor: AppColors.danger),
      );
    }
  }

  // Chọn ngày bất kỳ
  Future<void> _pickCustomDay() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedCustomDay,
      firstDate: DateTime(now.year - 3),
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
        _selectedCustomDay = picked;
        _revenueFilterMode = 'day';
        _recomputeFilteredRevenue();
      });
    }
  }

  // Modal chọn Tháng & Năm
  void _showMonthPicker() {
    int tempMonth = _selectedMonth;
    int tempYear = _selectedYear;
    final currentYear = DateTime.now().year;
    final years = List.generate(5, (i) => currentYear - 2 + i);

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Chọn Tháng & Năm',
                        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: DropdownButton<int>(
                          value: tempYear,
                          dropdownColor: AppColors.surfaceLight,
                          underline: const SizedBox(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          items: years.map((y) => DropdownMenuItem(value: y, child: Text('Năm $y'))).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => tempYear = val);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Chọn tháng cần lọc:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  const SizedBox(height: 10),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 2.0,
                    ),
                    itemCount: 12,
                    itemBuilder: (c, idx) {
                      final m = idx + 1;
                      final isSelected = m == tempMonth;
                      return InkWell(
                        onTap: () {
                          setModalState(() => tempMonth = m);
                          setState(() {
                            _selectedMonth = tempMonth;
                            _selectedYear = tempYear;
                            _revenueFilterMode = 'month';
                            _recomputeFilteredRevenue();
                          });
                          Navigator.pop(ctx);
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : Colors.transparent,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Thg $m',
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppColors.textSecondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Modal chọn Năm
  void _showYearPicker() {
    final currentYear = DateTime.now().year;
    final years = List.generate(6, (i) => currentYear - 3 + i);

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Chọn Năm Cần Xem Doanh Thu',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 14),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 2.2,
                ),
                itemCount: years.length,
                itemBuilder: (c, idx) {
                  final y = years[idx];
                  final isSelected = y == _selectedYear;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedYear = y;
                        _revenueFilterMode = 'year';
                        _recomputeFilteredRevenue();
                      });
                      Navigator.pop(ctx);
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : Colors.transparent,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Năm $y',
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text(
          'Bảng Điều Hành Chủ Sân',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            tooltip: 'Làm mới dữ liệu',
            icon: const Icon(Icons.refresh, color: AppColors.primaryLight),
            onPressed: _fetchDashboardData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null
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
                          onPressed: _fetchDashboardData,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  color: AppColors.primary,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Thẻ Lời chào và Trạng thái
                        _buildWelcomeBanner(),
                        const SizedBox(height: 16),

                        // PHÂN HỆ THẺ TÓM TẮT DOANH SỐ CÓ LỌC THEO NGÀY / THÁNG / NĂM
                        _buildQuickRevenueSection(),
                        const SizedBox(height: 20),

                        // Phân tích trạng thái đơn hàng
                        _buildStatusBreakdown(),
                        const SizedBox(height: 20),

                        // Biểu đồ Doanh thu 7 Ngày gần nhất
                        _buildRevenueChart(),
                        const SizedBox(height: 20),

                        // Phím tắt điều hành nhanh
                        _buildQuickActionHub(),
                        const SizedBox(height: 20),

                        // Danh sách đơn chờ duyệt nhanh
                        _buildPendingApprovalsSection(),
                        const SizedBox(height: 30),
                      ],
                    ),
                  ),
                ),
    );
  }

  // Banner chào mừng chủ sân
  Widget _buildWelcomeBanner() {
    final nowStr = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(DateTime.now());
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.25),
            AppColors.surface,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.analytics, color: AppColors.primaryLight, size: 26),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Báo Cáo Điều Hành Hệ Thống',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  nowStr,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // KHU VỰC THẺ TÓM TẮT DOANH SỐ CÓ BỘ LỌC THỜI GIAN (QUICK REVENUE CARDS)
  Widget _buildQuickRevenueSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tiêu đề & Mô tả mốc thời gian đang lọc
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Tóm Tắt Doanh Số & Hiệu Suất',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.4)),
              ),
              child: Text(
                _getFilterFullDescription(),
                style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Thanh chọn chế độ lọc: Hôm nay | Theo Ngày | Theo Tháng | Theo Năm | Tất cả
        Container(
          height: 38,
          margin: const EdgeInsets.only(bottom: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildFilterModeChip('Hôm nay', 'today', Icons.today),
              const SizedBox(width: 6),
              _buildFilterModeChip('Theo Ngày', 'day', Icons.calendar_today, onTap: () {
                if (_revenueFilterMode == 'day') {
                  _pickCustomDay();
                } else {
                  setState(() {
                    _revenueFilterMode = 'day';
                    _recomputeFilteredRevenue();
                  });
                }
              }),
              const SizedBox(width: 6),
              _buildFilterModeChip('Theo Tháng', 'month', Icons.calendar_month, onTap: () {
                _showMonthPicker();
              }),
              const SizedBox(width: 6),
              _buildFilterModeChip('Theo Năm', 'year', Icons.date_range, onTap: () {
                _showYearPicker();
              }),
              const SizedBox(width: 6),
              _buildFilterModeChip('Tất cả', 'all', Icons.all_inclusive),
            ],
          ),
        ),

        // Thanh thông báo & nút đổi mốc thời gian nhanh khi đang ở chế độ Ngày/Tháng/Năm
        if (_revenueFilterMode == 'day' || _revenueFilterMode == 'month' || _revenueFilterMode == 'year')
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.surfaceLight),
            ),
            child: Row(
              children: [
                Icon(
                  _revenueFilterMode == 'day'
                      ? Icons.event
                      : _revenueFilterMode == 'month'
                          ? Icons.calendar_month
                          : Icons.date_range,
                  size: 16,
                  color: AppColors.primaryLight,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _revenueFilterMode == 'day'
                        ? 'Đang xem ngày: ${DateFormat("dd/MM/yyyy").format(_selectedCustomDay)}'
                        : _revenueFilterMode == 'month'
                            ? 'Đang xem: Tháng ${_selectedMonth.toString().padLeft(2, '0')}/$_selectedYear'
                            : 'Đang xem: Năm $_selectedYear',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
                InkWell(
                  onTap: () {
                    if (_revenueFilterMode == 'day') {
                      _pickCustomDay();
                    } else if (_revenueFilterMode == 'month') {
                      _showMonthPicker();
                    } else {
                      _showYearPicker();
                    }
                  },
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Text(
                      'Đổi mốc ▾',
                      style: TextStyle(color: AppColors.primaryLight, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),

        // LƯỚI 4 THẺ THỐNG KÊ DOANH SỐ ĐỘNG
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.45,
          children: [
            // Thẻ 1: Doanh Thu
            _buildStatCard(
              title: 'Doanh Thu (${_getFilterLabel()})',
              value: _currencyFormat.format(_filteredRevenue),
              icon: Icons.account_balance_wallet,
              color: Colors.greenAccent,
            ),
            // Thẻ 2: Lượt Đặt Sân
            _buildStatCard(
              title: 'Lượt Đặt (${_getFilterLabel()})',
              value: '$_filteredBookingCount lượt',
              icon: Icons.calendar_month,
              color: Colors.amberAccent,
            ),
            // Thẻ 3: Đã Hoàn Tất
            _buildStatCard(
              title: 'Đã Hoàn Tất',
              value: '$_filteredCompletedCount trận',
              icon: Icons.check_circle_outline,
              color: Colors.cyanAccent,
            ),
            // Thẻ 4: Trung bình / Đơn
            _buildStatCard(
              title: 'TB / Lượt Đặt',
              value: _currencyFormat.format(_filteredAvgPerBooking),
              icon: Icons.trending_up,
              color: Colors.purpleAccent,
            ),
          ],
        ),

        // Thanh tóm tắt tích lũy toàn hệ thống
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tổng tích lũy: ${_currencyFormat.format(_totalRevenue)}',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
              ),
              Text(
                'Chờ duyệt: $_pendingCount đơn',
                style: TextStyle(
                  color: _pendingCount > 0 ? Colors.orangeAccent : AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterModeChip(String label, String mode, IconData icon, {VoidCallback? onTap}) {
    final isSelected = _revenueFilterMode == mode;
    return InkWell(
      onTap: onTap ??
          () {
            setState(() {
              _revenueFilterMode = mode;
              _recomputeFilteredRevenue();
            });
          },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.surfaceLight,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: isSelected ? Colors.white : AppColors.textSecondary),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.textSecondary,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    bool isAlert = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isAlert ? Colors.orangeAccent.withValues(alpha: 0.6) : AppColors.surfaceLight,
          width: isAlert ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(icon, color: color, size: 18),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                color: isAlert ? Colors.orangeAccent : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Phân tích trạng thái đơn hàng
  Widget _buildStatusBreakdown() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Phân Bổ Trạng Thái Đơn',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniStatusItem('Chờ duyệt', _pendingCount, Colors.orangeAccent),
              _buildMiniStatusItem('Đã duyệt', _confirmedCount, AppColors.primary),
              _buildMiniStatusItem('Đang đá', _checkedInCount, Colors.cyan),
              _buildMiniStatusItem('Hoàn tất', _completedCount, Colors.green),
              _buildMiniStatusItem('Đã hủy', _cancelledCount, AppColors.danger),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStatusItem(String label, int count, Color color) {
    return Column(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 1.5),
          ),
          child: Center(
            child: Text(
              '$count',
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 10)),
      ],
    );
  }

  // Biểu đồ Doanh thu 7 ngày gần nhất
  Widget _buildRevenueChart() {
    double maxAmount = 1;
    for (var d in _sevenDaysRevenue) {
      if ((d['amount'] as double) > maxAmount) {
        maxAmount = d['amount'] as double;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Biến Động Doanh Thu 7 Ngày',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Icon(Icons.bar_chart, color: AppColors.primaryLight, size: 20),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: _sevenDaysRevenue.map((d) {
                final amount = d['amount'] as double;
                final ratio = maxAmount > 0 ? (amount / maxAmount).clamp(0.08, 1.0) : 0.08;
                final isToday = d['date'] == DateFormat('yyyy-MM-dd').format(DateTime.now());

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (amount > 0)
                          Text(
                            '${(amount / 1000).round()}k',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 9),
                          ),
                        const SizedBox(height: 4),
                        Container(
                          height: 70 * ratio,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isToday
                                  ? [Colors.cyanAccent, AppColors.primary]
                                  : [AppColors.primary, AppColors.primary.withValues(alpha: 0.4)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          d['label'],
                          style: TextStyle(
                            color: isToday ? Colors.cyanAccent : AppColors.textSecondary,
                            fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // Phím tắt điều hành nhanh
  Widget _buildQuickActionHub() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Công Cụ Quản Lý Nhanh',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionTile(
                title: 'Duyệt Đơn',
                subtitle: '$_pendingCount đơn chờ',
                icon: Icons.rule,
                color: Colors.orangeAccent,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AdminBookingsScreen()),
                  ).then((_) => _fetchDashboardData());
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionTile(
                title: 'Bảo Trì Sân',
                subtitle: 'Gạt tắt mở sân',
                icon: Icons.handyman,
                color: Colors.cyanAccent,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AdminPitchesScreen()),
                  ).then((_) => _fetchDashboardData());
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: _showStaffShiftDialog,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surfaceLight),
            ),
            child: Row(
              children: [
                const Icon(Icons.badge, color: AppColors.primaryLight, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Theo Dõi Ca Trực Nhân Viên',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        '${_staffList.length} nhân sự trong hệ thống',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textSecondary),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.surfaceLight),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Danh sách đơn chờ duyệt nhanh
  Widget _buildPendingApprovalsSection() {
    if (_pendingBookings.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(
          child: Column(
            children: [
              Icon(Icons.check_circle_outline, color: AppColors.success, size: 36),
              SizedBox(height: 8),
              Text(
                'Tất cả đơn đặt đã được duyệt!',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
              SizedBox(height: 2),
              Text(
                'Hiện không có đơn nào đang chờ xử lý.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Đơn Chờ Duyệt Cần Xử Lý Ngay',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.orangeAccent.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${_pendingBookings.length} đơn',
                style: const TextStyle(color: Colors.orangeAccent, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _pendingBookings.length > 5 ? 5 : _pendingBookings.length,
          itemBuilder: (ctx, idx) {
            final b = _pendingBookings[idx];
            final price = double.tryParse((b['total_price'] ?? 0).toString()) ?? 0.0;

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orangeAccent.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Đơn #${b['id']} - ${b['pitch_name'] ?? "Sân bóng"}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        _currencyFormat.format(price),
                        style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Khách: ${b['customer_name'] ?? "Khách"} (${b['customer_phone'] ?? ""})',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Ngày: ${b['booking_date']?.toString().split("T")[0]} | Giờ: ${b['start_time']} - ${b['end_time']}',
                    style: const TextStyle(color: AppColors.primaryLight, fontSize: 12),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                        onPressed: () => _handleUpdateStatus(b['id'], 'cancelled'),
                        icon: const Icon(Icons.cancel, size: 16),
                        label: const Text('Từ chối', style: TextStyle(fontSize: 12)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () => _handleUpdateStatus(b['id'], 'confirmed'),
                        icon: const Icon(Icons.check, size: 16),
                        label: const Text('Duyệt đơn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  // Modal xem ca trực nhân viên
  void _showStaffShiftDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.badge, color: AppColors.primaryLight),
            SizedBox(width: 8),
            Text('Ca Trực Nhân Viên', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: _staffList.isEmpty
              ? const Text('Chưa có nhân viên nào trong danh sách.', style: TextStyle(color: AppColors.textSecondary))
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: _staffList.length,
                  separatorBuilder: (_, __) => const Divider(color: AppColors.surfaceLight),
                  itemBuilder: (c, idx) {
                    final s = _staffList[idx];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                        backgroundColor: AppColors.surfaceLight,
                        child: Icon(Icons.person, color: AppColors.primaryLight, size: 20),
                      ),
                      title: Text(s['full_name'] ?? s['username'], style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: Text('Tài khoản: ${s['username']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          s['shift_assigned'] ?? 'Chưa xếp ca',
                          style: const TextStyle(color: AppColors.primaryLight, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Đóng', style: TextStyle(color: AppColors.primaryLight)),
          ),
        ],
      ),
    );
  }
}
