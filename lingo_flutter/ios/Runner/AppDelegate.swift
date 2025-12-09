import UIKit
import Flutter
import Foundation

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var audioExtractorChannel: FlutterMethodChannel?
  private var whisperChannel: FlutterMethodChannel?
  private var whisperContext: WhisperContext?
  
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
    
      // Whisper 转录通道
      whisperChannel = FlutterMethodChannel(
            name: "whisper_transcribe",
            binaryMessenger: controller.binaryMessenger
          )
          
          whisperChannel?.setMethodCallHandler { [weak self] (call: FlutterMethodCall, result: @escaping FlutterResult) in
            switch call.method {
            case "loadModel":
              self?.loadWhisperModel(call: call, result: result)
            case "transcribeAudio":
              self?.transcribeAudio(call: call, result: result)
            default:
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
    
    // MARK: - Whisper 方法
      
      /// 加载 Whisper 模型
      private func loadWhisperModel(call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let modelPath = args["modelPath"] as? String else {
          result(FlutterError(code: "INVALID_ARGUMENT", message: "参数错误：缺少 modelPath", details: nil))
          return
        }
        
        Task {
          do {
            let context = try WhisperContext.createContext(path: modelPath)
            await MainActor.run {
              self.whisperContext = context
              result(true)
            }
          } catch {
            await MainActor.run {
              result(FlutterError(
                code: "LOAD_MODEL_FAILED",
                message: "加载模型失败: \(error.localizedDescription)",
                details: nil
              ))
            }
          }
        }
      }
      
      /// 转录音频文件
      private func transcribeAudio(call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let audioPath = args["audioPath"] as? String else {
          result(FlutterError(code: "INVALID_ARGUMENT", message: "参数错误：缺少 audioPath", details: nil))
          return
        }
        
        guard let context = whisperContext else {
          result(FlutterError(code: "MODEL_NOT_LOADED", message: "模型未加载", details: nil))
          return
        }
        
        let audioURL = URL(fileURLWithPath: audioPath)
        
        Task {
          do {
            // 将音频文件转换为 Float 数组
            let samples = try AudioConverter.convertToFloatArray(audioURL)
            
            // 执行转录
            await context.fullTranscribe(samples: samples)
            
            // 获取转录结果
            let transcription = await context.getTranscription()
            
            await MainActor.run {
              result(transcription)
            }
          } catch {
            await MainActor.run {
              result(FlutterError(
                code: "TRANSCRIBE_FAILED",
                message: "转录失败: \(error.localizedDescription)",
                details: nil
              ))
            }
          }
        }
      }
}

