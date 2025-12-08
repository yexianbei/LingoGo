# LingoGo Flutter 前端项目

## 项目结构

```
lingo_flutter/
├── lib/
│   ├── core/                        # 核心功能
│   │   ├── config/                  # 配置
│   │   ├── network/                 # 网络层
│   │   ├── storage/                 # 本地存储
│   │   ├── utils/                   # 工具类
│   │   └── theme/                   # 主题
│   │
│   ├── data/                        # 数据层
│   │   ├── models/                  # 数据模型
│   │   │   ├── lingo_language.dart
│   │   │   ├── translation_detail_model.dart
│   │   │   ├── translation_model.dart
│   │   │   ├── favorite_model.dart
│   │   │   ├── flashcard_model.dart
│   │   │   ├── user_settings_model.dart
│   │   │   └── audio_cache_model.dart
│   │   ├── repositories/            # 数据仓库
│   │   └── datasources/             # 数据源
│   │
│   ├── domain/                      # 业务逻辑层
│   │   ├── usecases/                # 用例
│   │   └── services/                # 业务服务
│   │
│   ├── presentation/                # 表现层
│   │   ├── pages/                   # 页面
│   │   ├── widgets/                 # 组件
│   │   └── providers/               # 状态管理
│   │
│   └── services/                    # 平台服务
│       ├── audio/                   # 音频服务
│       └── notification/            # 通知服务
│
├── test/                            # 测试
└── assets/                          # 资源文件
```

## 数据模型

所有数据模型位于 `lib/data/models/` 目录下，与后端数据结构对应：

- `lingo_language.dart` - 语言枚举
- `translation_detail_model.dart` - 翻译详情模型
- `translation_model.dart` - 翻译记录模型
- `favorite_model.dart` - 收藏模型
- `flashcard_model.dart` - 闪卡模型
- `user_settings_model.dart` - 用户设置模型
- `audio_cache_model.dart` - 音频缓存模型

## 后端API

后端API位于 `liubai-backends/liubai-laf/cloud-functions/` 目录下：

- `lingo-translation.ts` - 翻译相关API
- `lingo-favorite.ts` - 收藏相关API
- `lingo-flashcard.ts` - 闪卡相关API
- `lingo-audio.ts` - 音频相关API
- `lingo-user-settings.ts` - 用户设置API

## 数据结构

所有数据结构定义在 `liubai-backends/liubai-laf/cloud-functions/common-types.ts` 中，包括：

- `Table_LingoTranslation` - 翻译记录表
- `Table_LingoFavorite` - 收藏表
- `Table_LingoFlashcard` - 闪卡表
- `Table_LingoUserSettings` - 用户设置表
- `Table_LingoReviewSession` - 复习会话表
- `Table_LingoAudioCache` - 音频缓存表

以及对应的API命名空间：
- `LingoTranslationAPI`
- `LingoFavoriteAPI`
- `LingoFlashcardAPI`
- `LingoAudioAPI`
- `LingoUserSettingsAPI`

