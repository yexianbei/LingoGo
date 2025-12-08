# 六白云函数 API 文档生成系统

这是一个为六白项目云函数自动生成 API 文档的系统，类似于 Swagger 文档。

## 功能特性

- 🚀 **自动解析**: 自动分析云函数代码，提取接口信息
- 📝 **美观文档**: 生成美观的 HTML 文档界面
- 🔍 **搜索过滤**: 支持接口搜索和标签过滤
- 📊 **多格式输出**: 支持 HTML 和 JSON 格式
- 👀 **实时监控**: 文件变化时自动重新生成文档
- 🏷️ **智能标签**: 根据函数名自动分类标签

## 快速开始

### 1. 生成文档

```bash
# 一次性生成文档
npm run docs:generate

# 监控文件变化并自动生成文档
npm run docs:watch
```

### 2. 查看文档

```bash
# 启动本地服务器查看文档
npm run docs:serve
```

然后在浏览器中访问 `http://localhost:8080/api-docs.html`

## 文档结构

生成的文档包含以下信息：

### 接口信息
- **接口名称**: 云函数文件名
- **请求方法**: POST (云函数默认)
- **请求路径**: `/{function-name}`
- **描述**: 从代码注释中提取
- **标签**: 根据函数名自动分类

### 参数信息
- **参数名**: 从代码中分析的参数
- **类型**: 参数类型
- **是否必需**: 是否为必需参数
- **位置**: 参数位置 (body/query/header)
- **描述**: 参数描述

### 响应信息
- **状态码**: HTTP 状态码
- **描述**: 响应描述
- **数据结构**: 响应数据结构

## 自动分类标签

系统会根据函数名自动分配标签：

- `user-*` → 用户管理
- `sync-*` → 数据同步  
- `webhook-*` → Webhook
- `ai-*` → AI功能
- `payment-*` → 支付
- `file-*` → 文件管理
- `clock-*` → 定时任务
- 其他 → 通用接口

## 文件结构

```
docs/
├── README.md                 # 说明文档
├── api-doc-generator.js      # 文档生成器核心
├── watch-and-generate.js     # 文件监控脚本
└── generated/               # 生成的文档目录
    ├── api-docs.html        # HTML 格式文档
    └── api-docs.json        # JSON 格式文档
```

## 自定义配置

### 添加更详细的接口描述

在云函数文件开头添加注释：

```typescript
// Function Name: user-login
// 用户登录接口，支持邮箱、手机号、第三方登录等多种方式

export async function main(ctx: FunctionContext) {
  // 函数实现
}
```

### 添加 JSDoc 注释

```typescript
/**
 * 用户登录接口
 * @description 支持多种登录方式的统一登录接口
 * @param {FunctionContext} ctx 云函数上下文
 * @returns {Promise<LiuRqReturn>} 登录结果
 */
export async function main(ctx: FunctionContext) {
  // 函数实现
}
```

## 高级功能

### 1. 实时监控

使用 `npm run docs:watch` 启动监控模式，当云函数文件发生变化时会自动重新生成文档。

### 2. 搜索和过滤

生成的 HTML 文档支持：
- 实时搜索接口名称
- 按标签过滤接口
- 快速导航到指定接口

### 3. 多格式输出

- **HTML**: 适合在浏览器中查看，支持交互功能
- **JSON**: 适合程序化处理或集成到其他系统

## 注意事项

1. 确保云函数文件遵循标准的 TypeScript 格式
2. 建议在函数开头添加描述性注释
3. 参数分析基于代码中的 `body.xxx` 模式
4. 响应分析基于 `return` 语句和类型定义

## 故障排除

### 文档生成失败
- 检查云函数文件语法是否正确
- 确保 `docs/generated` 目录有写入权限

### 监控不工作
- 确保云函数目录路径正确
- 检查文件系统是否支持文件监控

### 文档显示不完整
- 检查云函数文件中的注释格式
- 确保使用了标准的参数和返回值模式

## 扩展开发

如需扩展功能，可以修改以下文件：

- `api-doc-generator.js`: 核心解析和生成逻辑
- `watch-and-generate.js`: 文件监控逻辑
- HTML 模板: 在 `DocumentationGenerator.generateHTML` 方法中修改

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个文档生成系统！