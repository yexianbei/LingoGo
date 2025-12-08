# 多产品统一登录系统集成指南

## 概述

本指南将帮助开发者将现有应用集成到多产品统一登录系统中，实现跨产品的用户身份认证和权限管理。

## 集成前准备

### 1. 环境要求

- Node.js 16+ 或其他支持 RSA 加密的运行环境
- 支持 JWT token 解析
- 支持 HTTPS 请求

### 2. 获取产品配置

在开始集成前，需要先创建产品配置：

```typescript
// 创建产品配置
const productConfig = {
  product_id: "your-unique-product-id",
  product_name: "Your Product Name",
  domain: "your-domain.com",
  oauth_config: {
    github_enabled: true,
    google_enabled: true,
    wechat_enabled: false
  },
  limits: {
    max_users: 1000,
    max_workspaces_per_user: 10,
    storage_limit_mb: 1024
  }
};
```

## 集成步骤

### 第一步：安装依赖

```bash
npm install crypto-js jsonwebtoken node-rsa
```

### 第二步：创建认证客户端

```typescript
import CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';

export class LiuBaiAuth {
  private baseUrl: string;
  private productId: string;
  private publicKey?: NodeRSA;
  private state?: string;
  
  constructor(baseUrl: string, productId: string) {
    this.baseUrl = baseUrl;
    this.productId = productId;
  }
  
  // 初始化认证
  async initialize() {
    try {
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
      
      const result = await response.json();
      
      if (result.code === '0000') {
        this.publicKey = new NodeRSA(result.data.publicKey);
        this.state = result.data.state;
        return result.data;
      } else {
        throw new Error(`初始化失败: ${result.errMsg}`);
      }
    } catch (error) {
      console.error('初始化认证失败:', error);
      throw error;
    }
  }
  
  // 加密数据
  private encrypt(data: string): string {
    if (!this.publicKey) {
      throw new Error('请先调用 initialize() 方法');
    }
    return this.publicKey.encrypt(data, 'base64');
  }
  
  // 生成客户端密钥
  private generateClientKey(): string {
    const randomKey = CryptoJS.lib.WordArray.random(32).toString();
    return `liu-client-key:${randomKey}`;
  }
  
  // 邮箱登录
  async loginWithEmail(email: string): Promise<any> {
    const clientKey = this.generateClientKey();
    const encryptedEmail = this.encrypt(email);
    const encryptedClientKey = this.encrypt(clientKey);
    
    const response = await fetch(`${this.baseUrl}/user-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operateType: 'email',
        product_id: this.productId,
        enc_email: encryptedEmail,
        state: this.state,
        enc_client_key: encryptedClientKey
      })
    });
    
    return response.json();
  }
  
  // 提交邮箱验证码
  async submitEmailCode(email: string, code: string): Promise<any> {
    const clientKey = this.generateClientKey();
    const encryptedEmail = this.encrypt(email);
    const encryptedClientKey = this.encrypt(clientKey);
    
    const response = await fetch(`${this.baseUrl}/user-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operateType: 'email_code',
        product_id: this.productId,
        enc_email: encryptedEmail,
        code: code,
        state: this.state,
        enc_client_key: encryptedClientKey
      })
    });
    
    return response.json();
  }
  
  // GitHub OAuth 登录
  async loginWithGitHub(oauthCode: string): Promise<any> {
    const clientKey = this.generateClientKey();
    const encryptedClientKey = this.encrypt(clientKey);
    
    const response = await fetch(`${this.baseUrl}/user-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operateType: 'github_oauth',
        product_id: this.productId,
        oauth_code: oauthCode,
        state: this.state,
        enc_client_key: encryptedClientKey
      })
    });
    
    return response.json();
  }
}
```

### 第三步：创建产品管理客户端

```typescript
export class ProductManager {
  private baseUrl: string;
  private token: string;
  
  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }
  
  // 获取用户可访问的产品列表
  async getUserProducts() {
    const response = await fetch(`${this.baseUrl}/product-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        operateType: 'get_user_products'
      })
    });
    
    return response.json();
  }
  
  // 切换当前产品
  async switchProduct(productId: string) {
    const response = await fetch(`${this.baseUrl}/product-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        operateType: 'switch_product',
        product_id: productId
      })
    });
    
    return response.json();
  }
  
  // 获取产品信息
  async getProductInfo(productId: string) {
    const response = await fetch(`${this.baseUrl}/product-manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        operateType: 'get_products',
        product_id: productId
      })
    });
    
    return response.json();
  }
}
```

### 第四步：实现完整的登录流程

```typescript
export class AuthService {
  private auth: LiuBaiAuth;
  private productManager?: ProductManager;
  private currentToken?: string;
  
  constructor(baseUrl: string, productId: string) {
    this.auth = new LiuBaiAuth(baseUrl, productId);
  }
  
  // 完整的邮箱登录流程
  async emailLogin(email: string): Promise<{
    success: boolean;
    needVerification?: boolean;
    token?: string;
    user?: any;
    error?: string;
  }> {
    try {
      // 1. 初始化
      await this.auth.initialize();
      
      // 2. 发送验证码
      const emailResult = await this.auth.loginWithEmail(email);
      
      if (emailResult.code !== '0000') {
        return {
          success: false,
          error: emailResult.errMsg
        };
      }
      
      return {
        success: true,
        needVerification: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 提交验证码并完成登录
  async verifyEmailCode(email: string, code: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    products?: any[];
    error?: string;
  }> {
    try {
      const result = await this.auth.submitEmailCode(email, code);
      
      if (result.code === '0000') {
        this.currentToken = result.data.token;
        this.productManager = new ProductManager(this.auth['baseUrl'], this.currentToken);
        
        // 获取用户可访问的产品列表
        const productsResult = await this.productManager.getUserProducts();
        
        return {
          success: true,
          token: result.data.token,
          user: result.data.user,
          products: productsResult.data?.products || []
        };
      } else {
        return {
          success: false,
          error: result.errMsg
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // GitHub OAuth 登录
  async githubLogin(oauthCode: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    products?: any[];
    error?: string;
  }> {
    try {
      await this.auth.initialize();
      const result = await this.auth.loginWithGitHub(oauthCode);
      
      if (result.code === '0000') {
        this.currentToken = result.data.token;
        this.productManager = new ProductManager(this.auth['baseUrl'], this.currentToken);
        
        const productsResult = await this.productManager.getUserProducts();
        
        return {
          success: true,
          token: result.data.token,
          user: result.data.user,
          products: productsResult.data?.products || []
        };
      } else {
        return {
          success: false,
          error: result.errMsg
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 切换产品
  async switchProduct(productId: string): Promise<{
    success: boolean;
    token?: string;
    product?: any;
    workspaces?: any[];
    error?: string;
  }> {
    if (!this.productManager) {
      return {
        success: false,
        error: '请先登录'
      };
    }
    
    try {
      const result = await this.productManager.switchProduct(productId);
      
      if (result.code === '0000') {
        this.currentToken = result.data.token;
        this.productManager = new ProductManager(this.auth['baseUrl'], this.currentToken);
        
        return {
          success: true,
          token: result.data.token,
          product: result.data.product,
          workspaces: result.data.workspaces || []
        };
      } else {
        return {
          success: false,
          error: result.errMsg
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## 前端集成示例

### React 集成

```tsx
import React, { useState, useEffect } from 'react';
import { AuthService } from './auth-service';

const LoginComponent: React.FC = () => {
  const [authService] = useState(() => new AuthService('https://api.example.com', 'your-product-id'));
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'verification' | 'success'>('email');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await authService.emailLogin(email);
    
    if (result.success && result.needVerification) {
      setStep('verification');
    } else {
      setError(result.error || '登录失败');
    }
    
    setLoading(false);
  };
  
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await authService.verifyEmailCode(email, verificationCode);
    
    if (result.success) {
      setUser(result.user);
      setProducts(result.products || []);
      setStep('success');
      
      // 保存 token 到本地存储
      localStorage.setItem('auth_token', result.token!);
    } else {
      setError(result.error || '验证失败');
    }
    
    setLoading(false);
  };
  
  const handleProductSwitch = async (productId: string) => {
    setLoading(true);
    
    const result = await authService.switchProduct(productId);
    
    if (result.success) {
      // 更新 token
      localStorage.setItem('auth_token', result.token!);
      // 刷新页面或更新应用状态
      window.location.reload();
    } else {
      setError(result.error || '切换产品失败');
    }
    
    setLoading(false);
  };
  
  if (step === 'success') {
    return (
      <div className="login-success">
        <h2>登录成功</h2>
        <p>欢迎，{user?.email}</p>
        
        {products.length > 1 && (
          <div className="product-selector">
            <h3>选择产品</h3>
            {products.map((product: any) => (
              <button
                key={product.product_id}
                onClick={() => handleProductSwitch(product.product_id)}
                disabled={loading}
                className="product-button"
              >
                {product.product_name} ({product.role})
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="login-form">
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit}>
          <h2>邮箱登录</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '发送中...' : '发送验证码'}
          </button>
        </form>
      )}
      
      {step === 'verification' && (
        <form onSubmit={handleVerificationSubmit}>
          <h2>输入验证码</h2>
          <p>验证码已发送到 {email}</p>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="请输入验证码"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '验证中...' : '验证并登录'}
          </button>
        </form>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default LoginComponent;
```

### Vue 集成

```vue
<template>
  <div class="login-container">
    <div v-if="step === 'email'" class="login-form">
      <h2>邮箱登录</h2>
      <form @submit.prevent="handleEmailSubmit">
        <input
          v-model="email"
          type="email"
          placeholder="请输入邮箱"
          required
        />
        <button type="submit" :disabled="loading">
          {{ loading ? '发送中...' : '发送验证码' }}
        </button>
      </form>
    </div>
    
    <div v-if="step === 'verification'" class="login-form">
      <h2>输入验证码</h2>
      <p>验证码已发送到 {{ email }}</p>
      <form @submit.prevent="handleVerificationSubmit">
        <input
          v-model="verificationCode"
          type="text"
          placeholder="请输入验证码"
          required
        />
        <button type="submit" :disabled="loading">
          {{ loading ? '验证中...' : '验证并登录' }}
        </button>
      </form>
    </div>
    
    <div v-if="step === 'success'" class="login-success">
      <h2>登录成功</h2>
      <p>欢迎，{{ user?.email }}</p>
      
      <div v-if="products.length > 1" class="product-selector">
        <h3>选择产品</h3>
        <button
          v-for="product in products"
          :key="product.product_id"
          @click="handleProductSwitch(product.product_id)"
          :disabled="loading"
          class="product-button"
        >
          {{ product.product_name }} ({{ product.role }})
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AuthService } from './auth-service';

const authService = new AuthService('https://api.example.com', 'your-product-id');

const email = ref('');
const verificationCode = ref('');
const step = ref<'email' | 'verification' | 'success'>('email');
const user = ref(null);
const products = ref([]);
const loading = ref(false);
const error = ref('');

const handleEmailSubmit = async () => {
  loading.value = true;
  error.value = '';
  
  const result = await authService.emailLogin(email.value);
  
  if (result.success && result.needVerification) {
    step.value = 'verification';
  } else {
    error.value = result.error || '登录失败';
  }
  
  loading.value = false;
};

const handleVerificationSubmit = async () => {
  loading.value = true;
  error.value = '';
  
  const result = await authService.verifyEmailCode(email.value, verificationCode.value);
  
  if (result.success) {
    user.value = result.user;
    products.value = result.products || [];
    step.value = 'success';
    
    localStorage.setItem('auth_token', result.token!);
  } else {
    error.value = result.error || '验证失败';
  }
  
  loading.value = false;
};

const handleProductSwitch = async (productId: string) => {
  loading.value = true;
  
  const result = await authService.switchProduct(productId);
  
  if (result.success) {
    localStorage.setItem('auth_token', result.token!);
    window.location.reload();
  } else {
    error.value = result.error || '切换产品失败';
  }
  
  loading.value = false;
};
</script>
```

## 移动端集成

### React Native 示例

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from './auth-service';

export class MobileAuthService extends AuthService {
  // 保存 token 到本地存储
  async saveToken(token: string) {
    await AsyncStorage.setItem('auth_token', token);
  }
  
  // 从本地存储获取 token
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }
  
  // 清除 token
  async clearToken() {
    await AsyncStorage.removeItem('auth_token');
  }
  
  // 检查登录状态
  async checkAuthStatus(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    
    // 这里可以添加 token 验证逻辑
    // 例如解析 JWT 检查过期时间
    
    return true;
  }
}
```

## 错误处理和重试机制

```typescript
export class RobustAuthService extends AuthService {
  private maxRetries = 3;
  private retryDelay = 1000;
  
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }
  
  private isRetryableError(error: any): boolean {
    // 网络错误或服务器错误可以重试
    return error.code === 'NETWORK_ERROR' || 
           error.code === 'E5001' ||
           (error.status >= 500 && error.status < 600);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 重写邮箱登录方法，添加重试机制
  async emailLogin(email: string) {
    return this.withRetry(() => super.emailLogin(email));
  }
  
  // 重写验证码提交方法，添加重试机制
  async verifyEmailCode(email: string, code: string) {
    return this.withRetry(() => super.verifyEmailCode(email, code));
  }
}
```

## 安全最佳实践

### 1. Token 管理

```typescript
export class SecureTokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  // 安全存储 token
  static async setToken(token: string, refreshToken?: string) {
    // 在生产环境中，考虑使用加密存储
    await AsyncStorage.setItem(this.TOKEN_KEY, token);
    if (refreshToken) {
      await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }
  
  // 获取 token
  static async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.TOKEN_KEY);
  }
  
  // 检查 token 是否过期
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  
  // 清除所有 token
  static async clearTokens() {
    await AsyncStorage.multiRemove([this.TOKEN_KEY, this.REFRESH_TOKEN_KEY]);
  }
}
```

### 2. 请求拦截器

```typescript
export class AuthInterceptor {
  private authService: AuthService;
  
  constructor(authService: AuthService) {
    this.authService = authService;
  }
  
  // 请求拦截器
  async interceptRequest(config: any) {
    const token = await SecureTokenManager.getToken();
    
    if (token && !SecureTokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      // Token 过期，尝试刷新
      try {
        const newToken = await this.refreshToken();
        config.headers.Authorization = `Bearer ${newToken}`;
      } catch (error) {
        // 刷新失败，跳转到登录页
        await this.redirectToLogin();
        throw new Error('Authentication required');
      }
    }
    
    return config;
  }
  
  // 响应拦截器
  async interceptResponse(response: any) {
    if (response.status === 401) {
      // 未授权，清除 token 并跳转到登录页
      await SecureTokenManager.clearTokens();
      await this.redirectToLogin();
    }
    
    return response;
  }
  
  private async refreshToken(): Promise<string> {
    // 实现 token 刷新逻辑
    // 这里需要根据实际的刷新 token 接口来实现
    throw new Error('Token refresh not implemented');
  }
  
  private async redirectToLogin() {
    // 跳转到登录页的逻辑
    // 在 React Native 中可能是导航到登录屏幕
    // 在 Web 中可能是重定向到登录页面
  }
}
```

## 测试

### 单元测试示例

```typescript
import { AuthService } from './auth-service';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService('https://test-api.example.com', 'test-product-id');
  });
  
  test('should initialize successfully', async () => {
    // Mock fetch response
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        code: '0000',
        data: {
          publicKey: 'test-public-key',
          state: 'test-state'
        }
      })
    });
    
    const result = await authService['auth'].initialize();
    
    expect(result.publicKey).toBe('test-public-key');
    expect(result.state).toBe('test-state');
  });
  
  test('should handle email login', async () => {
    // Mock initialization
    authService['auth']['publicKey'] = new NodeRSA('test-key');
    authService['auth']['state'] = 'test-state';
    
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        code: '0000',
        data: { message: 'Verification code sent' }
      })
    });
    
    const result = await authService.emailLogin('test@example.com');
    
    expect(result.success).toBe(true);
    expect(result.needVerification).toBe(true);
  });
});
```

## 部署注意事项

1. **环境配置**: 确保在不同环境（开发、测试、生产）中使用正确的 API 端点
2. **HTTPS**: 生产环境必须使用 HTTPS 确保数据传输安全
3. **CORS**: 配置正确的跨域资源共享策略
4. **监控**: 实施日志记录和错误监控
5. **性能**: 考虑 API 调用的缓存策略

## 常见问题

### Q: 如何处理网络错误？
A: 实现重试机制和离线缓存，提供友好的错误提示。

### Q: 如何在多个标签页之间同步登录状态？
A: 使用 localStorage 事件监听或 BroadcastChannel API。

### Q: 如何处理 token 过期？
A: 实现自动刷新机制或引导用户重新登录。

### Q: 如何确保数据安全？
A: 使用 HTTPS、RSA 加密敏感数据、定期轮换密钥。

## 支持

如有问题，请联系技术支持或查看详细的 API 文档。