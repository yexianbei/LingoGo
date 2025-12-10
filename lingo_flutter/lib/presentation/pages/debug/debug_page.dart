import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/utils/log.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../services/audio_extractor_service.dart';
import 'dart:convert';
import '../../../services/whisper_service.dart';
import '../../widgets/native_video_view.dart';
import '../../widgets/lyrics_view.dart';
import '../../../data/models/subtitle_segment.dart';
import '../../../data/models/video_record.dart';
import '../../../services/database_service.dart';
import '../../widgets/video_controller_panel.dart';

/// 调试页面
class DebugPage extends StatefulWidget {
  const DebugPage({super.key});

  @override
  State<DebugPage> createState() => _DebugPageState();
}

class _DebugPageState extends State<DebugPage> {
  final List<String> _logs = [];
  String? _selectedVideoPath;
  String? _lastExtractedAudioPath;
  final AudioExtractorService _audioExtractorService = AudioExtractorService();
  final WhisperService _whisperService = WhisperService();
  final DatabaseService _databaseService = DatabaseService();
  bool _isModelLoaded = false;
  
  List<SubtitleSegment> _segments = [];
  int _currentPosition = 0; // Milliseconds
  int _totalDuration = 0; // Milliseconds
  bool _isPlaying = false;
  
  NativeVideoViewController? _videoController;
  
  int _progress = 0;
  bool _isTranscribing = false;
  StreamSubscription? _progressSubscription;
  String? _currentThumbnailPath; // Add this

  @override
  void initState() {
    super.initState();
    _progressSubscription = _whisperService.onProgress.listen((progress) {
      if (mounted) {
        setState(() {
          _progress = progress;
        });
      }
    });
    // 页面加载时自动初始化模型并加载上次视频
    _initModel();
    _loadLastVideo();
  }

  @override
  void dispose() {
    _saveCurrentProgress();
    _videoController?.pause();
    _whisperService.release();
    _progressSubscription?.cancel();
    super.dispose();
  }

  Future<void> _saveCurrentProgress() async {
    if (_selectedVideoPath != null) {
       final File videoFile = File(_selectedVideoPath!);
       final int fileSize = await videoFile.length();
       final String fileName = videoFile.path.split('/').last;

       final record = VideoRecord(
         path: _selectedVideoPath!,
         name: fileName,
         size: fileSize,
         duration: _totalDuration,
         transcript: _segments,
         createdAt: DateTime.now().millisecondsSinceEpoch,
         lastPosition: _currentPosition,
         thumbnailPath: _currentThumbnailPath, // Save thumbnail
       );
       
       await _databaseService.saveVideoRecord(record);
       Log.i('DebugPage', 'Saved progress: $_currentPosition ms');
    }
  }

  void _addLog(String message) {
    if (!mounted) return;
    setState(() {
      _logs.add('${DateTime.now().toString().substring(11, 19)}: $message');
    });
    Log.i('DebugPage', message);
  }

  Future<void> _pickVideo() async {
    try {
      _addLog('开始选择视频文件...');
      final ImagePicker picker = ImagePicker();
      final XFile? video = await picker.pickVideo(
        source: ImageSource.gallery,
      );

      if (video != null) {
        setState(() {
          _selectedVideoPath = video.path;
          _segments = []; // Clear previous
        });
        _addLog('视频选择成功: ${video.path}');
        _addLog('视频名称: ${video.name}');
        
        // Try load video record from DB to check if we have existing transcript
        final record = await _databaseService.getVideoRecord(video.path);
        if (record != null && record.transcript.isNotEmpty) {
           setState(() {
             _segments = record.transcript;
             if (record.duration > 0) {
               _totalDuration = record.duration;
             }
           });
           _addLog('已从数据库加载转录记录');
        } else {
           // No record or empty transcript. Auto extract.
           _extractAudio();
        }
        
        // Generate thumbnail
        _generateThumbnail(video.path);
      } else {
        _addLog('用户取消了视频选择');
      }
    } catch (e, stackTrace) {
      _addLog('选择视频失败: $e');
      Log.e('DebugPage', '选择视频失败', e, stackTrace);
    }
  }

