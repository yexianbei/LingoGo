import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../data/models/subtitle_segment.dart';
import '../data/models/video_record.dart';
import '../core/utils/log.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;

  factory DatabaseService() {
    return _instance;
  }

  DatabaseService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'lingogo.db');
    return await openDatabase(
      path,
      version: 2,
      onCreate: (db, version) async {
        await _createVideosTable(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await _createVideosTable(db);
        }
      },
    );
  }

  Future<void> _createVideosTable(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS videos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE,
        name TEXT,
        duration INTEGER,
        size INTEGER,
        transcript TEXT,
        createdAt INTEGER
      )
    ''');
  }

  Future<void> saveVideoRecord(VideoRecord record) async {
    final db = await database;
    await db.insert(
      'videos',
      record.toJson(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    Log.i('DatabaseService', 'Video record saved: ${record.path}');
  }

  Future<VideoRecord?> getVideoRecord(String videoPath) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'videos',
      where: 'path = ?',
      whereArgs: [videoPath],
    );

    if (maps.isEmpty) return null;

    return VideoRecord.fromJson(maps.first);
  }

  Future<VideoRecord?> getLastVideoRecord() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'videos',
      orderBy: 'createdAt DESC',
      limit: 1,
    );

    if (maps.isEmpty) return null;

    return VideoRecord.fromJson(maps.first);
  }
}
