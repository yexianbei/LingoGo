import 'package:flutter/services.dart';

class LLMService {
  static const MethodChannel _platform = MethodChannel('qwen_channel');

  /// Runs the model with the given [text].
  Future<String> runModel(String text) async {
    try {
      final String result = await _platform.invokeMethod('runModel', text);
      return result;
    } on PlatformException catch (e) {
      return "Failed to run model: '${e.message}'.";
    }
  }

  /// Translates and explains the English sentence using a predefined prompt template.
  Future<String> translateAndExplain(String englishSentence) async {
    final prompt = """
请将下面英文句子翻译成中文，并给出一句中文解释，再生成一个类似结构的英文例句以及对应中文翻译：

$englishSentence
""";
    return await runModel(prompt);
  }
}
