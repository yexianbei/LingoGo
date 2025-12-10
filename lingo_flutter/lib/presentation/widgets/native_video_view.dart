import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NativeVideoViewController {
  final MethodChannel _channel;
  NativeVideoViewController(int id) : _channel = MethodChannel('lingogo/native_video_$id');

  Future<void> play() => _channel.invokeMethod('play');
  Future<void> pause() => _channel.invokeMethod('pause');
  Future<void> seekTo(Duration position) => _channel.invokeMethod('seekTo', {'position': position.inMilliseconds});
}

class NativeVideoView extends StatefulWidget {
  final String videoPath;
  final Function(int)? onPositionChanged;
  final Function(int)? onDurationChanged;
  final Function(bool)? onPlayerStateChanged;
  final Function(NativeVideoViewController)? onCreated;

  const NativeVideoView({
    super.key,
    required this.videoPath,
    this.onPositionChanged,
    this.onDurationChanged,
    this.onPlayerStateChanged,
    this.onCreated,
  });

  @override
  State<NativeVideoView> createState() => _NativeVideoViewState();
}

class _NativeVideoViewState extends State<NativeVideoView> {
  MethodChannel? _channel;
  NativeVideoViewController? _controller;

  @override
  Widget build(BuildContext context) {
    // Determine platform view type
    const String viewType = 'lingogo/native_video';
    final Map<String, dynamic> creationParams = <String, dynamic>{
      'videoPath': widget.videoPath,
    };

    return UiKitView(
      viewType: viewType,
      layoutDirection: TextDirection.ltr,
      creationParams: creationParams,
      creationParamsCodec: const StandardMessageCodec(),
      onPlatformViewCreated: _onPlatformViewCreated,
    );
  }

  void _onPlatformViewCreated(int id) {
    _channel = MethodChannel('lingogo/native_video_$id');
    _channel?.setMethodCallHandler(_handleMethodCall);
    
    _controller = NativeVideoViewController(id);
    widget.onCreated?.call(_controller!);
  }

  Future<void> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onPositionChanged':
        if (widget.onPositionChanged != null) {
          final int position = call.arguments as int;
          widget.onPositionChanged!(position);
        }
        break;
      case 'onDurationChanged':
        if (widget.onDurationChanged != null) {
          final int duration = call.arguments as int;
          widget.onDurationChanged!(duration);
        }
        break;
      case 'onPlayerStateChanged':
        if (widget.onPlayerStateChanged != null) {
          final bool isPlaying = call.arguments as bool;
          widget.onPlayerStateChanged!(isPlaying);
        }
        break;
    }
  }
}
