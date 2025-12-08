import 'lingo_language.dart';

/// 收藏类型
enum FavoriteType {
  sentence,
  example,
  word,
  expression;

  static FavoriteType fromString(String value) {
    switch (value) {
      case 'sentence':
        return FavoriteType.sentence;
      case 'example':
        return FavoriteType.example;
      case 'word':
        return FavoriteType.word;
      case 'expression':
        return FavoriteType.expression;
      default:
        return FavoriteType.sentence;
    }
  }

  String get value {
    switch (this) {
      case FavoriteType.sentence:
        return 'sentence';
      case FavoriteType.example:
        return 'example';
      case FavoriteType.word:
        return 'word';
      case FavoriteType.expression:
        return 'expression';
    }
  }
}

/// 收藏内容模型
class FavoriteContentModel {
  final SentenceContent? sentence;
  final ExampleContent? example;
  final WordContent? word;
  final ExpressionContent? expression;

  FavoriteContentModel({
    this.sentence,
    this.example,
    this.word,
    this.expression,
  });

  factory FavoriteContentModel.fromJson(Map<String, dynamic> json) {
    return FavoriteContentModel(
      sentence: json['sentence'] != null
          ? SentenceContent.fromJson(json['sentence'])
          : null,
      example: json['example'] != null
          ? ExampleContent.fromJson(json['example'])
          : null,
      word: json['word'] != null ? WordContent.fromJson(json['word']) : null,
      expression: json['expression'] != null
          ? ExpressionContent.fromJson(json['expression'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sentence': sentence?.toJson(),
      'example': example?.toJson(),
      'word': word?.toJson(),
      'expression': expression?.toJson(),
    };
  }
}

/// 句子内容
class SentenceContent {
  final String source;
  final String target;

  SentenceContent({
    required this.source,
    required this.target,
  });

  factory SentenceContent.fromJson(Map<String, dynamic> json) {
    return SentenceContent(
      source: json['source'] ?? '',
      target: json['target'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'source': source,
      'target': target,
    };
  }
}

/// 示例内容
class ExampleContent {
  final String source;
  final String target;
  final String? word;

  ExampleContent({
    required this.source,
    required this.target,
    this.word,
  });

  factory ExampleContent.fromJson(Map<String, dynamic> json) {
    return ExampleContent(
      source: json['source'] ?? '',
      target: json['target'] ?? '',
      word: json['word'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'source': source,
      'target': target,
      'word': word,
    };
  }
}

/// 单词内容
class WordContent {
  final String word;
  final String? phonetic;
  final String meaning;
  final String? partOfSpeech;

  WordContent({
    required this.word,
    this.phonetic,
    required this.meaning,
    this.partOfSpeech,
  });

  factory WordContent.fromJson(Map<String, dynamic> json) {
    return WordContent(
      word: json['word'] ?? '',
      phonetic: json['phonetic'],
      meaning: json['meaning'] ?? '',
      partOfSpeech: json['part_of_speech'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'word': word,
      'phonetic': phonetic,
      'meaning': meaning,
      'part_of_speech': partOfSpeech,
    };
  }
}

/// 表达内容
class ExpressionContent {
  final String expression;
  final String meaning;

  ExpressionContent({
    required this.expression,
    required this.meaning,
  });

  factory ExpressionContent.fromJson(Map<String, dynamic> json) {
    return ExpressionContent(
      expression: json['expression'] ?? '',
      meaning: json['meaning'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'expression': expression,
      'meaning': meaning,
    };
  }
}

/// 收藏模型
class FavoriteModel {
  final String id;
  final String userId;
  final String? productId;
  final FavoriteType favoriteType;
  final String translationId;
  final FavoriteContentModel content;
  final String? notes;
  final List<String>? tags;
  final String? audioUrl;
  final int insertedStamp;
  final int updatedStamp;

  FavoriteModel({
    required this.id,
    required this.userId,
    this.productId,
    required this.favoriteType,
    required this.translationId,
    required this.content,
    this.notes,
    this.tags,
    this.audioUrl,
    required this.insertedStamp,
    required this.updatedStamp,
  });

  factory FavoriteModel.fromJson(Map<String, dynamic> json) {
    return FavoriteModel(
      id: json['_id'] ?? '',
      userId: json['user'] ?? '',
      productId: json['product_id'],
      favoriteType: FavoriteType.fromString(json['favorite_type'] ?? 'sentence'),
      translationId: json['translation_id'] ?? '',
      content: FavoriteContentModel.fromJson(json['content'] ?? {}),
      notes: json['notes'],
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      audioUrl: json['audio_url'],
      insertedStamp: json['insertedStamp'] ?? 0,
      updatedStamp: json['updatedStamp'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user': userId,
      'product_id': productId,
      'favorite_type': favoriteType.value,
      'translation_id': translationId,
      'content': content.toJson(),
      'notes': notes,
      'tags': tags,
      'audio_url': audioUrl,
      'insertedStamp': insertedStamp,
      'updatedStamp': updatedStamp,
    };
  }
}

