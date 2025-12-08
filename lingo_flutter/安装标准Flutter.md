# 安装标准 Flutter 版本

## 步骤

### 1. 下载标准 Flutter

```bash
# 下载 Flutter SDK
cd ~
git clone https://github.com/flutter/flutter.git -b stable flutter_standard

# 或者直接下载压缩包：
# https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.24.5-stable.tar.xz
# 解压后重命名为 flutter_standard
```

### 2. 配置环境变量

编辑 `~/.zshrc`（如果使用 zsh）或 `~/.bash_profile`（如果使用 bash）：

```bash
# 打开配置文件
nano ~/.zshrc
# 或
nano ~/.bash_profile

# 添加以下内容（在文件末尾）：
# 标准 Flutter（用于 iOS/Android 开发）
export PATH="$HOME/flutter_standard/bin:$PATH"

# 华为 Flutter（用于 HarmonyOS 开发，可选）
# export PATH="$HOME/Library/Huawei/flutter_flutter/bin:$PATH"

# 保存并退出（Ctrl+X, 然后 Y, 然后 Enter）

# 重新加载配置
source ~/.zshrc
# 或
source ~/.bash_profile
```

### 3. 验证安装

```bash
flutter --version
# 应该显示：Flutter 3.24.x 或更新版本
```

### 4. 接受许可

```bash
flutter doctor
# 按提示接受许可
```

### 5. 重新运行项目

```bash
cd /Users/mac/Documents/code/LingoGo/lingo_flutter
flutter clean
flutter pub get
cd ios && pod install && cd ..
flutter run
```

## 如果两个版本都需要

如果你需要同时使用两个版本，可以：

1. **默认使用标准版本**（在 PATH 中优先）
2. **需要 ohos 版本时**，临时切换：
```bash
export PATH="/Users/mac/Library/Huawei/flutter_flutter/bin:$PATH"
flutter --version  # 验证切换成功
```

## 快速安装脚本

```bash
# 一键安装标准 Flutter
cd ~
git clone https://github.com/flutter/flutter.git -b stable flutter_standard
echo 'export PATH="$HOME/flutter_standard/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
flutter doctor
```

