import 'package:flutter/foundation.dart';

/// 底部导航栏索引枚举
enum BottomNavIndex {
  chat(0),
  listening(1),
  mine(2);

  final int value;
  const BottomNavIndex(this.value);
}

/// 底部导航栏状态管理
class BottomNavProvider extends ChangeNotifier {
  BottomNavIndex _currentIndex = BottomNavIndex.chat;

  BottomNavIndex get currentIndex => _currentIndex;

  int get currentIndexValue => _currentIndex.value;

  void setIndex(BottomNavIndex index) {
    if (_currentIndex != index) {
      _currentIndex = index;
      notifyListeners();
    }
  }

  void setIndexByValue(int index) {
    final newIndex = BottomNavIndex.values.firstWhere(
      (e) => e.value == index,
      orElse: () => BottomNavIndex.chat,
    );
    setIndex(newIndex);
  }
}
