import Foundation
import MLC_LLM

class LLMService {
    private var model: ChatModule?
    private let modelDirName = "qwen25-ios"
    private let modelFileName = "qwen25-1.5b" // Assuming qwen25-1.5b.model exists

    init() {
        loadModel()
    }
    
    func loadModel() {
        // Try to find the model path.
        // We look for the directory or file as per user config.
        // User snippet: Bundle.main.path(forResource: "qwen25-ios/qwen25-1.5b", ofType: "model")
        // This implies looking for a resource named "qwen25-1.5b" with extension "model" inside "qwen25-ios" subdirectory.
        if let modelPath = Bundle.main.path(forResource: modelFileName, ofType: "model", inDirectory: modelDirName) {
            do {
                model = try ChatModule(modelPath: modelPath)
            } catch {
                print("[LLMService] Failed to initialize ChatModule: \(error)")
            }
        } else {
             print("[LLMService] Model file not found: \(modelDirName)/\(modelFileName).model")
        }
    }

    func run(_ prompt: String) async -> String {
        // Ensure model is loaded (lazy load or check)
        if model == nil {
             loadModel()
        }
        
        guard let model = model else { return "Model not loaded" }
        
        // User snippet: await model.infer(prompt: prompt)
        // I'll wrap in do-catch just in case
        do {
            let result = try await model.infer(prompt: prompt)
            return result
        } catch {
            return "Inference failed: \(error.localizedDescription)"
        }
    }
}
