package com.lingogo.app;

import android.os.AsyncTask;
import androidx.annotation.NonNull;
import io.flutter.embedding.android.FlutterActivity;
import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.MethodChannel;

public class MainActivity extends FlutterActivity {
    private static final String CHANNEL = "audio_extractor";

    @Override
    public void configureFlutterEngine(@NonNull FlutterEngine flutterEngine) {
        super.configureFlutterEngine(flutterEngine);
        
        new MethodChannel(flutterEngine.getDartExecutor().getBinaryMessenger(), CHANNEL)
            .setMethodCallHandler((call, result) -> {
                if (call.method.equals("extractAudio")) {
                    String videoPath = call.argument("videoPath");
                    String outputPath = call.argument("outputPath");
                    
                    if (videoPath == null || outputPath == null) {
                        result.error("INVALID_ARGUMENT", "参数错误", null);
                        return;
                    }
                    
                    extractAudio(videoPath, outputPath, result);
                } else {
                    result.notImplemented();
                }
            });
    }

    private void extractAudio(String videoPath, String outputPath, MethodChannel.Result result) {
        new AsyncTask<Void, Double, String>() {
            @Override
            protected String doInBackground(Void... voids) {
                return AudioExtractor.extractAudio(videoPath, outputPath, progress -> {
                    // 可以通过 MethodChannel 发送进度更新
                    // 这里简化处理，实际可以通过 EventChannel 实现
                    publishProgress(progress);
                });
            }
            
            @Override
            protected void onProgressUpdate(Double... progress) {
                // 可以通过 MethodChannel 发送进度更新
                // 这里简化处理，实际可以通过 EventChannel 实现
            }
            
            @Override
            protected void onPostExecute(String resultPath) {
                if (resultPath != null) {
                    result.success(resultPath);
                } else {
                    result.error("EXTRACT_FAILED", "提取音频失败", null);
                }
            }
        }.execute();
    }
}
