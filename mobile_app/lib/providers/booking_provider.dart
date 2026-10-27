import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/booking_model.dart';

class BookingProvider with ChangeNotifier {
  List<BookingModel> _myBookings = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<BookingModel> get myBookings => _myBookings;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  final Dio _dio = ApiClient().dio;

  /// Lấy danh sách vé / đơn đặt sân của khách hàng
  Future<void> fetchMyBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _dio.get(ApiEndpoints.myBookings);
      if (res.data['success'] == true) {
        final List list = res.data['data'] ?? [];
        _myBookings = list.map((item) => BookingModel.fromJson(item)).toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.error?.toString() ?? 'Lỗi tải danh sách đơn đặt sân.';
    } catch (e) {
      _errorMessage = 'Lỗi không xác định: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Khách hàng tạo đơn đặt sân trực tuyến
  Future<Map<String, dynamic>> createBooking({
    required int pitchId,
    required String bookingDate,
    required String startTime,
    required String endTime,
    String? customerName,
    String? customerPhone,
    String? note,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _dio.post(ApiEndpoints.createOnlineBooking, data: {
        'pitch_id': pitchId,
        'booking_date': bookingDate,
        'start_time': startTime,
        'end_time': endTime,
        if (customerName != null && customerName.isNotEmpty) 'customer_name': customerName,
        if (customerPhone != null && customerPhone.isNotEmpty) 'customer_phone': customerPhone,
        if (note != null && note.isNotEmpty) 'note': note,
      });

      _isLoading = false;
      notifyListeners();

      if (res.data['success'] == true) {
        // Tải lại danh sách đơn
        fetchMyBookings();
        return {
          'success': true,
          'message': res.data['message'] ?? 'Đặt sân thành công!',
          'data': res.data['data'],
        };
      }
      return {'success': false, 'message': res.data['message'] ?? 'Đặt sân thất bại.'};
    } on DioException catch (e) {
      _isLoading = false;
      notifyListeners();
      final serverMsg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response!.data['message']
          : (e.error?.toString() ?? 'Lỗi kết nối máy chủ.');
      return {'success': false, 'message': serverMsg};
    }
  }

  /// Hủy đơn đặt sân (nếu chưa đến giờ đá)
  Future<Map<String, dynamic>> cancelBooking(int bookingId) async {
    try {
      final res = await _dio.patch(ApiEndpoints.cancelBooking(bookingId));
      if (res.data['success'] == true) {
        await fetchMyBookings();
        return {'success': true, 'message': 'Đã hủy đơn đặt sân thành công.'};
      }
      return {'success': false, 'message': res.data['message'] ?? 'Hủy đơn thất bại.'};
    } on DioException catch (e) {
      return {'success': false, 'message': e.error?.toString() ?? 'Lỗi khi hủy đơn.'};
    }
  }
}

