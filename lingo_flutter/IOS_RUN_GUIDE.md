# iOS 运行指南

## 前置条件

1. **安装 Xcode**
   - 从 App Store 安装 Xcode（最新版本）
   - 打开 Xcode，接受许可协议
   - 运行 `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

2. **安装 CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

3. **安装 Flutter 依赖**
   ```bash
   cd /Users/mac/Documents/code/LingoGo/lingo_flutter
   flutter pub get
   ```

## 运行步骤

### 方法一：使用 Flutter 命令（推荐）

1. **检查可用设备**
   ```bash
   flutter devices
   ```
   应该能看到连接的 iOS 设备或模拟器

2. **运行应用**
   
   **在模拟器上运行：**
   ```bash
   flutter run
   ```
   如果没有运行的模拟器，Flutter 会自动启动一个
   
   **在真机上运行：**
   ```bash
   flutter run -d <device-id>
   ```
   其中 `<device-id>` 是 `flutter devices` 显示的设备ID

3. **热重载**
   - 在终端按 `r` 键进行热重载
   - 按 `R` 键进行热重启
   - 按 `q` 键退出

### 方法二：使用 Xcode（适合调试原生代码）

1. **安装 CocoaPods 依赖**
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. **打开 Xcode 项目**
   ```bash
   open ios/Runner.xcworkspace
   ```
   ⚠️ 注意：必须打开 `.xcworkspace` 文件，不是 `.xcodeproj` 文件

3. **在 Xcode 中运行**
   - 选择目标设备（模拟器或真机）
   - 点击运行按钮（▶️）或按 `Cmd + R`
   - 等待编译和运行

## 常见问题

### 1. CocoaPods 安装失败

**错误信息：**
```
[!] CocoaPods could not find compatible versions
```

**解决方法：**
```bash
cd ios
pod repo update
pod install --repo-update
cd ..
```

### 2. 签名错误

**错误信息：**
```
Signing for "Runner" requires a development team
```

**解决方法：**
1. 在 Xcode 中打开项目
2. 选择 `Runner` target
3. 在 `Signing & Capabilities` 中：
   - 勾选 `Automatically manage signing`
   - 选择你的 Apple ID 作为 Team

### 3. 模拟器无法启动

**解决方法：**
```bash
# 列出所有模拟器
xcrun simctl list devices

# 启动特定模拟器
open -a Simulator
```

### 4. 真机运行需要开发者账号

如果要在真机上运行，需要：
1. 注册 Apple Developer 账号（免费账号也可以）
2. 在 Xcode 中登录 Apple ID
3. 配置签名和证书

### 5. Flutter 版本问题

如果遇到 Flutter 版本问题，可以：
```bash
# 检查 Flutter 版本
flutter --version

# 升级 Flutter（如果使用的是标准版本）
flutter upgrade
```

## 性能优化

### 1. 使用 Release 模式运行

```bash
flutter run --release
```

### 2. 使用 Profile 模式（性能分析）

```bash
flutter run --profile
```

### 3. 清理构建缓存

```bash
flutter clean
flutter pub get
cd ios
pod install
cd ..
```

## 调试技巧

### 1. 查看日志

在终端运行 `flutter run` 时，会自动显示日志

### 2. 使用 Xcode 调试器

在 Xcode 中设置断点，可以调试原生代码

### 3. 使用 Flutter DevTools

```bash
flutter pub global activate devtools
flutter pub global run devtools
```

## 快速命令参考

```bash
# 检查设备
flutter devices

# 运行应用
flutter run

# 在特定设备运行
flutter run -d <device-id>

# 运行 Release 版本
flutter run --release

# 清理并重新构建
flutter clean
flutter pub get
cd ios && pod install && cd ..

# 查看日志
flutter logs
```

## 下一步

运行成功后，你可以：
1. 修改代码并热重载查看效果
2. 添加断点进行调试
3. 使用性能分析工具优化应用
4. 配置应用图标和启动画面

