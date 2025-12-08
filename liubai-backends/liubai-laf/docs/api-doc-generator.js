// API Documentation Generator for Liubai Cloud Functions
// 为六白云函数项目生成类似 Swagger 的接口文档

const fs = require('fs')
const path = require('path')

class CloudFunctionAnalyzer {
  constructor(cloudFunctionsDir) {
    this.cloudFunctionsDir = cloudFunctionsDir
    this.endpoints = []
  }

  async analyzeAllFunctions() {
    const files = fs.readdirSync(this.cloudFunctionsDir)
    const tsFiles = files.filter(file => file.endsWith('.ts') && !file.startsWith('__'))

    for (const file of tsFiles) {
      const filePath = path.join(this.cloudFunctionsDir, file)
      await this.analyzeSingleFunction(filePath, file)
    }

    return {
      info: {
        title: "六白云函数接口文档",
        version: "1.0.0",
        description: "基于 Laf 云函数的后端接口文档"
      },
      endpoints: this.endpoints,
      generatedAt: new Date().toISOString()
    }
  }

  async analyzeSingleFunction(filePath, fileName) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const functionName = fileName.replace('.ts', '')
    
    // 提取函数注释中的描述
    const description = this.extractDescription(content)
    
    // 分析 main 函数的参数和返回值
    const parameters = this.extractParameters(content)
    const requestHeaders = this.extractRequestHeaders(content)
    const responses = this.extractResponses(content)
    const tags = this.extractTags(content, functionName)
    const examples = this.extractExamples(content, functionName)
    
    const endpoint = {
      name: functionName,
      description,
      method: 'POST', // 云函数默认为 POST
      path: `/${functionName}`,
      parameters,
      requestHeaders,
      responses,
      tags,
      examples
    }

