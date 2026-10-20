import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConstants {
  // IP LAN hiện tại của máy tính chủ (dùng khi test trên điện thoại thật cùng mạng Wi-Fi)
  static const String localLanIp = '192.168.2.20';

  // Cổng máy chủ backend Node.js
  static const String port = '5000';

  // Đổi thành true nếu bạn test trên điện thoại thật cắm cáp / Wi-Fi
  static bool isPhysicalDevice = false;

  /// Tự động xác định Base URL phù hợp với từng môi trường chạy:
  /// - Android Emulator (máy ảo): Dùng 10.0.2.2 trỏ về localhost máy tính
  /// - Web / Windows / macOS: Dùng localhost
  /// - Điện thoại thật Android/iOS: Dùng IP LAN nội bộ máy tính
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:$port/api';
    }
    if (Platform.isAndroid) {
      if (isPhysicalDevice) {
        return 'http://$localLanIp:$port/api';
      }
      return 'http://10.0.2.2:$port/api';
    }
    return 'http://localhost:$port/api';
  }

  /// Máy chủ gốc để tải ảnh tĩnh (/uploads/...)
  static String get hostUrl {
    final base = baseUrl;
    return base.replaceAll('/api', '');
  }

  /// Hàm chuẩn hóa URL hình ảnh từ Backend
  static String formatImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Nếu là đường dẫn cục bộ trên server
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$hostUrl$cleanPath';
  }
}

