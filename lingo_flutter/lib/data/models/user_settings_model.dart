import 'lingo_language.dart';

/// 用户语言学习设置模型
class UserSettingsModel {
  final String id;
  final String userId;
  final String? productId;
  final LingoLanguage nativeLanguage;
  final LingoLanguage targetLanguage;
  final LingoLanguage uiLanguage;
  final TranslationPreferencesModel translationPreferences;
  final SpacedRepetitionConfigModel spacedRepetitionConfig;
  final AudioConfigModel audioConfig;
  final int insertedStamp;
  final int updatedStamp;

  UserSettingsModel({
    required this.id,
    required this.userId,
    this.productId,
    required this.nativeLanguage,
    required this.targetLanguage,
    required this.uiLanguage,
    required this.translationPreferences,
    required this.spacedRepetitionConfig,
    required this.audioConfig,
    required this.insertedStamp,
    required this.updatedStamp,
  });

  factory UserSettingsModel.fromJson(Map<String, dynamic> json) {
    return UserSettingsModel(
      id: json['_id'] ?? '',
      userId: json['user'] ?? '',
      productId: json['product_id'],
      nativeLanguage: LingoLanguage.fromString(json['native_language'] ?? 'zh-CN'),
      targetLanguage: LingoLanguage.fromString(json['target_language'] ?? 'en-US'),
      uiLanguage: LingoLanguage.fromString(json['ui_language'] ?? 'zh-CN'),
      translationPreferences: TranslationPreferencesModel.fromJson(
        json['translation_preferences'] ?? {},
      ),
      spacedRepetitionConfig: SpacedRepetitionConfigModel.fromJson(
        json['spaced_repetition_config'] ?? {},
      ),
      audioConfig: AudioConfigModel.fromJson(
        json['audio_config'] ?? {},
      ),
      insertedStamp: json['insertedStamp'] ?? 0,
      updatedStamp: json['updatedStamp'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user': userId,
      'product_id': productId,
      'native_language': nativeLanguage.value,
      'target_language': targetLanguage.value,
      'ui_language': uiLanguage.value,
      'translation_preferences': translationPreferences.toJson(),
      'spaced_repetition_config': spacedRepetitionConfig.toJson(),
      'audio_config': audioConfig.toJson(),
      'insertedStamp': insertedStamp,
      'updatedStamp': updatedStamp,
    };
  }
}

/// 翻译偏好模型
class TranslationPreferencesModel {
  final bool showSentenceAnalysis;
  final bool showKeyWords;
  final bool showIdiomaticExpressions;
  final bool showExercises;
  final bool autoCreateFlashcard;

  TranslationPreferencesModel({
    required this.showSentenceAnalysis,
    required this.showKeyWords,
    required this.showIdiomaticExpressions,
    required this.showExercises,
    required this.autoCreateFlashcard,
  });

  factory TranslationPreferencesModel.fromJson(Map<String, dynamic> json) {
    return TranslationPreferencesModel(
      showSentenceAnalysis: json['show_sentence_analysis'] ?? true,
      showKeyWords: json['show_key_words'] ?? true,
      showIdiomaticExpressions: json['show_idiomatic_expressions'] ?? true,
      showExercises: json['show_exercises'] ?? true,
      autoCreateFlashcard: json['auto_create_flashcard'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'show_sentence_analysis': showSentenceAnalysis,
      'show_key_words': showKeyWords,
      'show_idiomatic_expressions': showIdiomaticExpressions,
      'show_exercises': showExercises,
      'auto_create_flashcard': autoCreateFlashcard,
    };
  }
}

/// 记忆曲线配置模型
class SpacedRepetitionConfigModel {
  final String algorithm; // "sm2" | "fsrs"
  final int newCardsPerDay;
  final int maxReviewsPerDay;
  final double minEaseFactor;
  final double maxEaseFactor;

  SpacedRepetitionConfigModel({
    required this.algorithm,
    required this.newCardsPerDay,
    required this.maxReviewsPerDay,
    required this.minEaseFactor,
    required this.maxEaseFactor,
  });

  factory SpacedRepetitionConfigModel.fromJson(Map<String, dynamic> json) {
    return SpacedRepetitionConfigModel(
      algorithm: json['algorithm'] ?? 'sm2',
      newCardsPerDay: json['new_cards_per_day'] ?? 20,
      maxReviewsPerDay: json['max_reviews_per_day'] ?? 100,
      minEaseFactor: (json['min_ease_factor'] ?? 1.3).toDouble(),
      maxEaseFactor: (json['max_ease_factor'] ?? 2.5).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'algorithm': algorithm,
      'new_cards_per_day': newCardsPerDay,
      'max_reviews_per_day': maxReviewsPerDay,
      'min_ease_factor': minEaseFactor,
      'max_ease_factor': maxEaseFactor,
    };
  }
}

/// 音频配置模型
class AudioConfigModel {
  final bool autoPlay;
  final double playbackSpeed;
  final String voiceGender; // "male" | "female" | "neutral"
  final String? voiceStyle;
  final bool cacheAudioLocally;

  AudioConfigModel({
    required this.autoPlay,
    required this.playbackSpeed,
    required this.voiceGender,
    this.voiceStyle,
    required this.cacheAudioLocally,
  });

  factory AudioConfigModel.fromJson(Map<String, dynamic> json) {
    return AudioConfigModel(
      autoPlay: json['auto_play'] ?? false,
      playbackSpeed: (json['playback_speed'] ?? 1.0).toDouble(),
      voiceGender: json['voice_gender'] ?? 'neutral',
      voiceStyle: json['voice_style'],
      cacheAudioLocally: json['cache_audio_locally'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'auto_play': autoPlay,
      'playback_speed': playbackSpeed,
      'voice_gender': voiceGender,
      'voice_style': voiceStyle,
      'cache_audio_locally': cacheAudioLocally,
    };
  }
}

