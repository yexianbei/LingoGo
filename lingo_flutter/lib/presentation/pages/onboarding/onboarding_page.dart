import 'package:flutter/material.dart';
import '../../../core/storage/preferences_service.dart';
import 'welcome_page.dart';
import 'settings_page.dart';

/// 引导页面
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentPage = index;
    });
  }

  Future<void> _onSkip() async {
    // 标记引导页已显示（即使跳过也标记）
    await PreferencesService.setOnboardingShown(true);
    // 跳过引导，直接进入主页
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  void _onNext() {
    if (_currentPage < 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _onComplete() {
    // 完成引导，进入主页
    Navigator.of(context).pushReplacementNamed('/home');
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // 顶部栏：关闭按钮、进度指示器、跳过按钮
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  // 关闭按钮
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: _onSkip,
                    color: Colors.black87,
                  ),
                  // 进度指示器
                  Expanded(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        2,
                        (index) => _buildIndicator(index == _currentPage),
                      ),
                    ),
                  ),
                  // 跳过按钮
                  TextButton(
                    onPressed: _onSkip,
                    child: const Text(
                      '跳过',
                      style: TextStyle(
                        color: Colors.black54,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // 页面内容
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                children: [
                  WelcomePage(onNext: _onNext),
                  const SettingsPage(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIndicator(bool isActive) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      height: 4,
      width: isActive ? 24 : 8,
      decoration: BoxDecoration(
        color: isActive
            ? Theme.of(context).colorScheme.primary
            : Colors.grey.shade300,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}

