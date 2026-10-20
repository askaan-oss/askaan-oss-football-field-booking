import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/api_client.dart';
import '../core/api_endpoints.dart';
import '../models/pitch_model.dart';

class PitchProvider with ChangeNotifier {
  List<PitchModel> _pitches = [];
  PitchModel? _selectedPitch;
  bool _isLoading = false;
  String? _errorMessage;

  List<PitchModel> get pitches => _pitches;
  PitchModel? get selectedPitch => _selectedPitch;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  final Dio _dio = ApiClient().dio;

  /// Tải danh sách sân bóng từ Backend
  Future<void> fetchPitches({String? type}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _dio.get(ApiEndpoints.pitches, queryParameters: {
        if (type != null && type.isNotEmpty && type != 'all') 'type': type,
      });

      if (res.data['success'] == true) {
        final List list = res.data['data'] ?? [];
        _pitches = list.map((item) => PitchModel.fromJson(item)).toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.error?.toString() ?? 'Lỗi tải danh sách sân bóng.';
    } catch (e) {
      _errorMessage = 'Lỗi không xác định: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Tải thông tin chi tiết một sân bóng (bao gồm cả ảnh gallery và reviews)
  Future<PitchModel?> fetchPitchDetail(int pitchId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _dio.get(ApiEndpoints.pitchDetail(pitchId));
      if (res.data['success'] == true) {
        _selectedPitch = PitchModel.fromJson(res.data['data']);
        return _selectedPitch;
      }
    } catch (e) {
      debugPrint('Lỗi tải chi tiết sân: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }
}

