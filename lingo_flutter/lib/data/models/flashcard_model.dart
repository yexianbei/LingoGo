import 'lingo_language.dart';

/// 闪卡状态
enum FlashcardStatus {
  learning,
  reviewing,
  mastered;

  static FlashcardStatus fromString(String value) {
    switch (value) {
      case 'learning':
        return FlashcardStatus.learning;
      case 'reviewing':
        return FlashcardStatus.reviewing;
      case 'mastered':
        return FlashcardStatus.mastered;
      default:
        return FlashcardStatus.learning;
    }
  }

  String get value {
    switch (this) {
      case FlashcardStatus.learning:
        return 'learning';
      case FlashcardStatus.reviewing:
        return 'reviewing';
      case FlashcardStatus.mastered:
        return 'mastered';
    }
  }
}

/// 闪卡类型
enum FlashcardCardType {
  sentence,
  word,
  example,
  expression;

  static FlashcardCardType fromString(String value) {
    switch (value) {
      case 'sentence':
        return FlashcardCardType.sentence;
      case 'word':
        return FlashcardCardType.word;
      case 'example':
        return FlashcardCardType.example;
      case 'expression':
        return FlashcardCardType.expression;
      default:
        return FlashcardCardType.sentence;
    }
  }

  String get value {
    switch (this) {
      case FlashcardCardType.sentence:
        return 'sentence';
      case FlashcardCardType.word:
        return 'word';
      case FlashcardCardType.example:
        return 'example';
      case FlashcardCardType.expression:
        return 'expression';
    }
  }
}

/// 闪卡难度
enum FlashcardDifficulty {
  easy,
  medium,
  hard;

  static FlashcardDifficulty? fromString(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'easy':
        return FlashcardDifficulty.easy;
      case 'medium':
        return FlashcardDifficulty.medium;
      case 'hard':
        return FlashcardDifficulty.hard;
      default:
        return null;
    }
  }

  String get value {
    switch (this) {
      case FlashcardDifficulty.easy:
        return 'easy';
      case FlashcardDifficulty.medium:
        return 'medium';
      case FlashcardDifficulty.hard:
        return 'hard';
    }
  }
}

/// 闪卡内容模型
class FlashcardContentModel {
  final String text;
  final String? audioUrl;

  FlashcardContentModel({
    required this.text,
    this.audioUrl,
  });

  factory FlashcardContentModel.fromJson(Map<String, dynamic> json) {
    return FlashcardContentModel(
      text: json['text'] ?? '',
      audioUrl: json['audio_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'audio_url': audioUrl,
    };
  }
}

/// 闪卡背面内容模型
class FlashcardBackContentModel {
  final String text;
  final String? phonetic;
  final String? meaning;
  final List<FlashcardExampleModel>? examples;
  final String? audioUrl;

  FlashcardBackContentModel({
    required this.text,
    this.phonetic,
    this.meaning,
    this.examples,
    this.audioUrl,
  });

  factory FlashcardBackContentModel.fromJson(Map<String, dynamic> json) {
    return FlashcardBackContentModel(
      text: json['text'] ?? '',
      phonetic: json['phonetic'],
      meaning: json['meaning'],
      examples: (json['examples'] as List<dynamic>?)
          ?.map((e) => FlashcardExampleModel.fromJson(e))
          .toList(),
      audioUrl: json['audio_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'phonetic': phonetic,
      'meaning': meaning,
      'examples': examples?.map((e) => e.toJson()).toList(),
      'audio_url': audioUrl,
    };
  }
}

/// 闪卡示例模型
class FlashcardExampleModel {
  final String source;
  final String target;

  FlashcardExampleModel({
    required this.source,
    required this.target,
  });

  factory FlashcardExampleModel.fromJson(Map<String, dynamic> json) {
    return FlashcardExampleModel(
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

/// 闪卡模型
class FlashcardModel {
  final String id;
  final String userId;
  final String? productId;
  final String? favoriteId;
  final String translationId;
  final FlashcardCardType cardType;
  final FlashcardContentModel frontContent;
  final FlashcardBackContentModel backContent;
  final double easeFactor;
  final int interval;
  final int repetitions;
  final int nextReviewDate;
  final FlashcardStatus status;
  final int? lastReviewStamp;
  final int reviewCount;
  final int correctCount;
  final int incorrectCount;
  final String? notes;
  final List<String>? tags;
  final FlashcardDifficulty? difficulty;
  final int streakDays;
  final int? lastStreakDate;
  final int insertedStamp;
  final int updatedStamp;

  FlashcardModel({
    required this.id,
    required this.userId,
    this.productId,
    this.favoriteId,
    required this.translationId,
    required this.cardType,
    required this.frontContent,
    required this.backContent,
    required this.easeFactor,
    required this.interval,
    required this.repetitions,
    required this.nextReviewDate,
    required this.status,
    this.lastReviewStamp,
    required this.reviewCount,
    required this.correctCount,
    required this.incorrectCount,
    this.notes,
    this.tags,
    this.difficulty,
    required this.streakDays,
    this.lastStreakDate,
    required this.insertedStamp,
    required this.updatedStamp,
  });

  factory FlashcardModel.fromJson(Map<String, dynamic> json) {
    return FlashcardModel(
      id: json['_id'] ?? '',
      userId: json['user'] ?? '',
      productId: json['product_id'],
      favoriteId: json['favorite_id'],
      translationId: json['translation_id'] ?? '',
      cardType: FlashcardCardType.fromString(json['card_type'] ?? 'sentence'),
      frontContent: FlashcardContentModel.fromJson(
        json['front_content'] ?? {},
      ),
      backContent: FlashcardBackContentModel.fromJson(
        json['back_content'] ?? {},
      ),
      easeFactor: (json['ease_factor'] ?? 2.5).toDouble(),
      interval: json['interval'] ?? 1,
      repetitions: json['repetitions'] ?? 0,
      nextReviewDate: json['next_review_date'] ?? 0,
      status: FlashcardStatus.fromString(json['status'] ?? 'learning'),
      lastReviewStamp: json['last_review_stamp'],
      reviewCount: json['review_count'] ?? 0,
      correctCount: json['correct_count'] ?? 0,
      incorrectCount: json['incorrect_count'] ?? 0,
      notes: json['notes'],
      tags: (json['tags'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      difficulty: FlashcardDifficulty.fromString(json['difficulty']),
      streakDays: json['streak_days'] ?? 0,
      lastStreakDate: json['last_streak_date'],
      insertedStamp: json['insertedStamp'] ?? 0,
      updatedStamp: json['updatedStamp'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user': userId,
      'product_id': productId,
      'favorite_id': favoriteId,
      'translation_id': translationId,
      'card_type': cardType.value,
      'front_content': frontContent.toJson(),
      'back_content': backContent.toJson(),
      'ease_factor': easeFactor,
      'interval': interval,
      'repetitions': repetitions,
      'next_review_date': nextReviewDate,
      'status': status.value,
      'last_review_stamp': lastReviewStamp,
      'review_count': reviewCount,
      'correct_count': correctCount,
      'incorrect_count': incorrectCount,
      'notes': notes,
      'tags': tags,
      'difficulty': difficulty?.value,
      'streak_days': streakDays,
      'last_streak_date': lastStreakDate,
      'insertedStamp': insertedStamp,
      'updatedStamp': updatedStamp,
    };
  }
}

