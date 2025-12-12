class SubtitleSegment {
  final int start; // Milliseconds
  final int end;   // Milliseconds
  final String text;

  SubtitleSegment({
    required this.start,
    required this.end,
    required this.text,
  });

  factory SubtitleSegment.fromJson(Map<String, dynamic> json) {
    return SubtitleSegment(
      start: json['start'] as int,
      end: json['end'] as int,
      text: json['text'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
      'text': text,
    };
  }

  SubtitleSegment copyWith({
    int? start,
    int? end,
    String? text,
  }) {
    return SubtitleSegment(
      start: start ?? this.start,
      end: end ?? this.end,
      text: text ?? this.text,
    );
  }
}
