import Foundation

class MLCAppState {
    private var appConfig: AppConfig?
    private var models: [MLCModelRecord] = []
    private let fileManager = FileManager.default
    private let cacheDirectoryURL: URL
    private let jsonDecoder = JSONDecoder()
    
    init() {
        cacheDirectoryURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    }
    
    // 加载应用配置和模型列表
    func loadAppConfigAndModels() -> [MLCModelRecord] {
        print("[MLCAppState] 开始加载应用配置和模型列表")
        appConfig = loadAppConfig()
        guard let appConfig = appConfig else {
            print("[MLCAppState] 应用配置加载失败，返回空列表")
            return []
        }
        
        models = []
        print("[MLCAppState] 开始处理 \(appConfig.modelList.count) 个模型配置")
        
        for (index, model) in appConfig.modelList.enumerated() {
            print("[MLCAppState] 处理模型 \(index + 1)/\(appConfig.modelList.count): \(model.modelID)")
            
            if let modelPath = model.modelPath {
                // 关键改进：先查找 mlc-chat-config.json 文件，然后通过其父目录确定模型目录
                // 这样更可靠，因为配置文件肯定在模型目录中
                var modelConfigURL: URL?
                let configName = "mlc-chat-config"
                let modelSubdirectory = "bundle/\(modelPath)"
                
                // 方法1: 使用 Bundle 资源查找，在 bundle/模型目录中查找
                if let configPath = Bundle.main.path(forResource: configName, 
                                                     ofType: "json", 
                                                     inDirectory: modelSubdirectory) {
                    modelConfigURL = URL(fileURLWithPath: configPath)
                    print("[MLCAppState] 方式1找到配置文件: \(configPath)")
                } else {
                    // 方法2: 使用 URL 方法查找
                    if let configURL = Bundle.main.url(forResource: configName, 
                                                       withExtension: "json", 
                                                       subdirectory: modelSubdirectory) {
                        modelConfigURL = configURL
                        print("[MLCAppState] 方式2找到配置文件: \(configURL.path)")
                    } else {
                        // 方法3: 直接路径拼接
                        let directPath = Bundle.main.bundleURL
                            .appendingPathComponent("bundle")
                            .appendingPathComponent(modelPath)
                            .appendingPathComponent("mlc-chat-config.json")
                        if fileManager.fileExists(atPath: directPath.path) {
                            modelConfigURL = directPath
                            print("[MLCAppState] 方式3找到配置文件: \(directPath.path)")
                        } else {
                            // 方法4: 尝试在模型目录中直接查找（不包含 bundle 前缀）
                            if let altPath = Bundle.main.path(forResource: configName, 
                                                              ofType: "json", 
                                                              inDirectory: modelPath) {
                                modelConfigURL = URL(fileURLWithPath: altPath)
                                print("[MLCAppState] 方式4找到配置文件: \(altPath)")
                            }
                        }
                    }
                }
                
                // 如果还没找到，尝试递归搜索所有 mlc-chat-config.json 文件
                if modelConfigURL == nil {
                    print("[MLCAppState] 开始递归搜索 mlc-chat-config.json 文件...")
                    
                    // 收集所有找到的 mlc-chat-config.json 文件
                    var foundConfigFiles: [URL] = []
                    if let enumerator = fileManager.enumerator(
                        at: Bundle.main.bundleURL,
                        includingPropertiesForKeys: [.isRegularFileKey],
                        options: [.skipsHiddenFiles]
                    ) {
                        for case let fileURL as URL in enumerator {
                            if fileURL.lastPathComponent == "mlc-chat-config.json" {
                                foundConfigFiles.append(fileURL)
                                print("[MLCAppState] 找到配置文件: \(fileURL.path)")
                            }
                        }
                    }
                    
                    if foundConfigFiles.isEmpty {
                        print("[MLCAppState] 递归搜索未找到任何 mlc-chat-config.json 文件")
                        
                        // 列出所有 JSON 文件用于调试
                        if let allJSONFiles = findAllJSONFiles(in: Bundle.main.bundleURL) {
                            print("[MLCAppState] Bundle 中所有 JSON 文件:")
                            for jsonFile in allJSONFiles {
                                print("[MLCAppState]   - \(jsonFile)")
                            }
                        }
                    } else {
                        // 如果有多个配置文件，尝试找到匹配的
                        // 优先选择目录名包含模型ID或模型路径的
                        var matchedConfig: URL?
                        for configFile in foundConfigFiles {
                            let configDir = configFile.deletingLastPathComponent()
                            let dirName = configDir.lastPathComponent
                            
                            print("[MLCAppState] 检查配置文件: \(configFile.path)")
                            print("[MLCAppState]   目录名: \(dirName)")
                            print("[MLCAppState]   期望模型路径: \(modelPath)")
                            
                            // 检查目录名是否匹配模型路径
                            if dirName == modelPath || 
                               dirName.contains(modelPath) ||
                               modelPath.contains(dirName) ||
                               dirName.contains(model.modelID) {
                                matchedConfig = configFile
                                print("[MLCAppState] 找到匹配的配置文件: \(configFile.path)")
                                break
                            }
                        }
                        
                        // 如果没找到匹配的，使用第一个找到的（可能只有一个模型）
                        if matchedConfig == nil && foundConfigFiles.count == 1 {
                            matchedConfig = foundConfigFiles.first
                            print("[MLCAppState] 使用唯一找到的配置文件: \(matchedConfig!.path)")
                        } else if matchedConfig == nil {
                            // 如果有多个但都不匹配，使用第一个
                            matchedConfig = foundConfigFiles.first
                            print("[MLCAppState] 使用第一个找到的配置文件: \(matchedConfig!.path)")
                        }
                        
                        modelConfigURL = matchedConfig
                    }
                }
                
                guard let modelConfigURL = modelConfigURL else {
                    print("[MLCAppState] 警告: 无法找到模型配置文件 mlc-chat-config.json for model: \(modelPath)")
                    print("[MLCAppState] 尝试过的路径:")
                    if let resourcePath = Bundle.main.resourcePath {
                        print("[MLCAppState]   - \(resourcePath)/\(modelSubdirectory)/mlc-chat-config.json")
                        print("[MLCAppState]   - \(resourcePath)/\(modelPath)/mlc-chat-config.json")
                    }
                    if let bundleURL = Bundle.main.bundleURL.path as String? {
                        print("[MLCAppState]   - \(bundleURL)/\(modelSubdirectory)/mlc-chat-config.json")
                        print("[MLCAppState]   - \(bundleURL)/\(modelPath)/mlc-chat-config.json")
                    }
                    continue
                }
                
                // 从配置文件 URL 中提取模型目录（关键改进！）
                // 配置文件在模型目录中，所以获取其父目录就是模型目录
                let actualModelDir = modelConfigURL.deletingLastPathComponent()
                print("[MLCAppState] 从配置文件路径推断模型目录: \(actualModelDir.path)")
                
                // 验证模型目录存在
                guard fileManager.fileExists(atPath: actualModelDir.path) else {
                    print("[MLCAppState] 警告: 模型目录不存在: \(actualModelDir.path)")
                    continue
                }
                
                if let modelConfig = loadModelConfig(
                    modelConfigURL: modelConfigURL,
                    modelLib: model.modelLib,
                    modelID: model.modelID,
                    estimatedVRAMReq: model.estimatedVRAMReq
                ) {
                    let displayName = model.modelID.components(separatedBy: "-")[0]
                    let modelRecord = MLCModelRecord(
                        modelID: model.modelID,
                        modelLib: model.modelLib,
                        modelPath: actualModelDir.path,
                        modelURL: nil,
                        estimatedVRAMReq: model.estimatedVRAMReq,
                        displayName: displayName
                    )
                    models.append(modelRecord)
                    print("[MLCAppState] 成功添加模型: \(modelRecord.modelID) (\(modelRecord.displayName))")
                    print("[MLCAppState] 模型路径: \(modelRecord.modelPath ?? "nil")")
                } else {
                    print("[MLCAppState] 警告: 模型配置加载失败: \(model.modelID)")
                }
            }
        }
        
        print("[MLCAppState] 完成加载，共找到 \(models.count) 个可用模型")
        return models
    }
    