  Future<void> _loadLastVideo() async {
    try {
      final record = await _databaseService.getLastVideoRecord();
      if (record != null) {
        if (await File(record.path).exists()) {
             setState(() {
               _selectedVideoPath = record.path;
               _segments = record.transcript;
               if (record.duration > 0) {
                 _totalDuration = record.duration;
               }
             });
             _addLog('已自动加载上次播放的视频: ${record.name}');
             
             // If controller is ready, seek and play.
             if (_videoController != null && record.lastPosition > 0) {
               _videoController!.seekTo(Duration(milliseconds: record.lastPosition));
               _addLog('恢复播放进度: ${record.lastPosition}ms');
             }
             if (_videoController != null) {
                _videoController!.play();
                _videoController!.updateMetadata(
                  title: record.name,
                  thumbnailPath: record.thumbnailPath,
                );
             }
        }
      }
    } catch (e) {
      Log.e('DebugPage', '加载上次视频失败', e);
    }
  }

  Future<void> _restoreLastPosition() async {
     if (_selectedVideoPath == null || _videoController == null) return;
     
     final record = await _databaseService.getVideoRecord(_selectedVideoPath!);
     if (record != null && record.lastPosition > 0) {
        _videoController!.seekTo(Duration(milliseconds: record.lastPosition));
        _addLog('恢复播放进度: ${record.lastPosition}ms');
     }
     // Auto-play
     _videoController!.play();
  }

  Future<void> _extractAudio() async {
    if (_selectedVideoPath == null) {
      _addLog('请先选择视频文件');
      return;
    }

    try {
      _addLog('开始提取音频...');
      _addLog('视频路径: $_selectedVideoPath');

      // 获取输出目录
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final String outputDir = '${appDocDir.path}/extracted_audio';
      await Directory(outputDir).create(recursive: true);

      final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final String outputPath = '$outputDir/audio_$timestamp.m4a';

      _addLog('输出目录: $outputDir');
      _addLog('输出文件: $outputPath');

      // 调用原生代码提取音频
      _addLog('调用原生音频提取功能...');
      final String? result = await _audioExtractorService.extractAudio(
        _selectedVideoPath!,
        outputPath,
        onProgress: (progress) {
          if (mounted) {
             _addLog('提取进度: ${(progress * 100).toStringAsFixed(1)}%');
          }
        },
      );

      if (result != null) {
        setState(() {
          _lastExtractedAudioPath = result;
        });
        _addLog('音频提取成功！');
        _addLog('输出文件路径: $result');
        _addLog('文件大小: ${await File(result).length()} 字节');
      } else {
        _addLog('音频提取失败');
      }
    } catch (e, stackTrace) {
      _addLog('提取音频时发生错误: $e');
      Log.e('DebugPage', '提取音频失败', e, stackTrace);
    }
  }

  Future<void> _generateThumbnail(String videoPath) async {
      try {
          final String? thumbPath = await _audioExtractorService.generateThumbnail(videoPath);
          if (thumbPath != null) {
              setState(() {
                  _currentThumbnailPath = thumbPath;
              });
              _addLog('缩略图生成成功: $thumbPath');
              
              // Update metadata
              final String fileName = videoPath.split('/').last;
              _videoController?.updateMetadata(
                title: fileName,
                thumbnailPath: thumbPath,
              );
          }
      } catch (e) {
          Log.e('DebugPage', '生成缩略图失败', e);
      }
  }

