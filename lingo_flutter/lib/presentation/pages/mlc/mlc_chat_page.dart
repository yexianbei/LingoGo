import 'package:flutter/material.dart';
import '../../../core/utils/log.dart';
import '../../../data/models/mlc_model.dart';
import '../../../services/mlc_service.dart';

class MLCChatPage extends StatefulWidget {
  final MLCModel model;
  
  const MLCChatPage({
    super.key,
    required this.model,
  });
  
  @override
  State<MLCChatPage> createState() => _MLCChatPageState();
}

class _MLCChatPageState extends State<MLCChatPage> {
  final MLCService _mlcService = MLCService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  bool _isModelLoaded = false;
  
  @override
  void initState() {
    super.initState();
    _loadModel();
  }
  
  Future<void> _loadModel() async {
    setState(() => _isLoading = true);
    
    final success = await _mlcService.loadModel(
      modelID: widget.model.modelID,
      modelLib: widget.model.modelLib,
      modelPath: widget.model.modelPath ?? '',
      estimatedVRAMReq: widget.model.estimatedVRAMReq,
    );
    
    setState(() {
      _isLoading = false;
      _isModelLoaded = success;
    });
    
    if (success) {
      Log.i('MLCChatPage', 'Model loaded successfully');
    } else {
      Log.e('MLCChatPage', 'Failed to load model');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('模型加载失败')),
        );
      }
    }
  }
  
  void _addMessage(String role, String text) {
    setState(() {
      _messages.add(ChatMessage(role: role, text: text));
    });
    _scrollToBottom();
  }
  
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }
  
  Future<void> _sendMessage() async {
    final prompt = _textController.text.trim();
    if (prompt.isEmpty || !_isModelLoaded || _isLoading) return;
    
    _textController.clear();
    _addMessage('user', prompt);
    _addMessage('assistant', '');
    
    final lastIndex = _messages.length - 1;
    setState(() => _isLoading = true);
    
    try {
      await for (final text in _mlcService.generate(prompt)) {
        if (mounted) {
          setState(() {
            _messages[lastIndex] = ChatMessage(role: 'assistant', text: text);
          });
          _scrollToBottom();
        }
      }
    } catch (e, stackTrace) {
      Log.e('MLCChatPage', 'Error generating response', e, stackTrace);
      if (mounted) {
        setState(() {
          _messages[lastIndex] = ChatMessage(
            role: 'assistant',
            text: '错误: ${e.toString()}',
          );
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  @override
  void dispose() {
    _mlcService.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.model.displayName),
        actions: [
          if (_isModelLoaded)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () async {
                await _mlcService.reset();
                setState(() {
                  _messages.clear();
                });
              },
              tooltip: '重置对话',
            ),
        ],
      ),
      body: Column(
        children: [
          if (_isLoading && !_isModelLoaded)
            const LinearProgressIndicator(),
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: _isModelLoaded
                        ? Text(
                            '开始对话...',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                            ),
                          )
                        : const CircularProgressIndicator(),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isUser = message.role == 'user';
                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          decoration: BoxDecoration(
                            color: isUser
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.surfaceVariant,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            message.text,
                            style: TextStyle(
                              color: isUser
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_isLoading && _isModelLoaded)
            const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    enabled: _isModelLoaded && !_isLoading,
                    decoration: InputDecoration(
                      hintText: '输入消息...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _isModelLoaded && !_isLoading ? _sendMessage : null,
                  style: IconButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatMessage {
  final String role;
  final String text;
  
  ChatMessage({required this.role, required this.text});
}
