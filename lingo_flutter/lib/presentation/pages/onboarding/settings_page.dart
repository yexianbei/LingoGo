import 'package:flutter/material.dart';
import '../../../data/models/lingo_language.dart';
import '../../../core/storage/preferences_service.dart';

/// 基础设置引导页
class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  LingoLanguage _nativeLanguage = LingoLanguage.zhCN;
  LingoLanguage _targetLanguage = LingoLanguage.enUS;
  String? _userEmail;

  // 支持的语言列表
  final List<LingoLanguage> _supportedLanguages = [
    LingoLanguage.zhCN,
    LingoLanguage.enUS,
    LingoLanguage.jaJP,
  ];

  String _getLanguageDisplayName(LingoLanguage language) {
    switch (language) {
      case LingoLanguage.zhCN:
        return '简体中文';
      case LingoLanguage.enUS:
        return '英语';
      case LingoLanguage.jaJP:
        return '日语';
    }
  }

  Future<void> _showLanguagePicker({
    required String title,
    required LingoLanguage currentLanguage,
    required Function(LingoLanguage) onSelected,
  }) async {
    final result = await showModalBottomSheet<LingoLanguage>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _LanguagePickerSheet(
        title: title,
        currentLanguage: currentLanguage,
        languages: _supportedLanguages,
        getDisplayName: _getLanguageDisplayName,
      ),
    );

    if (result != null) {
      onSelected(result);
    }
  }

  Future<void> _showEmailDialog() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) => _EmailInputDialog(
        initialEmail: _userEmail,
      ),
    );

    if (result != null && result.isNotEmpty) {
      setState(() {
        _userEmail = result;
      });
      await PreferencesService.setUserEmail(result);
    }
  }

  Future<void> _onComplete() async {
    // 保存设置
    await PreferencesService.setNativeLanguage(_nativeLanguage.value);
    await PreferencesService.setTargetLanguage(_targetLanguage.value);

    // 标记引导页已显示
    await PreferencesService.setOnboardingShown(true);

    // 导航到主页
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 基础设置标题
          Text(
            '基础设置',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
          const SizedBox(height: 32),
          // 母语设置
          _buildLanguageSetting(
            title: '母语',
            description: 'AI与您交流的语言',
            currentLanguage: _nativeLanguage,
            onTap: () {
              _showLanguagePicker(
                title: '选择母语',
                currentLanguage: _nativeLanguage,
                onSelected: (language) {
                  setState(() {
                    _nativeLanguage = language;
                  });
                },
              );
            },
          ),
          const SizedBox(height: 24),
          // 学习语言设置
          _buildLanguageSetting(
            title: '学习语言',
            description: '希望 AI教学的外语',
            currentLanguage: _targetLanguage,
            onTap: () {
              _showLanguagePicker(
                title: '选择学习语言',
                currentLanguage: _targetLanguage,
                onSelected: (language) {
                  setState(() {
                    _targetLanguage = language;
                  });
                },
              );
            },
          ),
          const SizedBox(height: 32),
          // 账号标题
          Text(
            '账号',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
          ),
          const SizedBox(height: 16),
          // 账号设置
          _buildAccountSetting(),
          const Spacer(),
          // 开始使用按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _onComplete,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text(
                '开始使用',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildLanguageSetting({
    required String title,
    required String description,
    required LingoLanguage currentLanguage,
    required VoidCallback onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          description,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _getLanguageDisplayName(currentLanguage),
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.black87,
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: Colors.grey.shade600,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAccountSetting() {
    return InkWell(
      onTap: _showEmailDialog,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                _userEmail ?? '点击注册账号',
                style: TextStyle(
                  fontSize: 16,
                  color: _userEmail != null ? Colors.black87 : Colors.grey.shade600,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: 16,
                    color: Colors.grey.shade700,
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    '订阅',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.black54,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 语言选择底部弹窗
class _LanguagePickerSheet extends StatelessWidget {
  final String title;
  final LingoLanguage currentLanguage;
  final List<LingoLanguage> languages;
  final String Function(LingoLanguage) getDisplayName;

  const _LanguagePickerSheet({
    required this.title,
    required this.currentLanguage,
    required this.languages,
    required this.getDisplayName,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          ...languages.map((language) => ListTile(
                title: Text(getDisplayName(language)),
                trailing: language == currentLanguage
                    ? Icon(
                        Icons.check,
                        color: Theme.of(context).colorScheme.primary,
                      )
                    : null,
                onTap: () {
                  Navigator.of(context).pop(language);
                },
              )),
        ],
      ),
    );
  }
}

/// 邮箱输入对话框
class _EmailInputDialog extends StatefulWidget {
  final String? initialEmail;

  const _EmailInputDialog({this.initialEmail});

  @override
  State<_EmailInputDialog> createState() => _EmailInputDialogState();
}

class _EmailInputDialogState extends State<_EmailInputDialog> {
  late TextEditingController _emailController;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('注册账号'),
      content: TextField(
        controller: _emailController,
        decoration: const InputDecoration(
          labelText: '邮箱',
          hintText: '请输入您的邮箱地址',
          border: OutlineInputBorder(),
        ),
        keyboardType: TextInputType.emailAddress,
        autofocus: true,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(context).pop(_emailController.text.trim());
          },
          child: const Text('确定'),
        ),
      ],
    );
  }
}

