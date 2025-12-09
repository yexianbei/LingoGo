import Foundation
import AVFoundation

class AudioConverter {
    /// 将音频文件（m4a/wav等）转换为 WAV 格式的 Float 数组
    /// - Parameter url: 音频文件 URL
    /// - Returns: Float 数组，采样率为 16000Hz，单声道
    static func convertToFloatArray(_ url: URL) throws -> [Float] {
        let asset = AVAsset(url: url)
        guard let audioTrack = asset.tracks(withMediaType: .audio).first else {
            throw NSError(
                domain: "AudioConverter",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "音频文件中没有音频轨道"]
            )
        }
        
        // 创建音频读取器
        let reader = try AVAssetReader(asset: asset)
        let outputSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsNonInterleaved: false,
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1
        ]
        
        let readerOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: outputSettings)
        reader.add(readerOutput)
        reader.startReading()
        
        var audioData = Data()
        while reader.status == .reading {
            if let sampleBuffer = readerOutput.copyNextSampleBuffer() {
                if let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) {
                    var length = 0
                    var dataPointer: UnsafeMutablePointer<Int8>?
                    let status = CMBlockBufferGetDataPointer(
                        blockBuffer,
                        atOffset: 0,
                        lengthAtOffsetOut: nil,
                        totalLengthOut: &length,
                        dataPointerOut: &dataPointer
                    )
                    
                    if status == noErr, let pointer = dataPointer {
                        let data = Data(bytes: pointer, count: length)
                        audioData.append(data)
                    }
                }
            } else {
                break
            }
        }
        
        // 转换为 Float 数组
        let floats = stride(from: 0, to: audioData.count, by: 2).map { index -> Float in
            let short = audioData[index..<index+2].withUnsafeBytes {
                Int16(littleEndian: $0.load(as: Int16.self))
            }
            return max(-1.0, min(Float(short) / 32767.0, 1.0))
        }
        
        return floats
    }
}
