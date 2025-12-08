# 多产品统一登录系统 API 文档

## 概述

多产品统一登录系统允许用户使用同一个账户访问多个产品，每个产品通过唯一的 `product_id` 进行标识。系统提供统一的身份认证和产品权限管理。

## 基础信息

- **Base URL**: `https://your-domain.com/api`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token

## 核心概念

### 产品标识 (Product ID)
每个产品都有唯一的标识符，用于区分不同的产品和服务。

### 用户产品权限
用户可以访问多个产品，每个产品下有不同的角色和权限：
- `owner`: 产品所有者
- `admin`: 管理员
- `member`: 普通成员
- `guest`: 访客

## API 接口

### 1. 初始化接口

获取登录所需的公钥和产品配置信息。

**请求**
```http
POST /user-login
Content-Type: application/json

{
  "operateType": "init",
  "product_id": "your-product-id"  // 可选，指定产品ID
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "publicKey": "-----BEGIN PUBLIC KEY-----...",
    "state": "generated-state-string",
    "product_id": "your-product-id",
    "product_name": "Your Product Name",
    "githubOAuthClientId": "github-client-id",
    "googleOAuthClientId": "google-client-id",
    "wxGzhAppid": "wechat-app-id"
  }
}
```

### 2. 邮箱登录/注册

#### 2.1 发送验证码

**请求**
```http
POST /user-login
Content-Type: application/json

{
  "operateType": "email",
  "product_id": "your-product-id",  // 可选
  "enc_email": "encrypted-email",
  "state": "state-from-init",
  "enc_client_key": "encrypted-client-key"
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "message": "Verification code sent successfully"
  }
}
```

#### 2.2 提交验证码

**请求**
```http
POST /user-login
Content-Type: application/json

{
  "operateType": "email_code",
  "product_id": "your-product-id",  // 可选
  "enc_email": "encrypted-email",
  "code": "123456",
  "state": "state-from-init",
  "enc_client_key": "encrypted-client-key"
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "token": "jwt-token",
    "serial_id": "user-serial-id",
    "userId": "user-id",
    "user": {
      "email": "user@example.com",
      "theme": "light",
      "language": "zh-CN",
      "products": [
        {
          "product_id": "product-1",
          "role": "member",
          "permissions": ["read", "write"]
        }
      ]
    },
    "workspaces": [
      {
        "spaceId": "workspace-id",
        "name": "My Workspace",
        "product_id": "product-1"
      }
    ]
  }
}
```

### 3. OAuth 登录

#### 3.1 GitHub OAuth

**请求**
```http
POST /user-login
Content-Type: application/json

{
  "operateType": "github_oauth",
  "product_id": "your-product-id",  // 可选
  "oauth_code": "github-oauth-code",
  "state": "state-from-init",
  "enc_client_key": "encrypted-client-key"
}
```

#### 3.2 Google OAuth

**请求**
```http
POST /user-login
Content-Type: application/json

{
  "operateType": "google_oauth",
  "product_id": "your-product-id",  // 可选
  "oauth_code": "google-oauth-code",
  "state": "state-from-init",
  "enc_client_key": "encrypted-client-key"
}
```

### 4. 产品管理接口

#### 4.1 获取产品信息

**请求**
```http
POST /product-manage
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "operateType": "get_products",
  "product_id": "your-product-id"
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "operateType": "get_products",
    "products": [
      {
        "product_id": "your-product-id",
        "product_name": "Your Product Name",
        "domain": "your-domain.com",
        "status": "active",
        "features": ["feature1", "feature2"]
      }
    ]
  }
}
```

#### 4.2 创建产品

**请求**
```http
POST /product-manage
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "operateType": "create_product",
  "product_id": "new-product-id",
  "product_name": "New Product Name",
  "domain": "new-domain.com",
  "oauth_config": {
    "github_enabled": true,
    "google_enabled": true,
    "wechat_enabled": false
  },
  "limits": {
    "max_users": 1000,
    "max_workspaces_per_user": 10,
    "storage_limit_mb": 1024
  }
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "operateType": "create_product",
    "product": {
      "product_id": "new-product-id",
      "product_name": "New Product Name",
      "domain": "new-domain.com",
      "status": "active",
      "features": []
    }
  }
}
```

### 5. 用户产品管理接口

#### 5.1 获取用户可访问的产品列表

**请求**
```http
POST /product-manage
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "operateType": "get_user_products"
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "operateType": "get_user_products",
    "products": [
      {
        "product_id": "product-1",
        "product_name": "Product One",
        "role": "admin",
        "last_access": 1640995200000,
        "permissions": ["read", "write", "admin"]
      },
      {
        "product_id": "product-2",
        "product_name": "Product Two",
        "role": "member",
        "last_access": 1640995200000,
        "permissions": ["read", "write"]
      }
    ],
    "default_product": "product-1"
  }
}
```

