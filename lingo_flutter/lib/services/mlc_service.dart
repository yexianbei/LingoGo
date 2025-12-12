import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import '../core/utils/log.dart';
import '../data/models/mlc_model.dart';

class MLCService {
  static const MethodChannel _channel = MethodChannel('mlc_chat');
  static const EventChannel _eventChannel = EventChannel('mlc_chat/events');
  
  StreamSubscription<dynamic>? _eventSubscription;
  StreamController<String>? _streamController;
  
  // 加载应用配置
  Future<List<MLCModel>> loadAppConfig() async {
    try {
      final String? result = await _channel.invokeMethod('loadAppConfig');
      if (result == null || result.isEmpty) {
        Log.w('MLCService', 'loadAppConfig returned empty result');
        return [];
      }
      final List<dynamic> jsonList = json.decode(result) as List<dynamic>;
      return jsonList.map((json) => MLCModel.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e, stackTrace) {
      Log.e('MLCService', 'Error loading app config', e, stackTrace);
      return [];
    }
  }
  
  // 加载模型
  Future<bool> loadModel({
    required String modelID,
    required String modelLib,
    required String modelPath,
    required int estimatedVRAMReq,
  }) async {
    try {
      final bool? result = await _channel.invokeMethod('loadModel', {
        'modelID': modelID,
        'modelLib': modelLib,
        'modelPath': modelPath,
        'estimatedVRAMReq': estimatedVRAMReq,
      });
      return result ?? false;
    } catch (e, stackTrace) {
      Log.e('MLCService', 'Error loading model', e, stackTrace);
      return false;
    }
  }
  
  // 生成回复（流式）
  Stream<String> generate(String prompt) {
    _streamController = StreamController<String>();
    
    _eventSubscription = _eventChannel.receiveBroadcastStream().listen(
      (event) {
        if (event is Map) {
          if (event['type'] == 'stream') {
            _streamController?.add(event['text'] as String);
          } else if (event['type'] == 'done') {
            _streamController?.close();
          }
        }
      },
      onError: (error) {
        Log.e('MLCService', 'Event channel error', error);
        _streamController?.addError(error);
      },
    );
    
    // 启动生成
    _channel.invokeMethod('generate', {'prompt': prompt});
    
    return _streamController!.stream;
  }
  
  // 重置对话
  Future<bool> reset() async {
    try {
      final bool? result = await _channel.invokeMethod('reset');
      return result ?? false;
    } catch (e, stackTrace) {
      Log.e('MLCService', 'Error resetting chat', e, stackTrace);
      return false;
    }
  }
  
  // 卸载模型
  Future<bool> unload() async {
    try {
      final bool? result = await _channel.invokeMethod('unload');
      return result ?? false;
    } catch (e, stackTrace) {
      Log.e('MLCService', 'Error unloading model', e, stackTrace);
      return false;
    }
  }
  
  void dispose() {
    _eventSubscription?.cancel();
    _streamController?.close();
  }
}
