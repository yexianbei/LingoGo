/// 翻译详情模型
class TranslationDetailModel {
  /// 完整句子
  final String completeSentence;

  /// 句子解析
  final SentenceAnalysisModel sentenceAnalysis;

  /// 重点词汇讲解
  final List<KeyWordModel> keyWords;

  /// 地道表达拓展
  final List<IdiomaticExpressionModel>? idiomaticExpressions;

  /// 练习题
  final List<ExerciseModel>? exercises;

  TranslationDetailModel({
    required this.completeSentence,
    required this.sentenceAnalysis,
    required this.keyWords,
    this.idiomaticExpressions,
    this.exercises,
  });

  factory TranslationDetailModel.fromJson(Map<String, dynamic> json) {
    return TranslationDetailModel(
      completeSentence: json['complete_sentence'] ?? '',
      sentenceAnalysis: SentenceAnalysisModel.fromJson(
        json['sentence_analysis'] ?? {},
      ),
      keyWords: (json['key_words'] as List<dynamic>?)
              ?.map((e) => KeyWordModel.fromJson(e))
              .toList() ??
          [],
      idiomaticExpressions: (json['idiomatic_expressions'] as List<dynamic>?)
          ?.map((e) => IdiomaticExpressionModel.fromJson(e))
          .toList(),
      exercises: (json['exercises'] as List<dynamic>?)
          ?.map((e) => ExerciseModel.fromJson(e))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'complete_sentence': completeSentence,
      'sentence_analysis': sentenceAnalysis.toJson(),
      'key_words': keyWords.map((e) => e.toJson()).toList(),
      'idiomatic_expressions':
          idiomaticExpressions?.map((e) => e.toJson()).toList(),
      'exercises': exercises?.map((e) => e.toJson()).toList(),
    };
  }
}

/// 句子解析模型
class SentenceAnalysisModel {
  final String? sentenceStructure;
  final List<String>? specialExpressions;
  final List<String>? commonMistakes;
  final List<String>? importantPoints;
  final String? grammarNotes;

  SentenceAnalysisModel({
    this.sentenceStructure,
    this.specialExpressions,
    this.commonMistakes,
    this.importantPoints,
    this.grammarNotes,
  });

  factory SentenceAnalysisModel.fromJson(Map<String, dynamic> json) {
    return SentenceAnalysisModel(
      sentenceStructure: json['sentence_structure'],
      specialExpressions: (json['special_expressions'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      commonMistakes: (json['common_mistakes'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      importantPoints: (json['important_points'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      grammarNotes: json['grammar_notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sentence_structure': sentenceStructure,
      'special_expressions': specialExpressions,
      'common_mistakes': commonMistakes,
      'important_points': importantPoints,
      'grammar_notes': grammarNotes,
    };
  }
}

/// 重点词汇模型
class KeyWordModel {
  final String word;
  final String? phonetic;
  final String? partOfSpeech;
  final String meaning;
  final List<ExampleModel> examples;
  final String? audioUrl;

  KeyWordModel({
    required this.word,
    this.phonetic,
    this.partOfSpeech,
    required this.meaning,
    required this.examples,
    this.audioUrl,
  });

  factory KeyWordModel.fromJson(Map<String, dynamic> json) {
    return KeyWordModel(
      word: json['word'] ?? '',
      phonetic: json['phonetic'],
      partOfSpeech: json['part_of_speech'],
      meaning: json['meaning'] ?? '',
      examples: (json['examples'] as List<dynamic>?)
              ?.map((e) => ExampleModel.fromJson(e))
              .toList() ??
          [],
      audioUrl: json['audio_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'word': word,
      'phonetic': phonetic,
      'part_of_speech': partOfSpeech,
      'meaning': meaning,
      'examples': examples.map((e) => e.toJson()).toList(),
      'audio_url': audioUrl,
    };
  }
}

/// 地道表达模型
class IdiomaticExpressionModel {
  final String expression;
  final String meaning;
  final List<ExampleModel> examples;
  final List<String>? relatedWords;

  IdiomaticExpressionModel({
    required this.expression,
    required this.meaning,
    required this.examples,
    this.relatedWords,
  });

  factory IdiomaticExpressionModel.fromJson(Map<String, dynamic> json) {
    return IdiomaticExpressionModel(
      expression: json['expression'] ?? '',
      meaning: json['meaning'] ?? '',
      examples: (json['examples'] as List<dynamic>?)
              ?.map((e) => ExampleModel.fromJson(e))
              .toList() ??
          [],
      relatedWords: (json['related_words'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'expression': expression,
      'meaning': meaning,
      'examples': examples.map((e) => e.toJson()).toList(),
      'related_words': relatedWords,
    };
  }
}

/// 练习题模型
class ExerciseModel {
  final String question;
  final String correctAnswer;
  final String? hint;
  final String? difficulty;

  ExerciseModel({
    required this.question,
    required this.correctAnswer,
    this.hint,
    this.difficulty,
  });

  factory ExerciseModel.fromJson(Map<String, dynamic> json) {
    return ExerciseModel(
      question: json['question'] ?? '',
      correctAnswer: json['correct_answer'] ?? '',
      hint: json['hint'],
      difficulty: json['difficulty'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'question': question,
      'correct_answer': correctAnswer,
      'hint': hint,
      'difficulty': difficulty,
    };
  }
}

/// 示例模型
class ExampleModel {
  final String source;
  final String target;

  ExampleModel({
    required this.source,
    required this.target,
  });

  factory ExampleModel.fromJson(Map<String, dynamic> json) {
    return ExampleModel(
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

