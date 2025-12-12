import Foundation

// MARK: - Model Record
struct MLCModelRecord: Codable {
    let modelID: String
    let modelLib: String
    let modelPath: String?
    let modelURL: String?
    let estimatedVRAMReq: Int
    let displayName: String
}

// MARK: - Message Data
struct MLCMessage: Codable {
    let id: String
    let role: String // "user" or "assistant"
    let message: String
}

// MARK: - Chat Status
enum MLCChatStatus: String, Codable {
    case ready
    case generating
    case reloading
    case failed
    case resetting
}

// MARK: - App Config Models
struct AppConfig: Codable {
    struct ModelRecord: Codable {
        let modelPath: String?
        let modelURL: String?
        let modelLib: String
        let estimatedVRAMReq: Int
        let modelID: String
        
        enum CodingKeys: String, CodingKey {
            case modelPath = "model_path"
            case modelURL = "model_url"
            case modelLib = "model_lib"
            case estimatedVRAMReq = "estimated_vram_bytes"
            case modelID = "model_id"
        }
    }
    
    var modelList: [ModelRecord]
    
    enum CodingKeys: String, CodingKey {
        case modelList = "model_list"
    }
}

struct ModelConfig: Decodable {
    let tokenizerFiles: [String]
    var modelLib: String?
    var modelID: String?
    var estimatedVRAMReq: Int?
    
    enum CodingKeys: String, CodingKey {
        case tokenizerFiles = "tokenizer_files"
        case modelLib = "model_lib"
        case modelID = "model_id"
        case estimatedVRAMReq = "estimated_vram_req"
    }
}