    this.endpoints.push(endpoint)
  }

  extractDescription(content) {
    // 提取函数描述
    const lines = content.split('\n');
    let description = '';
    let inComment = false;
    let commentLines = [];
    
    // 查找注释中的描述，但限制搜索范围
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i].trim();
      
      // 跳过空行
      if (!line) continue;
      
      // 如果遇到函数定义，停止
      if (line.includes('export') && (line.includes('function') || line.includes('async'))) {
        break;
      }
      
      // 检测多行注释开始
      if (line.includes('/**')) {
        inComment = true;
        continue;
      }
      
      // 检测多行注释结束
      if (line.includes('*/')) {
        inComment = false;
        break;
      }
      
      // 提取多行注释内容
      if (inComment && line.startsWith('*') && !line.startsWith('*/')) {
        const comment = line.replace(/^\*\s*/, '').trim();
        if (comment && !comment.startsWith('Function Name:') && !comment.startsWith('author:')) {
          commentLines.push(comment);
        }
      }
      
      // 提取单行注释（只在文件开头）
      if (i < 10 && line.startsWith('//')) {
        const comment = line.replace(/^\/\/\s*/, '').trim();
        if (comment && !comment.includes('Function Name:') && !comment.includes('author:')) {
          commentLines.push(comment);
        }
      }
    }
    
    // 组合注释内容
    if (commentLines.length > 0) {
      description = commentLines.join(' ');
    }
    
    // 如果没有找到注释描述，尝试从代码中提取基本信息
    if (!description.trim()) {
      // 查找 Function Name 和 author 信息
      const functionNameMatch = content.match(/Function Name:\s*([^\n\r*]+)/);
      const authorMatch = content.match(/author:\s*([^\n\r*]+)/);
      
      if (functionNameMatch || authorMatch) {
        const parts = [];
        if (functionNameMatch) parts.push(`Function Name: ${functionNameMatch[1].trim()}`);
        if (authorMatch) parts.push(`author: ${authorMatch[1].trim()}`);
        description = parts.join(' / ');
      }
    }
    
    // 限制描述长度，避免包含过长内容
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }
    
    return description.trim();
  }

  extractParameters(content) {
    const parameters = []
    
    // 查找 body 参数的使用
    const bodyMatches = content.match(/body\.(\w+)/g) || []
    const uniqueParams = [...new Set(bodyMatches.map(match => match.replace('body.', '')))]
    
    uniqueParams.forEach(param => {
      // 尝试推断参数类型
      let type = 'string'
      let description = ''
      
      // 查找参数的类型定义或使用上下文
      const paramRegex = new RegExp(`body\\.${param}\\s*[=:]?\\s*([^\\n;]+)`, 'g')
      const matches = content.match(paramRegex)
      
      if (matches) {
        const usage = matches[0]
        if (usage.includes('parseInt') || usage.includes('Number(')) {
          type = 'integer'
        } else if (usage.includes('parseFloat')) {
          type = 'number'
        } else if (usage.includes('Boolean') || usage.includes('!!')) {
          type = 'boolean'
        } else if (usage.includes('JSON.parse') || usage.includes('Array')) {
          type = 'array'
        }
      }
      
      // 查找参数的注释描述
      const commentRegex = new RegExp(`//.*${param}.*`, 'i')
      const commentMatch = content.match(commentRegex)
      if (commentMatch) {
        description = commentMatch[0].replace(/\/\/\s*/, '').trim()
      }
      
      parameters.push({
        name: param,
        type: type,
        required: true, // 默认为必需，可以根据实际情况调整
        description: description || `${param} parameter`,
        in: 'body'
      })
    })

    return parameters
  }

  extractRequestHeaders(content) {
    const headers = []
    
    // 查找常见的请求头使用模式
    const headerPatterns = [
      { pattern: /ctx\.headers\?\.\'authorization\'\]|ctx\.headers\?\.\'Authorization\'\]/g, name: 'Authorization', description: '认证令牌' },
      { pattern: /ctx\.headers\?\.\'content-type\'\]|ctx\.headers\?\.\'Content-Type\'\]/g, name: 'Content-Type', description: '请求内容类型' },
      { pattern: /ctx\.headers\?\.\'user-agent\'\]|ctx\.headers\?\.\'User-Agent\'\]/g, name: 'User-Agent', description: '用户代理信息' },
      { pattern: /verifyToken\(|token/gi, name: 'Authorization', description: 'Bearer token for authentication' }
    ]
    
    const foundHeaders = new Set()
    
    headerPatterns.forEach(({ pattern, name, description }) => {
      if (pattern.test(content) && !foundHeaders.has(name)) {
        foundHeaders.add(name)
        headers.push({
          name: name,
          type: 'string',
          required: name === 'Authorization' ? true : false,
          description: description,
          in: 'header'
        })
      }
    })
    
    return headers
  }

  extractResponses(content) {
    const responses = {}
    
    // 更强大的正则表达式来匹配return语句，支持多行和各种格式
    const returnMatches = content.match(/return\s*\{[\s\S]*?code[\s\S]*?\}/g) || []
    const codeMatches = content.match(/code:\s*["']([A-Z0-9]+)["']/g) || []
    
    // 提取所有可能的状态码
    const statusCodes = new Set()
    
    // 从返回语句中提取状态码
    codeMatches.forEach(match => {
      const code = match.match(/["']([A-Z0-9]+)["']/)[1]
      statusCodes.add(code)
    })
    
    // 特别检查是否有"0000"成功状态码
    const successMatches = content.match(/code:\s*["']0000["']/g) || []
    if (successMatches.length > 0) {
      statusCodes.add('0000')
    }
    
    // 如果没有找到状态码，添加默认的
    if (statusCodes.size === 0) {
      statusCodes.add('0000')
      statusCodes.add('E4000')
    }
    
    // 按优先级排序状态码，确保0000优先处理
    const sortedCodes = Array.from(statusCodes).sort((a, b) => {
      if (a === '0000') return -1
      if (b === '0000') return 1
      return a.localeCompare(b)
    })
    
    // 为每个状态码生成响应定义
    sortedCodes.forEach(code => {
      let description = ''
      let schema = {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '响应状态码',
            example: code
          }
        }
      }
      
      // 根据状态码确定描述和HTTP状态
      let httpStatus = 200
      if (code === '0000') {
        description = '请求成功'
        schema.properties.data = {
          type: 'object',
          description: '响应数据'
        }
      } else if (code.startsWith('E4')) {
        description = '客户端错误'
        httpStatus = 400
        schema.properties.errMsg = {
          type: 'string',
          description: '错误信息'
        }
      } else if (code.startsWith('E5')) {
        description = '服务器错误'
        httpStatus = 500
        schema.properties.errMsg = {
          type: 'string',
          description: '错误信息'
        }
      } else {
        description = '其他响应'
      }
      
      // 尝试从代码中提取更详细的响应数据结构
      const dataStructure = this.extractResponseDataStructure(content, code)
      if (dataStructure && schema.properties.data) {
        schema.properties.data = dataStructure
      }
      
      // 只有当HTTP状态码还没有被设置，或者当前是0000状态码时才设置响应
      if (!responses[httpStatus] || code === '0000') {
        responses[httpStatus] = {
          description: description,
          content: {
            'application/json': {
              schema: schema,
              example: this.generateResponseExample(code, dataStructure)
            }
          }
        }
      }
    })
    
    return responses
  }

  extractResponseDataStructure(content, code) {
    // 对于成功响应（code: "0000"），尝试解析具体的数据结构
    if (code === '0000') {
      // 查找返回语句中的数据对象
      const returnDataMatches = content.match(/return\s+\{\s*code:\s*["']0000["'][^}]*data:\s*([^,}]+)/g) || []
      
      // 特别处理登录接口的响应数据结构
      if (content.includes('Res_UserLoginNormal') || content.includes('user-login')) {
        return {
          type: 'object',
          description: '登录成功响应数据',
          properties: {
            email: {
              type: 'string',
              description: '用户邮箱',
              example: 'user@example.com'
            },
            open_id: {
              type: 'string',
              description: '用户开放ID',
              example: 'openid_123456'
            },
            github_id: {
              type: 'number',
              description: 'GitHub用户ID',
              example: 12345678
            },
            theme: {
              type: 'string',
              description: '用户主题设置',
              example: 'light'
            },
            language: {
              type: 'string',
              description: '用户语言设置',
              example: 'zh-CN'
            },
            spaceMemberList: {
              type: 'array',
              description: '用户所属空间和成员信息列表',
              items: {
                type: 'object',
                properties: {
                  spaceId: { type: 'string', example: 'space_123' },
                  memberId: { type: 'string', example: 'member_456' },
                  memberName: { type: 'string', example: '用户昵称' }
                }
              }
            },
            subscription: {
              type: 'object',
              description: '用户订阅信息',
              properties: {
                level: { type: 'string', example: 'premium' },
                expiredStamp: { type: 'number', example: 1735689600000 }
              }
            },
            serial_id: {
              type: 'string',
              description: '会话序列ID',
              example: 'serial_789'
            },
            token: {
              type: 'string',
              description: '访问令牌',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            userId: {
              type: 'string',
              description: '用户ID',
              example: 'user_123456'
            }
          }
        }
      }
      
      // 查找其他类型的响应数据结构
      const dataVariableMatches = content.match(/const\s+(\w+):\s*\w*Res\w*\s*=\s*\{[^}]+\}/g) || []
      if (dataVariableMatches.length > 0) {
        return {
          type: 'object',
          description: '响应数据对象',
          properties: {
            message: {
              type: 'string',
              description: '响应消息',
              example: '操作成功'
            }
          }
        }
      }
    }
    
    // 查找接口类型定义
    const interfaceMatches = content.match(/interface\s+\w*Res\w*\s*\{[^}]+\}/g) || []
    if (interfaceMatches.length > 0) {
      return {
        type: 'object',
        description: '根据接口定义的响应数据'
      }
    }
    
    return null
  }

  generateResponseExample(code, dataStructure) {
    const baseExample = { code }
    
    if (code === '0000') {
      // 为成功响应生成详细的数据示例
      if (dataStructure && dataStructure.properties) {
        const data = {}
        
        // 根据数据结构生成示例数据
        Object.keys(dataStructure.properties).forEach(key => {
          const prop = dataStructure.properties[key]
          if (prop.example !== undefined) {
            data[key] = prop.example
          } else {
            // 根据类型生成默认示例
            switch (prop.type) {
              case 'string':
                data[key] = `示例${key}`
                break
              case 'number':
                data[key] = 123
                break
              case 'boolean':
                data[key] = true
                break
              case 'array':
                data[key] = prop.items ? [{}] : []
                break
              case 'object':
                data[key] = {}
                break
              default:
                data[key] = null
            }
          }
        })
        
        baseExample.data = data
      } else {
        baseExample.data = { message: 'Success' }
      }
    } else {
      baseExample.errMsg = code.startsWith('E4') ? '客户端请求错误' : '服务器内部错误'
    }
    
    return baseExample
  }

  extractTags(content, functionName) {
    const tags = []
    
    // 根据函数名推断标签
    if (functionName.includes('user')) tags.push('用户管理')
    if (functionName.includes('sync')) tags.push('数据同步')
    if (functionName.includes('webhook')) tags.push('Webhook')
    if (functionName.includes('ai')) tags.push('AI功能')
    if (functionName.includes('payment')) tags.push('支付')
    if (functionName.includes('file')) tags.push('文件管理')
    if (functionName.includes('clock')) tags.push('定时任务')
    
    // 如果没有匹配到特定标签，使用通用标签
    if (tags.length === 0) {
      tags.push('通用接口')
    }

    return tags
  }

  extractExamples(content, functionName) {
    const examples = {
      request: this.generateRequestExample(content, functionName),
      responses: this.generateResponseExamples(content)
    }
    
    return examples
  }

  generateRequestExample(content, functionName) {
    const example = {}
    
    // 从参数分析中获取请求体示例
    const bodyMatches = content.match(/body\.(\w+)/g) || []
    const uniqueParams = [...new Set(bodyMatches.map(match => match.replace('body.', '')))]
    
    uniqueParams.forEach(param => {
      // 根据参数名推断示例值
      if (param.includes('id') || param.includes('Id')) {
        example[param] = 'example-id-123'
      } else if (param.includes('email') || param.includes('Email')) {
        example[param] = 'user@example.com'
      } else if (param.includes('phone') || param.includes('Phone')) {
        example[param] = '+86 138 0013 8000'
      } else if (param.includes('name') || param.includes('Name')) {
        example[param] = 'Example Name'
      } else if (param.includes('code') || param.includes('Code')) {
        example[param] = '123456'
      } else if (param.includes('token') || param.includes('Token')) {
        example[param] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      } else if (param.includes('url') || param.includes('Url')) {
        example[param] = 'https://example.com'
      } else if (param.includes('count') || param.includes('num') || param.includes('size')) {
        example[param] = 10
      } else if (param.includes('enable') || param.includes('flag')) {
        example[param] = true
      } else {
        example[param] = 'example value'
      }
    })
    
    return example
  }

  generateResponseExamples(content) {
    const examples = {}
    
    // 提取状态码
    const codeMatches = content.match(/code:\s*["']([A-Z0-9]+)["']/g) || []
    const statusCodes = new Set()
    
    codeMatches.forEach(match => {
      const code = match.match(/["']([A-Z0-9]+)["']/)[1]
      statusCodes.add(code)
    })
    
    // 为每个状态码生成示例
    statusCodes.forEach(code => {
      if (code === '0000') {
        examples.success = {
          code: '0000',
          data: {
            message: 'Operation completed successfully',
            timestamp: new Date().toISOString()
          }
        }
      } else if (code.startsWith('E4')) {
        examples.clientError = {
          code: code,
          errMsg: '客户端请求参数错误'
        }
      } else if (code.startsWith('E5')) {
        examples.serverError = {
          code: code,
          errMsg: '服务器内部错误'
        }
      }
    })
    
    // 如果没有找到状态码，提供默认示例
    if (Object.keys(examples).length === 0) {
      examples.success = {
        code: '0000',
        data: { message: 'Success' }
      }
      examples.error = {
        code: 'E4000',
        errMsg: 'Bad Request'
      }
    }
    
    return examples
  }
}

class DocumentationGenerator {
  static generateHTML(doc) {
    const endpoints = doc.endpoints.map(endpoint => this.generateEndpointHTML(endpoint)).join('')
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${doc.info.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { padding: 30px; border-bottom: 1px solid #eee; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .endpoint { margin-bottom: 30px; border: 1px solid #e1e5e9; border-radius: 6px; overflow: hidden; }
        .endpoint-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e1e5e9; }
        .endpoint-title { font-size: 1.2em; font-weight: 600; color: #24292e; margin: 0; }
        .endpoint-method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600; margin-right: 10px; }
        .method-post { background: #28a745; color: white; }
        .endpoint-path { font-family: 'Monaco', 'Consolas', monospace; color: #586069; }
        .endpoint-body { padding: 20px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: 600; color: #24292e; margin-bottom: 10px; border-bottom: 2px solid #e1e5e9; padding-bottom: 5px; }
        .param-table { width: 100%; border-collapse: collapse; }
        .param-table th, .param-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e1e5e9; }
        .param-table th { background: #f8f9fa; font-weight: 600; }
        .required { color: #d73a49; }
        .tag { display: inline-block; padding: 2px 8px; background: #e1f5fe; color: #01579b; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }
        .generated-time { text-align: center; color: #586069; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
        .toc { background: #f8f9fa; padding: 20px; margin-bottom: 30px; border-radius: 6px; }
        .toc h3 { margin-top: 0; }
        .toc ul { list-style: none; padding: 0; }
        .toc li { margin: 5px 0; }
        .toc a { text-decoration: none; color: #0366d6; }
        .toc a:hover { text-decoration: underline; }
        .search-box { margin-bottom: 20px; }
        .search-box input { width: 100%; padding: 10px; border: 1px solid #e1e5e9; border-radius: 4px; font-size: 16px; }
        .filter-tags { margin-bottom: 20px; }
        .filter-tag { display: inline-block; padding: 5px 10px; margin: 2px; background: #f1f3f4; border: 1px solid #dadce0; border-radius: 16px; cursor: pointer; font-size: 0.9em; }
        .filter-tag.active { background: #1976d2; color: white; }
        .code-block { background: #f6f8fa; border: 1px solid #e1e5e9; border-radius: 6px; padding: 16px; margin: 10px 0; overflow-x: auto; }
        .code-block code { font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; color: #24292e; }
        .response-item { margin-bottom: 20px; padding: 15px; border: 1px solid #e1e5e9; border-radius: 6px; background: #fafbfc; }
        .response-item h4 { margin: 0 0 10px 0; color: #0366d6; }
        .response-schema { margin-bottom: 15px; }
        .response-example { margin-top: 10px; }
    </style>
    <script>
        function filterEndpoints() {
            const searchTerm = document.getElementById('search').value.toLowerCase();
            const activeTags = Array.from(document.querySelectorAll('.filter-tag.active')).map(tag => tag.textContent);
            const endpoints = document.querySelectorAll('.endpoint');
            
            endpoints.forEach(endpoint => {
                const title = endpoint.querySelector('.endpoint-title').textContent.toLowerCase();
                const tags = Array.from(endpoint.querySelectorAll('.tag')).map(tag => tag.textContent);
                
                const matchesSearch = title.includes(searchTerm);
                const matchesTags = activeTags.length === 0 || activeTags.some(activeTag => tags.includes(activeTag));
                
                endpoint.style.display = matchesSearch && matchesTags ? 'block' : 'none';
            });
        }
        
        function toggleTag(tagElement) {
            tagElement.classList.toggle('active');
            filterEndpoints();
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            // 收集所有标签
            const allTags = new Set();
            document.querySelectorAll('.tag').forEach(tag => allTags.add(tag.textContent));
            
            // 创建过滤标签
            const filterContainer = document.querySelector('.filter-tags');
            allTags.forEach(tagText => {
                const tagElement = document.createElement('span');
                tagElement.className = 'filter-tag';
                tagElement.textContent = tagText;
                tagElement.onclick = () => toggleTag(tagElement);
                filterContainer.appendChild(tagElement);
            });
        });
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${doc.info.title}</h1>
            <p>${doc.info.description}</p>
        </div>
        <div class="content">
            <div class="search-box">
                <input type="text" id="search" placeholder="搜索接口..." oninput="filterEndpoints()">
            </div>
            <div class="filter-tags">
                <strong>标签过滤: </strong>
            </div>
            <div class="toc">
                <h3>接口目录 (共 ${doc.endpoints.length} 个接口)</h3>
                <ul>
                    ${doc.endpoints.map(endpoint => 
                        `<li><a href="#${endpoint.name}">${endpoint.name} - ${endpoint.description || '无描述'}</a></li>`
                    ).join('')}
                </ul>
            </div>
            ${endpoints}
            <div class="generated-time">
                文档生成时间: ${new Date(doc.generatedAt).toLocaleString('zh-CN')}
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  static generateEndpointHTML(endpoint) {
    const tags = endpoint.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
    
    // 请求头表格
    const requestHeadersTable = endpoint.requestHeaders && endpoint.requestHeaders.length > 0 ? `
      <div class="section">
        <div class="section-title">请求头</div>
        <table class="param-table">
          <thead>
            <tr>
              <th>请求头名称</th>
              <th>类型</th>
              <th>必需</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody>
            ${endpoint.requestHeaders.map(header => `
              <tr>
                <td><code>${header.name}</code></td>
                <td>${header.type || 'string'}</td>
                <td>${header.required ? '<span class="required">是</span>' : '否'}</td>
                <td>${header.description || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''
    
    const parametersTable = endpoint.parameters.length > 0 ? `
      <div class="section">
        <div class="section-title">请求参数</div>
        <table class="param-table">
          <thead>
            <tr>
              <th>参数名</th>
              <th>类型</th>
              <th>必需</th>
              <th>位置</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody>
            ${endpoint.parameters.map(param => `
              <tr>
                <td><code>${param.name}</code></td>
                <td>${param.type}</td>
                <td>${param.required ? '<span class="required">是</span>' : '否'}</td>
                <td>${param.in}</td>
                <td>${param.description || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''

    // 请求示例
    const requestExample = endpoint.examples && endpoint.examples.request ? `
      <div class="section">
        <div class="section-title">请求示例</div>
        <pre class="code-block"><code>${JSON.stringify(endpoint.examples.request, null, 2)}</code></pre>
      </div>
    ` : ''

    // 响应表格 - 使用新的响应格式
    const responsesTable = Object.keys(endpoint.responses || {}).length > 0 ? `
      <div class="section">
        <div class="section-title">响应</div>
        ${Object.entries(endpoint.responses).map(([httpStatus, response]) => `
          <div class="response-item">
            <h4>HTTP ${httpStatus} - ${response.description}</h4>
            ${response.content && response.content['application/json'] ? `
              <div class="response-schema">
                <strong>响应结构:</strong>
                <table class="param-table">
                  <thead>
                    <tr>
                      <th>字段名</th>
                      <th>类型</th>
                      <th>描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(response.content['application/json'].schema.properties || {}).map(([key, prop]) => `
                      <tr>
                        <td><code>${key}</code></td>
                        <td>${prop.type}</td>
                        <td>${prop.description || ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ${response.content['application/json'].example ? `
                <div class="response-example">
                  <strong>响应示例:</strong>
                  <pre class="code-block"><code>${JSON.stringify(response.content['application/json'].example, null, 2)}</code></pre>
                </div>
              ` : ''}
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''

    return `
      <div class="endpoint" id="${endpoint.name}">
        <div class="endpoint-header">
          <h3 class="endpoint-title">
            <span class="endpoint-method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="endpoint-path">${endpoint.path}</span>
          </h3>
          <div>${tags}</div>
        </div>
        <div class="endpoint-body">
          ${endpoint.description ? `<p>${endpoint.description}</p>` : ''}
          ${requestHeadersTable}
          ${parametersTable}
          ${requestExample}
          ${responsesTable}
        </div>
      </div>
    `
  }

  static generateJSON(doc) {
    return JSON.stringify(doc, null, 2)
  }
}

// 主函数
async function generateApiDocumentation(cloudFunctionsDir, outputDir) {
  const analyzer = new CloudFunctionAnalyzer(cloudFunctionsDir)
  const documentation = await analyzer.analyzeAllFunctions()
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 生成 HTML 文档
  const htmlContent = DocumentationGenerator.generateHTML(documentation)
  fs.writeFileSync(path.join(outputDir, 'api-docs.html'), htmlContent, 'utf-8')
  
  // 生成 JSON 文档
  const jsonContent = DocumentationGenerator.generateJSON(documentation)
  fs.writeFileSync(path.join(outputDir, 'api-docs.json'), jsonContent, 'utf-8')
  
  console.log(`API 文档已生成到 ${outputDir}`)
  console.log(`- HTML 文档: ${path.join(outputDir, 'api-docs.html')}`)
  console.log(`- JSON 文档: ${path.join(outputDir, 'api-docs.json')}`)
  
  return documentation
}

// 如果直接运行此文件
if (require.main === module) {
  const cloudFunctionsDir = path.join(__dirname, '../cloud-functions')
  const outputDir = path.join(__dirname, './generated')
  
  generateApiDocumentation(cloudFunctionsDir, outputDir)
    .then(() => {
      console.log('文档生成完成!')
    })
    .catch(error => {
      console.error('文档生成失败:', error)
    })
}

module.exports = { generateApiDocumentation, CloudFunctionAnalyzer, DocumentationGenerator }