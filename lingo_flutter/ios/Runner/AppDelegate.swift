import UIKit
import Flutter
import Foundation

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var audioExtractorChannel: FlutterMethodChannel?
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    
    // 注册方法通道
    guard let controller = window?.rootViewController as? FlutterViewController else {
      return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
    
    audioExtractorChannel = FlutterMethodChannel(
      name: "audio_extractor",
      binaryMessenger: controller.binaryMessenger
    )
    
    audioExtractorChannel?.setMethodCallHandler { [weak self] (call: FlutterMethodCall, result: @escaping FlutterResult) in
      if call.method == "extractAudio" {
        self?.extractAudio(call: call, result: result)
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // 处理应用从后台恢复
  override func applicationWillEnterForeground(_ application: UIApplication) {
    super.applicationWillEnterForeground(application)
  }
  
  // 处理应用进入后台
  override func applicationDidEnterBackground(_ application: UIApplication) {
    super.applicationDidEnterBackground(application)
  }
  
  // 提取音频
  private func extractAudio(call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard let args = call.arguments as? [String: Any],
          let videoPath = args["videoPath"] as? String,
          let outputPath = args["outputPath"] as? String else {
      result(FlutterError(code: "INVALID_ARGUMENT", message: "参数错误", details: nil))
      return
    }
    
    AudioExtractor.extractAudio(
      videoPath: videoPath,
      outputPath: outputPath,
      progressCallback: { [weak self] progress in
        self?.audioExtractorChannel?.invokeMethod("onProgress", arguments: progress)
      },
      completion: { extractResult in
        switch extractResult {
        case .success(let outputPath):
          result(outputPath)
        case .failure(let error):
          let errorMessage = error.localizedDescription
          result(FlutterError(code: "EXTRACT_FAILED", message: errorMessage, details: nil))
        }
      }
    )
  }
}

