import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../providers/bottom_nav_provider.dart';
import 'chat_page.dart';
import 'listening_page.dart';
import 'mine_page.dart';

/// 主页面（带底部导航栏）
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => BottomNavProvider(),
      child: const _HomePageContent(),
    );
  }
}

class _HomePageContent extends StatelessWidget {
  const _HomePageContent();

  @override
  Widget build(BuildContext context) {
    // 安全获取本地化对象
    final localizations = AppLocalizations.of(context);

    return Consumer<BottomNavProvider>(
      builder: (context, bottomNavProvider, child) {
        return Scaffold(
          body: IndexedStack(
            index: bottomNavProvider.currentIndexValue,
            children: const [
              ChatPage(),
              ListeningPage(),
              MinePage(),
            ],
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: bottomNavProvider.currentIndexValue,
            onTap: (index) {
              bottomNavProvider.setIndexByValue(index);
            },
            type: BottomNavigationBarType.fixed,
            items: [
              BottomNavigationBarItem(
                icon: const Icon(Icons.chat_bubble_outline),
                activeIcon: const Icon(Icons.chat_bubble),
                label: localizations.tabChat,
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.headphones_outlined),
                activeIcon: const Icon(Icons.headphones),
                label: localizations.tabListening,
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.person_outline),
                activeIcon: const Icon(Icons.person),
                label: localizations.tabMine,
              ),
            ],
          ),
        );
      },
    );
  }
}
