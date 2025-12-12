import 'package:flutter/material.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../core/utils/log.dart';
import '../../../data/models/mlc_model.dart';
import '../../../services/mlc_service.dart';
import '../mlc/mlc_chat_page.dart';

/// 聊天页面
class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final MLCService _mlcService = MLCService();
  List<MLCModel> _models = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadModels();
  }

  Future<void> _loadModels() async {
    setState(() => _isLoading = true);
    try {
      final models = await _mlcService.loadAppConfig();
      setState(() {
        _models = models;
        _isLoading = false;
      });
    } catch (e, stackTrace) {
      Log.e('ChatPage', 'Error loading models', e, stackTrace);
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _mlcService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.tabChat),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadModels,
            tooltip: '刷新',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _models.isEmpty
              ? Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
                        Icons.error_outline,
              size: 64,
                        color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
                      const Text('未找到可用模型'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadModels,
                        child: const Text('重试'),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: _models.length,
                  itemBuilder: (context, index) {
                    final model = _models[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
            ),
                      child: ListTile(
                        leading: const Icon(Icons.smart_toy),
                        title: Text(model.displayName),
                        subtitle: Text(model.modelID),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                        onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                              builder: (context) => MLCChatPage(model: model),
                            ),
                          );
                        },
                  ),
                );
              },
      ),
    );
  }
}