import Foundation
import MLCSwift

@available(iOS 14.0, *)
class MLCChatState {
    private let engine = MLCEngine()
    private var historyMessages: [ChatCompletionMessage] = []
    private var currentModelID: String = ""
    private var currentModelPath: String = ""
    private var currentModelLib: String = ""
    
    // 加载模型
    func loadModel(modelID: String, modelLib: String, modelPath: String, estimatedVRAMReq: Int) async throws {
        // 注意：实际的 MLCSwift 可能不提供内存检查函数
        // 如果需要内存检查，可以使用系统 API，这里先跳过
        // let vRAM = os_proc_available_memory()
        // guard vRAM >= estimatedVRAMReq else {
        //     throw MLCError.insufficientMemory
        // }
        
        // 1. 卸载旧模型
        await engine.unload()
        
        // 2. 加载新模型
        await engine.reload(modelPath: modelPath, modelLib: modelLib)
        
        // 3. 保存当前模型信息
        currentModelID = modelID
        currentModelPath = modelPath
        currentModelLib = modelLib
        
        // 4. 重置历史消息
        historyMessages = []
        await engine.reset()
        
        // 5. 预热模型（可选，发送空消息）
        // 注意：预热可能不需要，或者可以简化
        // let warmupMessage = ChatCompletionMessage(role: .user, content: "")
        // for await _ in await engine.chat.completions.create(
        //     messages: [warmupMessage],
        //     max_tokens: 1
        // ) {}
    }
    
    // 生成回复（流式）
    func generate(prompt: String) -> AsyncThrowingStream<String, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                // 添加用户消息到历史
                historyMessages.append(ChatCompletionMessage(role: .user, content: prompt))
                
                var streamingText = ""
                
                do {
                    for try await res in await engine.chat.completions.create(
                        messages: historyMessages,
                        stream_options: StreamOptions(include_usage: true)
                    ) {
                        for choice in res.choices {
                            if let content = choice.delta.content {
                                streamingText += content.asText()
                                continuation.yield(streamingText)
                            }
                        }
                    }
                    
                    // 完成
                    if !streamingText.isEmpty {
                        historyMessages.append(ChatCompletionMessage(role: .assistant, content: streamingText))
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    // 重置对话
    func reset() async {
        await engine.reset()
        historyMessages = []
    }
    
    // 卸载模型
    func unload() async {
        await engine.unload()
        currentModelID = ""
        currentModelPath = ""
        currentModelLib = ""
        historyMessages = []
    }
}

@available(iOS 14.0, *)
enum MLCError: Error {
    case insufficientMemory
    case modelNotFound
    case loadFailed(String)
    
    var localizedDescription: String {
        switch self {
        case .insufficientMemory:
            return "Insufficient memory"
        case .modelNotFound:
            return "Model not found"
        case .loadFailed(let message):
            return "Load failed: \(message)"
        }
    }
}