  /// 初始化模型
  Future<void> _initModel() async {
    if (_isModelLoaded) return;
    
    try {
      _addLog('正在加载 Whisper 模型...');
      // 尝试从应用资源中加载模型
      final String? modelPath = await _findModelPath();
      
      if (modelPath == null) {
        _addLog('未找到 Whisper 模型文件');
        _addLog('');
        _addLog('解决方案 1：在 Xcode 中添加 Resources 文件夹');
        _addLog('1. 在 Xcode 中打开项目（Runner.xcworkspace）');
        _addLog('2. 在项目导航器中右键点击 "Runner" 文件夹');
        _addLog('3. 选择 "Add Files to Runner..."');
        _addLog('4. 导航到 ios/Runner/Resources 文件夹');
        _addLog('5. 选择整个 Resources 文件夹');
        _addLog('6. 确保勾选 "Add to targets: Runner"');
        _addLog('7. 点击 "Add" 按钮');
        _addLog('8. 重新编译运行应用');
        _addLog('');
        _addLog('解决方案 2：将模型文件复制到文档目录（无需 Xcode 配置）');
        _addLog('1. 将模型文件（如 ggml-base.bin）复制到：');
        _addLog('   ~/Documents/models/ 目录');
        _addLog('2. 或者通过文件共享功能将文件导入应用');
        _addLog('3. 应用会自动从文档目录查找模型文件');
        _addLog('');
        _addLog('请查看 Xcode 控制台的详细日志（搜索 [Whisper]）');
        return;
      }
      
      _addLog('模型文件路径: $modelPath');
      final bool loaded = await _whisperService.loadModel(modelPath);
      
      if (loaded) {
        if (mounted) {
          setState(() {
            _isModelLoaded = true;
          });
        }
        _addLog('模型加载成功');
      } else {
        _addLog('模型加载失败');
      }
    } catch (e) {
      _addLog('模型初始化失败: $e');
      Log.e('DebugPage', '模型初始化失败', e);
    }
  }

  void _clearLogs() {
    setState(() {
      _logs.clear();
    });
    _addLog('日志已清空');
  }

