import 'dart:convert';
import 'subtitle_segment.dart';

class VideoRecord {
  final int? id;
  final String path;
  final String name;
  final int duration; // Milliseconds
  final int size;     // Bytes
  final List<SubtitleSegment> transcript;
  final int createdAt;
  final int lastPosition; // Milliseconds
  final String? thumbnailPath;

  VideoRecord({
    this.id,
    required this.path,
    required this.name,
    this.duration = 0,
    this.size = 0,
    required this.transcript,
    required this.createdAt,
    this.lastPosition = 0,
    this.thumbnailPath,
  });

  factory VideoRecord.fromJson(Map<String, dynamic> json) {
    List<SubtitleSegment> loadedTranscript = [];
    if (json['transcript'] != null) {
      if (json['transcript'] is String) {
        final List<dynamic> list = jsonDecode(json['transcript']);
        loadedTranscript = list.map((e) => SubtitleSegment.fromJson(e)).toList();
      } else if (json['transcript'] is List) {
         // Should not happen for DB text/blob storage but good for safety
         loadedTranscript = (json['transcript'] as List).map((e) => SubtitleSegment.fromJson(e)).toList();
      }
    }

    return VideoRecord(
      id: json['id'] as int?,
      path: json['path'] as String,
      name: json['name'] as String,
      duration: json['duration'] as int? ?? 0,
      size: json['size'] as int? ?? 0,
      transcript: loadedTranscript,
      createdAt: json['createdAt'] as int,
      lastPosition: json['lastPosition'] as int? ?? 0,
      thumbnailPath: json['thumbnailPath'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'path': path,
      'name': name,
      'duration': duration,
      'size': size,
      'transcript': jsonEncode(transcript.map((e) => e.toJson()).toList()),
      'createdAt': createdAt,
      'lastPosition': lastPosition,
      'thumbnailPath': thumbnailPath,
    };
  }
}
