// 文件监控脚本 - 当云函数文件变化时自动生成文档
const fs = require('fs')
const path = require('path')
const { generateApiDocumentation } = require('./api-doc-generator.js')

class DocumentationWatcher {
  constructor(cloudFunctionsDir, outputDir) {
    this.cloudFunctionsDir = cloudFunctionsDir
    this.outputDir = outputDir
    this.isGenerating = false
    this.pendingGeneration = false
  }

  start() {
    console.log(`开始监控云函数目录: ${this.cloudFunctionsDir}`)
    console.log(`文档输出目录: ${this.outputDir}`)
    
    // 初始生成一次文档
    this.generateDocs()
    
    // 监控文件变化
    fs.watch(this.cloudFunctionsDir, { recursive: false }, (eventType, filename) => {
      if (filename && filename.endsWith('.ts') && !filename.startsWith('__')) {
        console.log(`检测到文件变化: ${filename} (${eventType})`)
        this.scheduleGeneration()
      }
    })

    console.log('文档监控已启动，按 Ctrl+C 停止监控')
  }

  scheduleGeneration() {
    if (this.isGenerating) {
      this.pendingGeneration = true
      return
    }

    // 延迟生成，避免频繁触发
    setTimeout(() => {
      this.generateDocs()
    }, 1000)
  }

  async generateDocs() {
    if (this.isGenerating) {
      this.pendingGeneration = true
      return
    }

    this.isGenerating = true
    this.pendingGeneration = false

    try {
      console.log('正在重新生成API文档...')
      const startTime = Date.now()
      
      await generateApiDocumentation(this.cloudFunctionsDir, this.outputDir)
      
      const duration = Date.now() - startTime
      console.log(`文档生成完成，耗时 ${duration}ms`)
      
      // 如果在生成过程中有新的变化，再次生成
      if (this.pendingGeneration) {
        setTimeout(() => this.generateDocs(), 500)
      }
    } catch (error) {
      console.error('文档生成失败:', error)
    } finally {
      this.isGenerating = false
    }
  }
}

// 启动监控
if (require.main === module) {
  const cloudFunctionsDir = path.join(__dirname, '../cloud-functions')
  const outputDir = path.join(__dirname, './generated')
  
  const watcher = new DocumentationWatcher(cloudFunctionsDir, outputDir)
  watcher.start()

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n停止文档监控...')
    process.exit(0)
  })
}

module.exports = { DocumentationWatcher }