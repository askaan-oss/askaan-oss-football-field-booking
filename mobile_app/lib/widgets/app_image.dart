import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../core/constants.dart';

/// Widget hiển thị hình ảnh đa năng:
/// 1. Tự động nhận diện chuỗi Base64 (Data URI hoặc raw Base64) -> Hiển thị tức thì từ bộ nhớ (Image.memory)
/// 2. Hỗ trợ URL Network (http://, https://) -> Tự động chuyển localhost sang 10.0.2.2 trên Android Emulator
/// 3. Fallback thông minh khi ảnh null hoặc lỗi mạng
class AppImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const AppImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    Widget imageWidget = _buildImageContent();

    if (borderRadius != null) {
      imageWidget = ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }

    return SizedBox(
      width: width,
      height: height,
      child: imageWidget,
    );
  }

  Widget _buildImageContent() {
    final raw = imageUrl?.trim();

    if (raw == null || raw.isEmpty) {
      return _buildPlaceholder();
    }

    // 1. Kiểm tra nếu là chuỗi Base64
    if (raw.startsWith('data:image') || (!raw.startsWith('http://') && !raw.startsWith('https://') && raw.length > 50)) {
      try {
        String base64Data = raw;
        if (raw.contains(',')) {
          base64Data = raw.split(',')[1];
        }
        // Xóa các ký tự xuống dòng / khoảng trắng nếu có và chuẩn hóa padding
        base64Data = base64Data.replaceAll('\n', '').replaceAll('\r', '').replaceAll(' ', '');
        final normalized = base64.normalize(base64Data);
        final bytes = base64Decode(normalized);

        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          gaplessPlayback: true,
          errorBuilder: (context, error, stackTrace) {
            debugPrint('[AppImage] Lỗi render Image.memory: $error');
            return _buildPlaceholder();
          },
        );
      } catch (e) {
        debugPrint('[AppImage] Lỗi decode Base64: $e');
        return _buildPlaceholder();
      }
    }

    // 2. Nếu là URL mạng: Tự động điều chỉnh host cho Android
    String targetUrl = raw;
    if (!kIsWeb && Platform.isAndroid) {
      if (targetUrl.contains('localhost:5000')) {
        final host = ApiConstants.isPhysicalDevice ? '${ApiConstants.localLanIp}:5000' : '10.0.2.2:5000';
        targetUrl = targetUrl.replaceAll('localhost:5000', host);
      } else if (targetUrl.contains('127.0.0.1:5000')) {
        final host = ApiConstants.isPhysicalDevice ? '${ApiConstants.localLanIp}:5000' : '10.0.2.2:5000';
        targetUrl = targetUrl.replaceAll('127.0.0.1:5000', host);
      }
    }

    return Image.network(
      targetUrl,
      width: width,
      height: height,
      fit: fit,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Container(
          width: width,
          height: height,
          color: AppColors.surfaceLight.withValues(alpha: 0.3),
          child: const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        debugPrint('[AppImage] Lỗi load ảnh mạng: $error');
        return _buildPlaceholder();
      },
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.green.shade900.withValues(alpha: 0.7),
            AppColors.surfaceLight,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sports_soccer, size: 36, color: AppColors.primaryLight),
            SizedBox(height: 6),
            Text(
              'Sân Bóng Mini',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

