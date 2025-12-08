import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/utils/log.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../services/audio_extractor_service.dart';

/// 调试页面
class DebugPage extends StatefulWidget {
  const DebugPage({super.key});

  @override
  State<DebugPage> createState() => _DebugPageState();
}

class _DebugPageState extends State<DebugPage> {
  final List<String> _logs = [];
  String? _selectedVideoPath;
  final AudioExtractorService _audioExtractorService = AudioExtractorService();

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
                  label: const Text('选择视频文件'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _selectedVideoPath != null ? _extractAudio : null,
                  icon: const Icon(Icons.audiotrack),
                  label: const Text('提取音频'),
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
