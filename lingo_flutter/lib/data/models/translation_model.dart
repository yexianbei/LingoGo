import 'translation_detail_model.dart';
import 'lingo_language.dart';

/// 翻译记录模型
class TranslationModel {
  final String id;
  final String userId;
  final String? productId;
  final LingoLanguage nativeLanguage;
  final LingoLanguage targetLanguage;
  final String sourceText;
  final String targetText;
  final TranslationDetailModel translationDetail;
  final String? sentenceAudioUrl;
  final int? sentenceAudioDuration;
  final String? aiModel;
  final String? aiProvider;
  final double? confidenceScore;
  final int viewCount;
  final int practiceCount;
  final int insertedStamp;
  final int updatedStamp;

  TranslationModel({
    required this.id,
    required this.userId,
    this.productId,
    required this.nativeLanguage,
    required this.targetLanguage,
    required this.sourceText,
    required this.targetText,
    required this.translationDetail,
    this.sentenceAudioUrl,
    this.sentenceAudioDuration,
    this.aiModel,
    this.aiProvider,
    this.confidenceScore,
    required this.viewCount,
    required this.practiceCount,
    required this.insertedStamp,
    required this.updatedStamp,
  });

  factory TranslationModel.fromJson(Map<String, dynamic> json) {
    return TranslationModel(
      id: json['_id'] ?? '',
      userId: json['user'] ?? '',
      productId: json['product_id'],
      nativeLanguage: LingoLanguage.fromString(json['native_language'] ?? 'zh-CN'),
      targetLanguage: LingoLanguage.fromString(json['target_language'] ?? 'en-US'),
      sourceText: json['source_text'] ?? '',
      targetText: json['target_text'] ?? '',
      translationDetail: TranslationDetailModel.fromJson(
        json['translation_detail'] ?? {},
      ),
      sentenceAudioUrl: json['sentence_audio_url'],
      sentenceAudioDuration: json['sentence_audio_duration'],
      aiModel: json['ai_model'],
      aiProvider: json['ai_provider'],
      confidenceScore: json['confidence_score']?.toDouble(),
      viewCount: json['view_count'] ?? 0,
      practiceCount: json['practice_count'] ?? 0,
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
      'source_text': sourceText,
      'target_text': targetText,
      'translation_detail': translationDetail.toJson(),
      'sentence_audio_url': sentenceAudioUrl,
      'sentence_audio_duration': sentenceAudioDuration,
      'ai_model': aiModel,
      'ai_provider': aiProvider,
      'confidence_score': confidenceScore,
      'view_count': viewCount,
      'practice_count': practiceCount,
      'insertedStamp': insertedStamp,
      'updatedStamp': updatedStamp,
    };
  }
}

