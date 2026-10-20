import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/user_model.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  String? _token;
  bool _isLoading = false;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _token != null && _user != null;
  bool get isLoading => _isLoading;

  final Dio _dio = ApiClient().dio;

  /// Tự động đăng nhập lại nếu đã có Token lưu trong máy
  Future<bool> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString('auth_token');
    final savedUserJson = prefs.getString('auth_user');

    if (savedToken == null || savedUserJson == null) {
      return false;
    }

    try {
      _token = savedToken;
      _user = UserModel.fromJson(jsonDecode(savedUserJson));
      notifyListeners();

      // Kiểm tra lại tính hợp lệ với server
      final res = await _dio.get(ApiEndpoints.authProfile);
      if (res.data['success'] == true) {
        _user = UserModel.fromJson(res.data['data']);
        await prefs.setString('auth_user', jsonEncode(_user!.toJson()));
        notifyListeners();
        return true;
      }
    } catch (e) {
      // Nếu token hết hạn thì xóa phiên
      await logout();
    }
    return false;
  }

  /// Đăng nhập tài khoản khách hàng
  Future<Map<String, dynamic>> login(String phone, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _dio.post(ApiEndpoints.customerLogin, data: {
        'phone': phone.trim(),
        'password': password.trim(),
      });

      if (res.data['success'] == true) {
        final data = res.data['data'];
        _token = data['token'];
        final userData = data['customer'] ?? data['user'] ?? data;
        _user = UserModel.fromJson(userData);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);
        await prefs.setString('auth_user', jsonEncode(_user!.toJson()));

        _isLoading = false;
        notifyListeners();
        return {'success': true, 'message': 'Đăng nhập thành công!'};
      }
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': res.data['message'] ?? 'Đăng nhập thất bại.'};
    } on DioException catch (e) {
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': e.error?.toString() ?? 'Lỗi kết nối máy chủ.'};
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': 'Lỗi không xác định: $e'};
    }
  }

  /// Đăng ký tài khoản khách hàng mới
  Future<Map<String, dynamic>> register({
    required String phone,
    required String password,
    required String fullName,
    String? email,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _dio.post(ApiEndpoints.customerRegister, data: {
        'phone': phone.trim(),
        'password': password.trim(),
        'full_name': fullName.trim(),
      });

      _isLoading = false;
      notifyListeners();

      if (res.data['success'] == true) {
        return {'success': true, 'message': 'Đăng ký tài khoản thành công!'};
      }
      return {'success': false, 'message': res.data['message'] ?? 'Đăng ký thất bại.'};
    } on DioException catch (e) {
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': e.error?.toString() ?? 'Lỗi kết nối máy chủ.'};
    }
  }

  /// Đăng xuất tài khoản
  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    notifyListeners();
  }
}

