import 'lingo_language.dart';

/// 音频类型
enum AudioType {
  word,
  sentence;

  static AudioType fromString(String value) {
    switch (value) {
      case 'word':
        return AudioType.word;
      case 'sentence':
        return AudioType.sentence;
      default:
        return AudioType.word;
    }
  }

  String get value {
    switch (this) {
      case AudioType.word:
        return 'word';
      case AudioType.sentence:
        return 'sentence';
    }
  }
}

/// 音频缓存模型
class AudioCacheModel {
  final String id;
  final String cacheKey;
  final String text;
  final LingoLanguage language;
  final AudioType audioType;
  final String audioUrl;
  final int audioDuration;
  final int fileSize;
  final String? ttsProvider;
  final String? ttsVoice;
  final double? ttsSpeed;
  final int accessCount;
  final int? lastAccessStamp;
  final int? expireStamp;
  final int insertedStamp;
  final int updatedStamp;

  AudioCacheModel({
    required this.id,
    required this.cacheKey,
    required this.text,
    required this.language,
    required this.audioType,
    required this.audioUrl,
    required this.audioDuration,
    required this.fileSize,
    this.ttsProvider,
    this.ttsVoice,
    this.ttsSpeed,
    required this.accessCount,
    this.lastAccessStamp,
    this.expireStamp,
    required this.insertedStamp,
    required this.updatedStamp,
  });

  factory AudioCacheModel.fromJson(Map<String, dynamic> json) {
    return AudioCacheModel(
      id: json['_id'] ?? '',
      cacheKey: json['cache_key'] ?? '',
      text: json['text'] ?? '',
      language: LingoLanguage.fromString(json['language'] ?? 'en-US'),
      audioType: AudioType.fromString(json['audio_type'] ?? 'word'),
      audioUrl: json['audio_url'] ?? '',
      audioDuration: json['audio_duration'] ?? 0,
      fileSize: json['file_size'] ?? 0,
      ttsProvider: json['tts_provider'],
      ttsVoice: json['tts_voice'],
      ttsSpeed: json['tts_speed']?.toDouble(),
      accessCount: json['access_count'] ?? 0,
      lastAccessStamp: json['last_access_stamp'],
      expireStamp: json['expire_stamp'],
      insertedStamp: json['insertedStamp'] ?? 0,
      updatedStamp: json['updatedStamp'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'cache_key': cacheKey,
      'text': text,
      'language': language.value,
      'audio_type': audioType.value,
      'audio_url': audioUrl,
      'audio_duration': audioDuration,
      'file_size': fileSize,
      'tts_provider': ttsProvider,
      'tts_voice': ttsVoice,
      'tts_speed': ttsSpeed,
      'access_count': accessCount,
      'last_access_stamp': lastAccessStamp,
      'expire_stamp': expireStamp,
      'insertedStamp': insertedStamp,
      'updatedStamp': updatedStamp,
    };
  }
}