#### 5.2 切换当前产品

**请求**
```http
POST /product-manage
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "operateType": "switch_product",
  "product_id": "product-2"
}
```

**响应**
```json
{
  "code": "0000",
  "data": {
    "operateType": "switch_product",
    "product": {
      "product_id": "product-2",
      "product_name": "Product Two",
      "role": "member",
      "permissions": ["read", "write"]
    },
    "token": "new-jwt-token-with-product-context",
    "workspaces": [
      {
        "spaceId": "workspace-id",
        "name": "Product Two Workspace",
        "product_id": "product-2"
      }
    ]
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0000 | 成功 |
| E4000 | 参数错误 |
| E4001 | 资源已存在 |
| E4003 | 权限不足 |
| E4004 | 资源不存在 |
| E5001 | 服务器内部错误 |
| B0002 | 登录功能已关闭 |
| U0003 | 状态已过期 |
| U0004 | 无效状态 |

## 数据加密

### RSA 加密
敏感数据（如邮箱、手机号、客户端密钥）需要使用从初始化接口获取的公钥进行 RSA 加密。

**加密字段**：
- `enc_email`: 加密后的邮箱地址
- `enc_phone`: 加密后的手机号码
- `enc_client_key`: 加密后的客户端密钥

**客户端密钥格式**：
```
liu-client-key:{actual-client-key}
```

## 请求头说明

| 请求头 | 是否必需 | 说明 |
|--------|----------|------|
| Content-Type | 是 | application/json |
| Authorization | 部分 | Bearer {token}，需要认证的接口必需 |
| User-Agent | 否 | 客户端信息 |
| X-Liu-Client | 否 | 客户端类型标识 |
| X-Liu-Language | 否 | 语言偏好 |
| X-Liu-Theme | 否 | 主题偏好 |
| X-Liu-IDE-Type | 否 | IDE 类型（用于 IDE 扩展登录） |

## 集成示例

### JavaScript/TypeScript 示例

```typescript
class MultiProductAuth {
  private baseUrl: string;
  private productId?: string;
  
  constructor(baseUrl: string, productId?: string) {
    this.baseUrl = baseUrl;
    this.productId = productId;
  }
  
  // 初始化
  async init() {
    const response = await fetch(`${this.baseUrl}/user-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operateType: 'init',
        product_id: this.productId
      })
    });
    
    return response.json();
  }
  
  // 邮箱登录
  async loginWithEmail(encryptedEmail: string, state: string, encryptedClientKey: string) {
    const response = await fetch(`${this.baseUrl}/user-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operateType: 'email',
        product_id: this.productId,
        enc_email: encryptedEmail,
        state: state,
        enc_client_key: encryptedClientKey
      })
    });
    
    return response.json();
  }
  
  // 获取用户产品列表
  async getUserProducts(token: string) {
    const response = await fetch(`${this.baseUrl}/product-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        operateType: 'get_user_products'
      })
    });
    
    return response.json();
  }
  
  // 切换产品
  async switchProduct(token: string, productId: string) {
    const response = await fetch(`${this.baseUrl}/product-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        operateType: 'switch_product',
        product_id: productId
      })
    });
    
    return response.json();
  }
}

// 使用示例
const auth = new MultiProductAuth('https://api.example.com', 'my-product-id');

// 初始化并登录
const initResult = await auth.init();
const loginResult = await auth.loginWithEmail(encryptedEmail, initResult.data.state, encryptedClientKey);

// 获取用户产品列表
const products = await auth.getUserProducts(loginResult.data.token);

// 切换到其他产品
const switchResult = await auth.switchProduct(loginResult.data.token, 'other-product-id');
```

## 最佳实践

1. **产品隔离**: 确保不同产品的数据完全隔离，通过 `product_id` 进行过滤
2. **权限验证**: 每个 API 调用都应验证用户对当前产品的访问权限
3. **Token 管理**: 切换产品时应更新 token，包含新的产品上下文
4. **错误处理**: 实现完善的错误处理机制，特别是权限相关的错误
5. **安全性**: 敏感数据必须加密传输，定期轮换密钥

## 注意事项

1. 所有涉及敏感信息的参数都需要使用 RSA 加密
2. `state` 参数有时效性，需要在有效期内使用
3. 产品切换会影响用户的工作空间和权限上下文
4. 建议在客户端缓存用户的产品列表，减少 API 调用
5. 实现时需要考虑向后兼容性，支持不指定 `product_id` 的传统登录方式