    // 加载应用配置
    private func loadAppConfig() -> AppConfig? {
        var appConfigFileURL: URL?
        
        print("[MLCAppState] 开始查找 mlc-app-config.json")
        
        // 1. 尝试从缓存目录加载
        let cacheConfigURL = cacheDirectoryURL.appendingPathComponent("bundle/mlc-app-config.json")
        if fileManager.fileExists(atPath: cacheConfigURL.path) {
            print("[MLCAppState] 从缓存目录找到: \(cacheConfigURL.path)")
            appConfigFileURL = cacheConfigURL
        } else {
            print("[MLCAppState] 缓存目录不存在，尝试 Bundle 查找")
            
            // 2. 尝试从 Bundle 中查找 - 使用多种方式
            // 方式1: 使用 path(forResource:ofType:inDirectory:)
            if let bundlePath = Bundle.main.path(forResource: "mlc-app-config", ofType: "json", inDirectory: "bundle") {
                print("[MLCAppState] 方式1找到: \(bundlePath)")
                appConfigFileURL = URL(fileURLWithPath: bundlePath)
            }
            // 方式2: 使用 url(forResource:withExtension:subdirectory:)
            else if let bundleURL = Bundle.main.url(forResource: "mlc-app-config", withExtension: "json", subdirectory: "bundle") {
                print("[MLCAppState] 方式2找到: \(bundleURL.path)")
                appConfigFileURL = bundleURL
            }
            // 方式3: 使用 resourcePath 直接拼接
            else if let resourcePath = Bundle.main.resourcePath {
                let directPath = (resourcePath as NSString).appendingPathComponent("bundle/mlc-app-config.json")
                if fileManager.fileExists(atPath: directPath) {
                    print("[MLCAppState] 方式3找到: \(directPath)")
                    appConfigFileURL = URL(fileURLWithPath: directPath)
                } else {
                    print("[MLCAppState] 方式3路径不存在: \(directPath)")
                }
            }
            // 方式4: 使用 bundleURL 直接拼接
            let bundleURLPath = Bundle.main.bundleURL.appendingPathComponent("bundle/mlc-app-config.json").path
            if appConfigFileURL == nil && fileManager.fileExists(atPath: bundleURLPath) {
                print("[MLCAppState] 方式4找到: \(bundleURLPath)")
                appConfigFileURL = URL(fileURLWithPath: bundleURLPath)
            }
            // 方式5: 递归搜索
            if appConfigFileURL == nil {
                if let foundPath = searchFileInDirectory(url: Bundle.main.bundleURL, fileName: "mlc-app-config.json") {
                    print("[MLCAppState] 方式5递归搜索找到: \(foundPath.path)")
                    appConfigFileURL = foundPath
                }
            }
        }
        
        guard let appConfigFileURL = appConfigFileURL else {
            print("[MLCAppState] 错误: 无法找到 mlc-app-config.json")
            print("[MLCAppState] Bundle.main.resourcePath: \(Bundle.main.resourcePath ?? "nil")")
            print("[MLCAppState] Bundle.main.bundleURL: \(Bundle.main.bundleURL.path)")
            return nil
        }
        
        print("[MLCAppState] 成功找到配置文件: \(appConfigFileURL.path)")
        
        do {
            let data = try Data(contentsOf: appConfigFileURL)
            let appConfig = try jsonDecoder.decode(AppConfig.self, from: data)
            print("[MLCAppState] 成功解析配置，找到 \(appConfig.modelList.count) 个模型")
            return appConfig
        } catch {
            print("[MLCAppState] 解析配置文件失败: \(error.localizedDescription)")
            return nil
        }
    }
    
