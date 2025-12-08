import 'package:flutter/material.dart';

/// 欢迎引导页
class WelcomePage extends StatelessWidget {
  final VoidCallback onNext;

  const WelcomePage({
    super.key,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Logo图标（可以使用实际的Logo图片）
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.language,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 32),
          // 标题
          Text(
            '欢迎使用 lingoGO',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
          ),
          const SizedBox(height: 32),
          // 内容文本
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildParagraph(
                    context,
                    '通过 AI 学习和采摘日语句子，收藏再重放。',
                  ),
                  const SizedBox(height: 24),
                  _buildParagraph(
                    context,
                    '现在开始培养一种新的意识：',
                    isIndented: true,
                  ),
                  const SizedBox(height: 8),
                  _buildParagraph(
                    context,
                    '时刻想想自己刚刚说了什么，',
                    isIndented: true,
                  ),
                  const SizedBox(height: 8),
                  _buildParagraph(
                    context,
                    '该内容用您正在学习的外语应该怎么说？',
                    isIndented: true,
                  ),
                  const SizedBox(height: 24),
                  _buildParagraph(
                    context,
                    '请保持这样的意识，',
                    isIndented: true,
                  ),
                  const SizedBox(height: 8),
                  _buildParagraph(
                    context,
                    '回想，询问 AI，收藏例句，重播，最终脱口而出。',
                    isIndented: true,
                  ),
                  const SizedBox(height: 24),
                  _buildParagraph(
                    context,
                    '语言高速进步的时候，就是能用它描述眼前、身边的一切，把日常说的母语一句句替换为新的语言。',
                    fontSize: 16,
                  ),
                  const SizedBox(height: 32),
                  // 居中显示的重点文字
                  Center(
                    child: Text(
                      '像孩子一般自然地学习语言。',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          // 下一步按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onNext,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text(
                '下一步',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildParagraph(
    BuildContext context,
    String text, {
    bool isIndented = false,
    double? fontSize,
  }) {
    return Padding(
      padding: EdgeInsets.only(left: isIndented ? 16 : 0),
      child: Text(
        text,
        style: TextStyle(
          fontSize: fontSize ?? 14,
          color: Colors.black87,
          height: 1.6,
        ),
      ),
    );
  }
}

