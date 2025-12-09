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
            case "getModelPath":
              self?.getWhisperModelPath(result: result)
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
      
      /// 获取 Whisper 模型路径
      private func getWhisperModelPath(result: @escaping FlutterResult) {
        let fileManager = FileManager.default
        let modelNames = ["ggml-base.bin", "ggml-tiny.bin", "ggml-small.bin", "ggml-medium.bin", "ggml-large.bin"]
        // 兼容不同的资源组织方式：蓝色文件夹(保留目录) 或 黄色组(扁平复制)
        let bundleSubdirs: [String?] = ["models", "model", nil] // nil 表示 Bundle 根目录
        
        // 从应用包中查找模型文件（兼容多种子目录）
        if let bundlePath = Bundle.main.resourcePath {
          print("[Whisper] Bundle 根路径: \(bundlePath)")
          
          for subdir in bundleSubdirs {
            let subdirDesc = subdir ?? "(bundle 根)"
            print("[Whisper] 尝试子目录: \(subdirDesc)")
            
            for modelName in modelNames {
              // 拆分文件名和扩展名
              let parts = modelName.split(separator: ".")
              guard parts.count >= 2 else { continue }
              let baseName = parts.dropLast().joined(separator: ".")
              let ext = String(parts.last!)
              
              // 使用 Bundle API 查找，避免依赖固定目录结构
              if let url = Bundle.main.url(forResource: baseName, withExtension: ext, subdirectory: subdir) {
                let path = url.path
                print("[Whisper] 找到模型文件: \(path)")
                result(path)
                return
              } else {
                // 打印检查路径方便定位
                if let subdir {
                  let probed = (Bundle.main.resourcePath! as NSString).appendingPathComponent(subdir).appending("/\(modelName)")
                  print("[Whisper] 未命中: \(probed)")
                } else {
                  let probed = (Bundle.main.resourcePath! as NSString).appendingPathComponent(modelName)
                  print("[Whisper] 未命中: \(probed)")
                }
              }
            }
          }
        } else {
          print("[Whisper] 无法获取应用包路径")
        }
        
        // 如果应用包中找不到，尝试从文档目录查找
        if let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first {
          let modelsPath = documentsPath.appendingPathComponent("models").path
          print("[Whisper] 查找文档目录路径: \(modelsPath)")
          
          // 如果目录不存在，尝试创建
          if !fileManager.fileExists(atPath: modelsPath) {
            do {
              try fileManager.createDirectory(atPath: modelsPath, withIntermediateDirectories: true)
              print("[Whisper] 创建文档目录: \(modelsPath)")
            } catch {
              print("[Whisper] 创建文档目录失败: \(error)")
            }
          }
          
          for modelName in modelNames {
            let modelPath = "\(modelsPath)/\(modelName)"
            print("[Whisper] 检查文档目录模型文件: \(modelPath)")
            if fileManager.fileExists(atPath: modelPath) {
              print("[Whisper] 找到文档目录模型文件: \(modelPath)")
              result(modelPath)
              return
            }
          }
        }
        
        // 如果都找不到，返回 nil
        print("[Whisper] 未找到任何模型文件")
        result(nil)
      }
      
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
