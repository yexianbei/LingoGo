import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

/// 本地存储服务
class PreferencesService {
  static const String _keyOnboardingShown = 'onboarding_shown';
  static const String _keyNativeLanguage = 'native_language';
  static const String _keyTargetLanguage = 'target_language';
  static const String _keyUserId = 'user_id';
  static const String _keyUserEmail = 'user_email';

  static SharedPreferences? _prefs;
  static bool _isInitializing = false;
  static Completer<void>? _initCompleter;

  /// 初始化存储服务
  static Future<void> init() async {
    // 如果已经初始化，直接返回
    if (_prefs != null) {
      return;
    }
    
    // 如果正在初始化，等待完成
    if (_isInitializing && _initCompleter != null) {
      return _initCompleter!.future;
    }
    
    // 开始初始化
    _isInitializing = true;
    _initCompleter = Completer<void>();
    
    try {
      _prefs = await SharedPreferences.getInstance();
      _initCompleter!.complete();
    } catch (e) {
      // 如果初始化失败，记录错误但不抛出异常
      // 这样应用至少可以启动
      print('PreferencesService初始化失败: $e');
      _prefs = null;
      // 即使失败也完成future，不抛出错误，让调用者可以继续
      _initCompleter!.complete();
    } finally {
      _isInitializing = false;
      _initCompleter = null;
    }
  }

  /// 检查是否已显示过引导页
  static bool getOnboardingShown() {
    return _prefs?.getBool(_keyOnboardingShown) ?? false;
  }

  /// 设置已显示过引导页
  static Future<bool> setOnboardingShown(bool shown) async {
    return await _prefs?.setBool(_keyOnboardingShown, shown) ?? false;
  }

  /// 获取母语设置
  static String? getNativeLanguage() {
    return _prefs?.getString(_keyNativeLanguage);
  }

  /// 保存母语设置
  static Future<bool> setNativeLanguage(String language) async {
    return await _prefs?.setString(_keyNativeLanguage, language) ?? false;
  }

  /// 获取学习语言设置
  static String? getTargetLanguage() {
    return _prefs?.getString(_keyTargetLanguage);
  }

  /// 保存学习语言设置
  static Future<bool> setTargetLanguage(String language) async {
    return await _prefs?.setString(_keyTargetLanguage, language) ?? false;
  }

  /// 获取用户ID
  static String? getUserId() {
    return _prefs?.getString(_keyUserId);
  }

  /// 保存用户ID
  static Future<bool> setUserId(String userId) async {
    return await _prefs?.setString(_keyUserId, userId) ?? false;
  }

  /// 获取用户邮箱
  static String? getUserEmail() {
    return _prefs?.getString(_keyUserEmail);
  }

  /// 保存用户邮箱
  static Future<bool> setUserEmail(String email) async {
    return await _prefs?.setString(_keyUserEmail, email) ?? false;
  }
}

