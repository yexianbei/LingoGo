import Foundation
import AVFoundation

class AudioExtractor {
    
    /// 从视频文件中提取音频
    /// - Parameters:
    ///   - videoPath: 视频文件路径
    ///   - outputPath: 输出音频文件路径
    ///   - progressCallback: 进度回调，参数为 0.0 到 1.0 之间的进度值
    ///   - completion: 完成回调，成功返回输出路径，失败返回错误信息
    static func extractAudio(
        videoPath: String,
        outputPath: String,
        progressCallback: ((Double) -> Void)? = nil,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        let videoURL = URL(fileURLWithPath: videoPath)
        let outputURL = URL(fileURLWithPath: outputPath)
        
        // 检查视频文件是否存在
        guard FileManager.default.fileExists(atPath: videoPath) else {
            completion(.failure(NSError(
                domain: "AudioExtractor",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "视频文件不存在"]
            )))
            return
        }
        
        // 创建 AVAsset
        let asset = AVAsset(url: videoURL)
        
        // 获取音频轨道
        guard let audioTrack = asset.tracks(withMediaType: .audio).first else {
            completion(.failure(NSError(
                domain: "AudioExtractor",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "视频中没有音频轨道"]
            )))
            return
        }
        
        // 创建音频组合
        let composition = AVMutableComposition()
        guard let compositionAudioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            completion(.failure(NSError(
                domain: "AudioExtractor",
                code: -3,
                userInfo: [NSLocalizedDescriptionKey: "创建音频组合失败"]
            )))
            return
        }
        
        do {
            try compositionAudioTrack.insertTimeRange(
                CMTimeRange(start: .zero, duration: asset.duration),
                of: audioTrack,
                at: .zero
            )
        } catch {
            completion(.failure(NSError(
                domain: "AudioExtractor",
                code: -4,
                userInfo: [NSLocalizedDescriptionKey: "插入音频轨道失败: \(error.localizedDescription)"]
            )))
            return
        }
        
        // 创建导出会话
        guard let exportSession = AVAssetExportSession(
            asset: composition,
            presetName: AVAssetExportPresetAppleM4A
        ) else {
            completion(.failure(NSError(
                domain: "AudioExtractor",
                code: -5,
                userInfo: [NSLocalizedDescriptionKey: "创建导出会话失败"]
            )))
            return
        }
        
        // 配置导出会话
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .m4a
        exportSession.audioTimePitchAlgorithm = .lowQualityZeroLatency
        
        // 创建定时器来监控进度
        var progressTimer: Timer?
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            let progress = Double(exportSession.progress)
            progressCallback?(progress)
            
            if exportSession.status != .exporting {
                progressTimer?.invalidate()
            }
        }
        
        // 执行导出
        exportSession.exportAsynchronously {
            progressTimer?.invalidate()
            DispatchQueue.main.async {
                switch exportSession.status {
                case .completed:
                    completion(.success(outputPath))
                case .failed:
                    let error = exportSession.error ?? NSError(
                        domain: "AudioExtractor",
                        code: -6,
                        userInfo: [NSLocalizedDescriptionKey: "导出失败: 未知错误"]
                    )
                    completion(.failure(error))
                case .cancelled:
                    completion(.failure(NSError(
                        domain: "AudioExtractor",
                        code: -7,
                        userInfo: [NSLocalizedDescriptionKey: "导出已取消"]
                    )))
                default:
                    completion(.failure(NSError(
                        domain: "AudioExtractor",
                        code: -8,
                        userInfo: [NSLocalizedDescriptionKey: "导出状态未知"]
                    )))
                }
            }
        }
    }
}
