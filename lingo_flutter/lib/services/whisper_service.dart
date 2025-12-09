import 'package:flutter/services.dart';
import '../core/utils/log.dart';

/// Whisper 语音转文本服务
class WhisperService {
  static const MethodChannel _channel = MethodChannel('whisper_transcribe');

  /// 获取 Whisper 模型路径
  Future<String?> getModelPath() async {
    try {
      final String? result = await _channel.invokeMethod<String>('getModelPath');
      return result;
    } on PlatformException catch (e) {
      Log.e('WhisperService', '获取模型路径失败', e);
      return null;
    }
  }

  /// 加载 Whisper 模型
  /// [modelPath] 模型文件路径
  Future<bool> loadModel(String modelPath) async {
    try {
      final bool result = await _channel.invokeMethod<bool>(
        'loadModel',
        {'modelPath': modelPath},
      ) ?? false;
      return result;
    } on PlatformException catch (e) {
      Log.e('WhisperService', '加载模型失败', e);
      return false;
    }
  }

  /// 转录音频文件
  /// [audioPath] 音频文件路径
  Future<String?> transcribeAudio(String audioPath) async {
    try {
      final String? result = await _channel.invokeMethod<String>(
        'transcribeAudio',
        {'audioPath': audioPath},
      );
      return result;
    } on PlatformException catch (e) {
      Log.e('WhisperService', '转录音频失败', e);
      return null;
    }
  }
}
