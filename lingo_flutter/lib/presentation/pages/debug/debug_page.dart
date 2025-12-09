import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/utils/log.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../services/audio_extractor_service.dart';
import '../../../services/whisper_service.dart';

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
  bool _isModelLoaded = false;

  void _addLog(String message) {
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
        });
        _addLog('视频选择成功: ${video.path}');
        _addLog('视频名称: ${video.name}');
        _addLog('视频大小: ${await video.length()} 字节');
      } else {
        _addLog('用户取消了视频选择');
      }
    } catch (e, stackTrace) {
      _addLog('选择视频失败: $e');
      Log.e('DebugPage', '选择视频失败', e, stackTrace);
    }
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
          setState(() {
            _addLog('提取进度: ${(progress * 100).toStringAsFixed(1)}%');
          });
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

  void _clearLogs() {
    setState(() {
      _logs.clear();
    });
    _addLog('日志已清空');
  }

  Future<void> _transcribeAudio() async {
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
        _addLog('正在加载 Whisper 模型...');
        // 尝试从应用资源中加载模型，如果不存在则提示用户
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
          setState(() {
            _isModelLoaded = true;
          });
          _addLog('模型加载成功');
        } else {
          _addLog('模型加载失败');
          return;
        }
      }
      
      // 执行转录
      _addLog('正在转录音频，请稍候...');
      final String? transcription = await _whisperService.transcribeAudio(audioPath);
      
      if (transcription != null && transcription.isNotEmpty) {
        _addLog('转录成功！');
        _addLog('转录结果: $transcription');
        Log.i('DebugPage', '转录结果: $transcription');
      } else {
        _addLog('转录失败或结果为空');
      }
    } catch (e, stackTrace) {
      _addLog('转录音频时发生错误: $e');
      Log.e('DebugPage', '转录音频失败', e, stackTrace);
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
            // 按文件名优先级排序：base > small > tiny > medium > large
            files.sort((a, b) {
              final aName = a.path.toLowerCase();
              final bName = b.path.toLowerCase();
              final priority = ['base', 'small', 'tiny', 'medium', 'large'];
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

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('调试页面'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: _clearLogs,
            tooltip: '清空日志',
          ),
        ],
      ),
      body: Column(
        children: [
          // 操作按钮区域
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton.icon(
                  onPressed: _pickVideo,
                  icon: const Icon(Icons.video_library),
                  label: Text(localizations.selectVideo),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _selectedVideoPath != null ? _extractAudio : null,
                  icon: const Icon(Icons.audiotrack),
                  label: Text(localizations.extractAudio),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _transcribeAudio,
                  icon: const Icon(Icons.text_fields),
                  label: Text(localizations.transcribeAudio),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                if (_selectedVideoPath != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '已选择视频:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _selectedVideoPath!,
                          style: const TextStyle(fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const Divider(),
          // 日志显示区域
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8.0),
              color: Colors.black87,
              child: _logs.isEmpty
                  ? const Center(
                      child: Text(
                        '日志将显示在这里...',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : ListView.builder(
                      reverse: true,
                      itemCount: _logs.length,
                      itemBuilder: (context, index) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: 2.0,
                            horizontal: 4.0,
                          ),
                          child: Text(
                            _logs[_logs.length - 1 - index],
                            style: const TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                              fontFamily: 'monospace',
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
