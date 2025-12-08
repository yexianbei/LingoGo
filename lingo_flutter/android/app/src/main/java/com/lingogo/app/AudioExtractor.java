package com.lingogo.app;

import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaCodec;
import java.io.File;
import java.nio.ByteBuffer;

public class AudioExtractor {
    
    /**
     * 从视频文件中提取音频
     * 
     * @param videoPath 视频文件路径
     * @param outputPath 输出音频文件路径
     * @param progressCallback 进度回调，参数为 0.0 到 1.0 之间的进度值
     * @return 提取成功返回输出路径，失败返回 null
     */
    public static String extractAudio(String videoPath, String outputPath, ProgressCallback progressCallback) {
        MediaExtractor extractor = null;
        MediaMuxer muxer = null;
        
        try {
            // 检查视频文件是否存在
            File videoFile = new File(videoPath);
            if (!videoFile.exists()) {
                return null;
            }
            
            // 创建 MediaExtractor
            extractor = new MediaExtractor();
            extractor.setDataSource(videoPath);
            
            // 查找音频轨道
            int audioTrackIndex = -1;
            MediaFormat audioFormat = null;
            
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat format = extractor.getTrackFormat(i);
                String mime = format.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("audio/")) {
                    audioTrackIndex = i;
                    audioFormat = format;
                    break;
                }
            }
            
            if (audioTrackIndex == -1 || audioFormat == null) {
                return null;
            }
            
            // 选择音频轨道
            extractor.selectTrack(audioTrackIndex);
            
            // 创建输出目录
            File outputFile = new File(outputPath);
            File outputDir = outputFile.getParentFile();
            if (outputDir != null && !outputDir.exists()) {
                outputDir.mkdirs();
            }
            
            // 创建 MediaMuxer
            muxer = new MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            
            // 添加音频轨道
            int muxerAudioTrackIndex = muxer.addTrack(audioFormat);
            muxer.start();
            
            // 读取和写入数据
            ByteBuffer buffer = ByteBuffer.allocate(1024 * 1024); // 1MB buffer
            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            boolean isEOS = false;
            long totalSize = videoFile.length();
            long processedSize = 0;
            
            while (!isEOS) {
                int sampleSize = extractor.readSampleData(buffer, 0);
                if (sampleSize < 0) {
                    isEOS = true;
                    bufferInfo.flags = MediaCodec.BUFFER_FLAG_END_OF_STREAM;
                } else {
                    bufferInfo.presentationTimeUs = extractor.getSampleTime();
                    bufferInfo.flags = extractor.getSampleFlags();
                    bufferInfo.size = sampleSize;
                    bufferInfo.offset = 0;
                    
                    muxer.writeSampleData(muxerAudioTrackIndex, buffer, bufferInfo);
                    extractor.advance();
                    
                    // 更新进度
                    processedSize += sampleSize;
                    if (totalSize > 0 && progressCallback != null) {
                        double progress = (double) processedSize / totalSize;
                        progressCallback.onProgress(progress);
                    }
                }
            }
            
            muxer.stop();
            return outputPath;
            
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        } finally {
            if (extractor != null) {
                extractor.release();
            }
            if (muxer != null) {
                muxer.release();
            }
        }
    }
    
    /**
     * 进度回调接口
     */
    public interface ProgressCallback {
        void onProgress(double progress);
    }
}