    // 加载模型配置
    private func loadModelConfig(modelConfigURL: URL, modelLib: String, modelID: String, estimatedVRAMReq: Int) -> ModelConfig? {
        do {
            let data = try Data(contentsOf: modelConfigURL)
            var modelConfig = try jsonDecoder.decode(ModelConfig.self, from: data)
            modelConfig.modelLib = modelLib
            modelConfig.modelID = modelID
            modelConfig.estimatedVRAMReq = estimatedVRAMReq
            return modelConfig
        } catch {
            print("[MLCAppState] Failed to load model config: \(error.localizedDescription)")
            return nil
        }
    }
    
    // 递归搜索文件
    private func searchFileInDirectory(url: URL, fileName: String) -> URL? {
        guard let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles]) else {
            return nil
        }
        
        for case let fileURL as URL in enumerator {
            if fileURL.lastPathComponent == fileName {
                return fileURL
            }
        }
        
        return nil
    }
    
    // 递归搜索目录
    private func searchDirectoryInBundle(directoryName: String) -> URL? {
        guard let enumerator = fileManager.enumerator(
            at: Bundle.main.bundleURL,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else {
            return nil
        }
        
        for case let dirURL as URL in enumerator {
            if dirURL.lastPathComponent == directoryName {
                var isDirectory: ObjCBool = false
                if fileManager.fileExists(atPath: dirURL.path, isDirectory: &isDirectory) && isDirectory.boolValue {
                    return dirURL
                }
            }
        }
        
        return nil
    }
    
    // 查找所有 JSON 文件（用于调试）
    private func findAllJSONFiles(in url: URL) -> [String]? {
        guard let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles]) else {
            return nil
        }
        
        var jsonFiles: [String] = []
        for case let fileURL as URL in enumerator {
            if fileURL.pathExtension == "json" {
                let relativePath = fileURL.path.replacingOccurrences(of: url.path, with: "")
                jsonFiles.append(relativePath)
            }
        }
        
        return jsonFiles.isEmpty ? nil : jsonFiles
    }
}
