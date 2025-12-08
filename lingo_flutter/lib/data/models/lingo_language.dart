/// 语言代码类型
enum LingoLanguage {
  zhCN('zh-CN'),
  enUS('en-US'),
  jaJP('ja-JP');

  final String value;
  const LingoLanguage(this.value);

  static LingoLanguage fromString(String value) {
    return LingoLanguage.values.firstWhere(
      (e) => e.value == value,
      orElse: () => LingoLanguage.zhCN,
    );
  }
}

