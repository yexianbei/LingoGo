import 'package:flutter/material.dart';

class VideoControllerPanel extends StatelessWidget {
  final bool isPlaying;
  final Duration currentPosition;
  final Duration totalDuration;
  final VoidCallback onPlayPause;
  final ValueChanged<double> onSeek;

  const VideoControllerPanel({
    super.key,
    required this.isPlaying,
    required this.currentPosition,
    required this.totalDuration,
    required this.onPlayPause,
    required this.onSeek,
  });

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
         borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
         boxShadow: [
           BoxShadow(
             color: Colors.black.withOpacity(0.05),
             blurRadius: 10,
             offset: const Offset(0, -5),
           ),
         ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Controls Row (Speed, Action Icons)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildControlItem(Icons.speed, '1.0x'),
              const Spacer(),
              _buildControlItem(Icons.chat_bubble_outline, '讲解'),
              const SizedBox(width: 24),
              _buildControlItem(Icons.mic_none, '跟读'),
            ],
          ),
          const SizedBox(height: 8),

          // 2. Progress Slider
          Row(
            children: [
              SizedBox(
                width: 48,
                child: Text(
                  _formatDuration(currentPosition),
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
              Expanded(
                child: SliderTheme(
                  data: SliderThemeData(
                    trackHeight: 4,
                    activeTrackColor: Colors.orange,
                    inactiveTrackColor: Colors.grey[200],
                    thumbColor: Colors.white,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6, elevation: 2), // Slightly smaller thumb
                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 0),
                  ),
                  child: Slider(
                    value: currentPosition.inMilliseconds.toDouble().clamp(0, totalDuration.inMilliseconds.toDouble()),
                    min: 0,
                    max: totalDuration.inMilliseconds.toDouble() > 0 ? totalDuration.inMilliseconds.toDouble() : 1.0,
                    onChanged: onSeek,
                  ),
                ),
              ),
              SizedBox(
                width: 48,
                child: Text(
                  _formatDuration(totalDuration),
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // 3. Playback Controls (Play/Pause Only)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
               // Play/Pause Button
               GestureDetector(
                 onTap: onPlayPause,
                 child: Container(
                   width: 48,
                   height: 48,
                   decoration: const BoxDecoration(
                     color: Colors.orange,
                     shape: BoxShape.circle,
                     boxShadow: [
                       BoxShadow(
                         color: Colors.orangeAccent,
                         blurRadius: 8,
                         offset: Offset(0, 3),
                       )
                     ]
                   ),
                   child: Icon(
                     isPlaying ? Icons.pause : Icons.play_arrow_rounded,
                     color: Colors.white,
                     size: 28,
                   ),
                 ),
               ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildControlItem(IconData icon, String label) {
    return Column(
      children: [
        Icon(icon, size: 24, color: Colors.black87),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.black54),
        ),
      ],
    );
  }
}
