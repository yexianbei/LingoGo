import 'package:flutter/material.dart';
import 'dart:async';
import '../../data/models/subtitle_segment.dart';

class LyricsView extends StatefulWidget {
  final List<SubtitleSegment> segments;
  final int currentPosition; // Milliseconds
  final Function(int) onSegmentTap;

  const LyricsView({
    super.key,
    required this.segments,
    required this.currentPosition,
    required this.onSegmentTap,
  });

  @override
  State<LyricsView> createState() => _LyricsViewState();
}

class _LyricsViewState extends State<LyricsView> {
  final ScrollController _scrollController = ScrollController();
  static const double _itemHeight = 80.0; // Increased height
  int _activeIndex = -1;

  @override
  @override
  void didUpdateWidget(LyricsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentPosition != widget.currentPosition) {
      _updateActiveIndex();
    }
  }

  void _updateActiveIndex() {
    int newIndex = -1;
    for (int i = 0; i < widget.segments.length; i++) {
        // Find segment that contains current position
        if (widget.currentPosition >= widget.segments[i].start &&
            widget.currentPosition <= widget.segments[i].end) {
            newIndex = i;
            break;
        }
    }
    
    // If not in a segment, maybe find the upcoming one or stick to last
    if (newIndex == -1 && widget.segments.isNotEmpty) {
         if (widget.currentPosition < widget.segments.first.start) {
             newIndex = -1;
         } else if (widget.currentPosition > widget.segments.last.end) {
             newIndex = widget.segments.length - 1;
         } else {
             // Between segments - keep previous
             newIndex = _activeIndex;
         }
    }

    if (newIndex != _activeIndex) {
      setState(() {
        _activeIndex = newIndex;
      });
      _autoScroll(newIndex);
    }
  }

  void _autoScroll(int index) {
    if (index < 0 || !_scrollController.hasClients) return;
    
    // Center the item more accurately
    double screenHeight = MediaQuery.of(context).size.height;
    // We want the active item to be roughly in the middle of the available space
    // Since we don't know exact container height here easily without LayoutBuilder,
    // we assume the list takes up significant space.
    // Let's try to center it:
    double offset = (index * _itemHeight) - (screenHeight * 0.2); // Simple offset
    
    _scrollController.animateTo(
      offset > 0 ? offset : 0, 
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 200), // Huge padding to allow centering top/bottom items
      itemCount: widget.segments.length,
      itemBuilder: (context, index) {
        final segment = widget.segments[index];
        final bool isActive = index == _activeIndex;

        return GestureDetector(
          onTap: () => widget.onSegmentTap(segment.start),
          child: Container(
            // Remove fixed height constraint or make it minHeight?
            // Fixed height is easier for scrolling calc.
            height: _itemHeight, 
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            color: Colors.transparent, // Hit test
            child: Text(
              segment.text,
              style: TextStyle(
                color: isActive ? Colors.black : Colors.grey[400],
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                fontSize: isActive ? 18 : 16,
                height: 1.5,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.left,
            ),
          ),
        );
      },
    );
  }
}
