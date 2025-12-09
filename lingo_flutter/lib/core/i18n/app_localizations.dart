import 'package:flutter/material.dart';
import '../../data/models/lingo_language.dart';

/// 应用本地化类
class AppLocalizations {
  final LingoLanguage locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(LingoLanguage.zhCN);
  }

  // 底部导航栏
  String get tabChat => _getText('tab_chat');
  String get tabListening => _getText('tab_listening');
  String get tabMine => _getText('tab_mine');

  // 通用
  String get appName => _getText('app_name');
  String get welcome => _getText('welcome');
  String get next => _getText('next');
  
  // 调试页面
  String get debugPage => _getText('debug_page');
  String get selectVideo => _getText('select_video');
  String get extractAudio => _getText('extract_audio');
  String get transcribeAudio => _getText('transcribe_audio');

  String _getText(String key) {
    switch (locale) {
      case LingoLanguage.zhCN:
        return _zhCN[key] ?? key;
      case LingoLanguage.enUS:
        return _enUS[key] ?? key;
      case LingoLanguage.jaJP:
        return _jaJP[key] ?? key;
    }
  }

  static const Map<String, String> _zhCN = {
    'tab_chat': '聊天',
    'tab_listening': '听力',
    'tab_mine': '我的',
    'app_name': 'LingoGo',
    'welcome': '欢迎',
    'next': '下一步',
    'debug_page': '调试页面',
    'select_video': '选择视频文件',
    'extract_audio': '提取音频',
    'transcribe_audio': '转录音频',
  };

  static const Map<String, String> _enUS = {
    'tab_chat': 'Chat',
    'tab_listening': 'Listening',
    'tab_mine': 'Mine',
    'app_name': 'LingoGo',
    'welcome': 'Welcome',
    'next': 'Next',
    'debug_page': 'Debug Page',
    'select_video': 'Select Video',
    'extract_audio': 'Extract Audio',
    'transcribe_audio': 'Transcribe Audio',
  };

  static const Map<String, String> _jaJP = {
    'tab_chat': 'チャット',
    'tab_listening': 'リスニング',
    'tab_mine': 'マイ',
    'app_name': 'LingoGo',
    'welcome': 'ようこそ',
    'next': '次へ',
    'debug_page': 'デバッグページ',
    'select_video': '動画を選択',
    'extract_audio': '音声を抽出',
    'transcribe_audio': '音声を文字起こし',
  };
}

/// 本地化代理
class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  final LingoLanguage locale;

  const AppLocalizationsDelegate(this.locale);

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<AppLocalizations> load(Locale locale) async {
    // 异步加载，确保本地化系统正常工作
    await Future.delayed(Duration.zero);
    return AppLocalizations(this.locale);
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => old.locale != locale;
}