  Future<void> _transcribeAudio() async {
    setState(() {
      _isTranscribing = true;
      _progress = 0;
    });
    
    try {
      // 首先尝试使用最后提取的音频
      String? audioPath = _lastExtractedAudioPath;
      
      // 如果没有最后提取的音频，尝试从 extracted_audio 目录查找最新的音频文件
      if (audioPath == null || !await File(audioPath).exists()) {
        try {
          final Directory appDocDir = await getApplicationDocumentsDirectory();
          final String audioDir = '${appDocDir.path}/extracted_audio';
          final Directory dir = Directory(audioDir);
          
          if (await dir.exists()) {
            final List<FileSystemEntity> files = dir.listSync()
                .where((entity) => entity is File)
                .toList();
            
            if (files.isNotEmpty) {
              // 按修改时间排序，获取最新的文件
              files.sort((a, b) {
                final aStat = a.statSync();
                final bStat = b.statSync();
                return bStat.modified.compareTo(aStat.modified);
              });
              audioPath = files.first.path;
              _addLog('找到最新音频文件: $audioPath');
            }
          }
        } catch (e) {
          Log.e('DebugPage', '查找音频文件失败', e);
        }
      }
      
      if (audioPath == null || !await File(audioPath).exists()) {
        _addLog('未找到可用的音频文件，请先提取音频');
        return;
      }
      
      try {
        _addLog('开始转录音频...');
        _addLog('音频文件路径: $audioPath');
        
        // 检查模型是否已加载
        if (!_isModelLoaded) {
          _addLog('模型尚未加载，尝试重新加载...');
          await _initModel();
          if (!_isModelLoaded) {
            _addLog('模型加载失败，无法转录');
            return;
          }
        }
        
        // 执行转录
        _addLog('正在转录音频，请稍候...');
        final String? transcription = await _whisperService.transcribeAudio(audioPath);
        
        if (transcription != null && transcription.isNotEmpty) {
          _addLog('转录成功！');
          Log.i('DebugPage', 'Raw transcription: $transcription');
          
          try {
             final List<dynamic> jsonList = jsonDecode(transcription);
             final segments = jsonList.map((e) => SubtitleSegment.fromJson(e)).toList();
             
             setState(() {
               _segments = segments;
             });
             
             // Save to DB
             if (_selectedVideoPath != null) {
                 final File videoFile = File(_selectedVideoPath!);
                 final int fileSize = await videoFile.length();
                 final String fileName = videoFile.path.split('/').last;

                 final record = VideoRecord(
                   path: _selectedVideoPath!,
                   name: fileName,
                   size: fileSize,
                   duration: _totalDuration,
                   transcript: segments,
                   createdAt: DateTime.now().millisecondsSinceEpoch,
                   lastPosition: _currentPosition, // Save current pos
                   thumbnailPath: _currentThumbnailPath,
                 );
                 
                 await _databaseService.saveVideoRecord(record);
                 _addLog('完整视频记录已保存到数据库');
             }

          } catch (e) {
             _addLog('解析转录结果失败: $e');
             // Fallback if not JSON (e.g. error message)
             Log.e('DebugPage', 'JSON Parse Error', e);
          }
        } else {
          _addLog('转录失败或结果为空');
        }
      } catch (e, stackTrace) {
        _addLog('转录音频时发生错误: $e');
        Log.e('DebugPage', '转录音频失败', e, stackTrace);
      }
    } catch (e) {
      _addLog('未知错误: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isTranscribing = false;
        });
      }
    }
  }
  
  /// 查找 Whisper 模型文件路径
  Future<String?> _findModelPath() async {
    try {
      // 通过平台通道从 iOS 应用包中查找模型文件
      final String? modelPath = await _whisperService.getModelPath();
      
      // 如果应用包中找不到，尝试从文档目录查找
      if (modelPath == null) {
        _addLog('应用包中未找到模型文件，尝试从文档目录查找...');
        final Directory appDocDir = await getApplicationDocumentsDirectory();
        final String modelsDir = '${appDocDir.path}/models';
        final Directory dir = Directory(modelsDir);
        
        if (await dir.exists()) {
          final List<FileSystemEntity> files = dir.listSync()
              .where((entity) => entity is File && entity.path.endsWith('.bin'))
              .toList();
          
          if (files.isNotEmpty) {
            // 按文件名优先级排序：tiny > base > small > medium > large
            files.sort((a, b) {
              final aName = a.path.toLowerCase();
              final bName = b.path.toLowerCase();
              final priority = ['tiny', 'base', 'small', 'medium', 'large'];
              int aIndex = priority.indexWhere((p) => aName.contains(p));
              int bIndex = priority.indexWhere((p) => bName.contains(p));
              aIndex = aIndex == -1 ? 999 : aIndex;
              bIndex = bIndex == -1 ? 999 : bIndex;
              return aIndex.compareTo(bIndex);
            });
            
            final foundPath = files.first.path;
            _addLog('在文档目录找到模型文件: $foundPath');
            return foundPath;
          }
        }
        
        _addLog('文档目录中也未找到模型文件');
        _addLog('提示：可以将模型文件复制到应用的文档目录');
        _addLog('路径：Documents/models/ggml-base.bin');
      }
      
      return modelPath;
    } catch (e) {
      Log.e('DebugPage', '查找模型路径失败', e);
      return null;
    }
  }

  void _showSettings() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Settings & Debug', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.video_library),
              title: Text(AppLocalizations.of(context).selectVideo),
              onTap: () {
                Navigator.pop(context);
                _pickVideo();
              },
            ),
            ListTile(
              leading: const Icon(Icons.text_fields),
              title: Text(_isTranscribing ? 'Transcribing...' : AppLocalizations.of(context).transcribeAudio),
              subtitle: _isTranscribing ? LinearProgressIndicator(value: _progress / 100) : null,
              onTap: _isTranscribing ? null : () {
                Navigator.pop(context);
                _transcribeAudio();
              },
            ),
            ListTile(
              leading: const Icon(Icons.list_alt),
              title: const Text('View Logs'),
              onTap: () {
                Navigator.pop(context);
                _showLogsDialog();
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('Clear Logs'),
              onTap: () {
                Navigator.pop(context);
                _clearLogs();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showLogsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logs'),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: ListView.builder(
            reverse: true,
            itemCount: _logs.length,
            itemBuilder: (context, index) => Text(
              _logs[_logs.length - 1 - index],
              style: const TextStyle(fontSize: 10, fontFamily: 'monospace'),
            ),
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50], // Light background
      appBar: AppBar(
        title: Text(
           _selectedVideoPath?.split('/').last ?? 'Player',
           style: const TextStyle(fontSize: 14, color: Colors.black87),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune, color: Colors.black87),
            onPressed: _showSettings,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Video Area
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: AspectRatio(
                aspectRatio: 20 / 9, // Reduced height by ~20% (16/9 * 1.25)
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _selectedVideoPath != null
                      ? NativeVideoView(
                          videoPath: _selectedVideoPath!,
                          onCreated: (controller) {
                            _videoController = controller;
                            // Check if we have a last position from DB to seek to (if not already handled)
                            _restoreLastPosition();
                            
                            // Initialize metadata if available
                             final fileName = _selectedVideoPath!.split('/').last;
                             _videoController?.updateMetadata(
                               title: fileName,
                               thumbnailPath: _currentThumbnailPath, // Might be null initially, but updated later
                             );
                          },
                          onPositionChanged: (pos) {
                            if (mounted) {
                              setState(() {
                                _currentPosition = pos;
                              });
                            }
                          },
                          onDurationChanged: (duration) {
                             if (mounted) {
                               setState(() {
                                 _totalDuration = duration;
                               });
                             }
                          },
                          onPlayerStateChanged: (isPlaying) {
                             if (mounted) {
                               setState(() {
                                 _isPlaying = isPlaying;
                               });
                             }
                          },
                        )
                      : Container(
                          color: Colors.grey[900],
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                               Icon(Icons.video_library_outlined, size: 48, color: Colors.grey[700]),
                               const SizedBox(height: 8),
                               Text("No Video Selected", style: TextStyle(color: Colors.grey[700])),
                            ],
                          ),
                        ),
                ),
              ),
            ),

            // 2. Lyrics Area
            Expanded(
              child: _segments.isEmpty
                  ? Center(
                      child: _selectedVideoPath == null
                          ? Text(
                              "Tap settings to select video",
                              style: TextStyle(color: Colors.grey[400]),
                            )
                          : Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _isTranscribing
                                      ? AppLocalizations.of(context).transcribingDoNotExit
                                      : "No transcript available",
                                  style: TextStyle(color: Colors.grey[400]),
                                ),
                                const SizedBox(height: 16),
                                _isTranscribing
                                    ? Column(
                                        children: [
                                          const CircularProgressIndicator(),
                                          const SizedBox(height: 8),
                                          Text(
                                            "${_progress}%",
                                            style: const TextStyle(color: Colors.grey),
                                          ),
                                        ],
                                      )
                                    : ElevatedButton.icon(
                                        onPressed: _transcribeAudio,
                                        icon: const Icon(Icons.transcribe),
                                        label: Text(AppLocalizations.of(context).transcribeAudio),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.blue,
                                          foregroundColor: Colors.white,
                                        ),
                                      ),
                              ],
                            ),
                    )
                  : LyricsView(
                      segments: _segments,
                      currentPosition: _currentPosition,
                      onSegmentTap: (startMs) {
                        _addLog("Seek to ${startMs}ms (Not implemented)");
                      },
                    ),
            ),
            
            const SizedBox(height: 16),

            // 3. Controller Panel
            VideoControllerPanel(
              isPlaying: _isPlaying,
              currentPosition: Duration(milliseconds: _currentPosition),
              totalDuration: Duration(milliseconds: _totalDuration > 0 ? _totalDuration : (_segments.isNotEmpty ? _segments.last.end : 0)), 
              onPlayPause: () {
                if (_videoController != null) {
                  if (_isPlaying) {
                    _videoController!.pause();
                  } else {
                    _videoController!.play();
                  }
                }
              },
              onSeek: (val) {
                if (_videoController != null) {
                  _videoController!.seekTo(Duration(milliseconds: val.toInt()));
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
