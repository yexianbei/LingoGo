import 'package:flutter/services.dart';
import 'dart:io';

/// 音频提取服务
class AudioExtractorService {
  static const MethodChannel _channel = MethodChannel('audio_extractor');
  Function(double)? _progressCallback;

  /// 提取音频
  /// [videoPath] 视频文件路径
  /// [outputPath] 输出音频文件路径
  /// [onProgress] 进度回调 (0.0 - 1.0)
  Future<String?> extractAudio(
    String videoPath,
    String outputPath, {
    Function(double)? onProgress,
  }) async {
    try {
      // 设置进度回调
      _progressCallback = onProgress;
      _channel.setMethodCallHandler(_handleMethodCall);

      final String? result = await _channel.invokeMethod<String>(
        'extractAudio',
        {
          'videoPath': videoPath,
          'outputPath': outputPath,
        },
      );

      return result;
    } on PlatformException catch (e) {
      throw Exception('提取音频失败: ${e.message}');
    } finally {
      _progressCallback = null;
    }
  }

  /// Generate thumbnail from video (First frame)
  /// Returns path to the generated image
  Future<String?> generateThumbnail(String videoPath) async {
    try {
      final String? result = await _channel.invokeMethod<String>(
        'generateThumbnail',
        {'videoPath': videoPath},
      );
      return result;
    } on PlatformException catch (e) {
      // Log or rethrow?
      print('Thumbnail generation failed: ${e.message}');
      return null;
    }
  }

  Future<dynamic> _handleMethodCall(MethodCall call) async {
    if (call.method == 'onProgress' && call.arguments is double) {
      _progressCallback?.call(call.arguments);
    }
  }
}
