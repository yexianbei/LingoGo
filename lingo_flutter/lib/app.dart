import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'core/storage/preferences_service.dart';
import 'presentation/pages/onboarding/onboarding_page.dart';

class LingoApp extends StatelessWidget {
  const LingoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LingoGo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const SplashScreen(),
      routes: {
        '/onboarding': (context) => const OnboardingPage(),
        '/home': (context) => const HomePage(),
      },
    );
  }
}

/// 启动画面
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    try {
      // 初始化存储服务，添加超时保护
      await PreferencesService.init().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          // 超时后继续执行，不阻塞应用启动
          print('PreferencesService初始化超时，继续启动应用');
        },
      ).catchError((error) {
        // 捕获错误但不中断启动流程
        print('PreferencesService初始化出错: $error');
      });

      if (!mounted) return;

      // 预加载必要的数据，添加超时保护
      try {
      await Future.wait([
        _loadUserSettings(),
        _loadCachedData(),
        ]).timeout(const Duration(seconds: 3));
      } catch (e) {
        // 预加载失败不影响应用启动
        print('预加载数据失败: $e');
      }

      if (!mounted) return;

      // 延迟一下，让启动画面至少显示1秒
      await Future.delayed(const Duration(seconds: 1));

      if (!mounted) return;

      // 检查是否需要显示引导页
      bool hasShownOnboarding = false;
      try {
        hasShownOnboarding = PreferencesService.getOnboardingShown();
      } catch (e) {
        // 如果读取失败，默认显示引导页
        print('读取引导页状态失败: $e');
        hasShownOnboarding = false;
      }
      
      if (!mounted) return;
      
      if (hasShownOnboarding) {
        // 已显示过引导页，直接进入主页
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => const HomePage(),
          ),
        );
      } else {
        // 首次安装，显示引导页
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => const OnboardingPage(),
          ),
        );
      }
    } catch (e, stackTrace) {
      // 如果初始化失败，至少显示主页
      print('应用初始化失败: $e');
      print('堆栈: $stackTrace');
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => const HomePage(),
          ),
        );
      }
    }
  }

  Future<void> _loadUserSettings() async {
    // TODO: 加载用户设置
    await Future.delayed(const Duration(milliseconds: 300));
  }

  Future<void> _loadCachedData() async {
    // TODO: 加载缓存数据
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.secondary,
            ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo或应用图标
              Icon(
                Icons.language,
                size: 80,
                color: Colors.white,
              ),
              const SizedBox(height: 24),
              // 应用名称
              Text(
                'LingoGo',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              // 加载指示器
              const SizedBox(
                width: 40,
                height: 40,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 主页面（临时）
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('LingoGo'),
      ),
      body: const Center(
        child: Text('欢迎使用 LingoGo'),
      ),
    );
  }
}

