/// 日志工具类
class Log {
  static void d(String tag, String message) {
    print('[$tag] $message');
  }

  static void i(String tag, String message) {
    print('[$tag] $message');
  }

  static void w(String tag, String message) {
    print('[$tag] WARNING: $message');
  }

  static void e(String tag, String message, [Object? error, StackTrace? stackTrace]) {
    print('[$tag] ERROR: $message');
    if (error != null) {
      print('[$tag] Error: $error');
    }
    if (stackTrace != null) {
      print('[$tag] StackTrace: $stackTrace');
    }
  }
}
