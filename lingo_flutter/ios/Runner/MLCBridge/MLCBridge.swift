import Flutter
import UIKit
import MLCSwift

@available(iOS 14.0, *)
public class MLCBridge: NSObject, FlutterPlugin {
    private static let channelName = "mlc_chat"
    private var appState: MLCAppState?
    private var chatState: MLCChatState?
    private var eventSink: FlutterEventSink?
    
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(
            name: channelName,
            binaryMessenger: registrar.messenger()
        )
        
        let eventChannel = FlutterEventChannel(
            name: "\(channelName)/events",
            binaryMessenger: registrar.messenger()
        )
        
        let instance = MLCBridge()
        registrar.addMethodCallDelegate(instance, channel: channel)
        eventChannel.setStreamHandler(instance)
        
        instance.appState = MLCAppState()
        instance.chatState = MLCChatState()
    }
    
    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "loadAppConfig":
            loadAppConfig(result: result)
            
        case "loadModel":
            guard let args = call.arguments as? [String: Any],
                  let modelID = args["modelID"] as? String,
                  let modelLib = args["modelLib"] as? String,
                  let modelPath = args["modelPath"] as? String,
                  let estimatedVRAMReq = args["estimatedVRAMReq"] as? Int else {
                result(FlutterError(code: "INVALID_ARGS", message: "Invalid arguments", details: nil))
                return
            }
            loadModel(modelID: modelID, modelLib: modelLib, modelPath: modelPath, estimatedVRAMReq: estimatedVRAMReq, result: result)
            
        case "generate":
            guard let args = call.arguments as? [String: Any],
                  let prompt = args["prompt"] as? String else {
                result(FlutterError(code: "INVALID_ARGS", message: "Invalid arguments", details: nil))
                return
            }
            generate(prompt: prompt, result: result)
            
        case "reset":
            reset(result: result)
            
        case "unload":
            unload(result: result)
            
        default:
            result(FlutterMethodNotImplemented)
        }
    }
    
    private func loadAppConfig(result: @escaping FlutterResult) {
        guard let appState = appState else {
            print("[MLCBridge] 错误: AppState 未初始化")
            result(FlutterError(code: "NOT_INITIALIZED", message: "AppState not initialized", details: nil))
            return
        }
        
        print("[MLCBridge] 开始加载应用配置")
        let models = appState.loadAppConfigAndModels()
        print("[MLCBridge] 加载完成，找到 \(models.count) 个模型")
        
        do {
            let modelsJson = try JSONEncoder().encode(models)
            let modelsString = String(data: modelsJson, encoding: .utf8)
            print("[MLCBridge] 成功编码模型列表，长度: \(modelsString?.count ?? 0)")
            result(modelsString)
        } catch {
            print("[MLCBridge] 编码模型列表失败: \(error.localizedDescription)")
            result(FlutterError(code: "ENCODE_ERROR", message: "Failed to encode models: \(error.localizedDescription)", details: nil))
        }
    }
    
    private func loadModel(modelID: String, modelLib: String, modelPath: String, estimatedVRAMReq: Int, result: @escaping FlutterResult) {
        guard let chatState = chatState else {
            result(FlutterError(code: "NOT_INITIALIZED", message: "ChatState not initialized", details: nil))
            return
        }
        
        Task {
            do {
                try await chatState.loadModel(
                    modelID: modelID,
                    modelLib: modelLib,
                    modelPath: modelPath,
                    estimatedVRAMReq: estimatedVRAMReq
                )
                await MainActor.run {
                    result(true)
                }
            } catch {
                await MainActor.run {
                    result(FlutterError(code: "LOAD_FAILED", message: error.localizedDescription, details: nil))
                }
            }
        }
    }
    
    private func generate(prompt: String, result: @escaping FlutterResult) {
        guard let chatState = chatState else {
            result(FlutterError(code: "NOT_INITIALIZED", message: "ChatState not initialized", details: nil))
            return
        }
        
        // 启动流式生成
        Task {
            do {
                for try await text in chatState.generate(prompt: prompt) {
                    await MainActor.run {
                        self.eventSink?(["type": "stream", "text": text])
                    }
                }
                await MainActor.run {
                    self.eventSink?(["type": "done"])
                    result(true)
                }
            } catch {
                await MainActor.run {
                    result(FlutterError(code: "GENERATE_FAILED", message: error.localizedDescription, details: nil))
                }
            }
        }
        
        result(true) // 立即返回，通过 event channel 发送流式数据
    }
    
    private func reset(result: @escaping FlutterResult) {
        guard let chatState = chatState else {
            result(FlutterError(code: "NOT_INITIALIZED", message: "ChatState not initialized", details: nil))
            return
        }
        
        Task {
            await chatState.reset()
            await MainActor.run {
                result(true)
            }
        }
    }
    
    private func unload(result: @escaping FlutterResult) {
        guard let chatState = chatState else {
            result(FlutterError(code: "NOT_INITIALIZED", message: "ChatState not initialized", details: nil))
            return
        }
        
        Task {
            await chatState.unload()
            await MainActor.run {
                result(true)
            }
        }
    }
}

@available(iOS 14.0, *)
extension MLCBridge: FlutterStreamHandler {
    public func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }
    
    public func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}
