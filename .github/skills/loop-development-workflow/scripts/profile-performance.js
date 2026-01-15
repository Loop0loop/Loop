#!/usr/bin/env node

/**
 * Loop Performance Profiler
 * Analyzes performance bottlenecks and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceProfiler {
  constructor() {
    this.logFile = path.join(__dirname, '../../debug.log');
    this.metrics = {
      startup: [],
      memory: [],
      ipc: [],
      rendering: []
    };
  }

  async profile() {
    console.log('🚀 Profiling Loop Performance...\n');
    
    await this.analyzeStartupTime();
    await this.analyzeMemoryUsage();
    await this.analyzeIPCPerformance();
    await this.analyzeBundleSize();
    await this.generateReport();
  }

  async analyzeStartupTime() {
    try {
      if (fs.existsSync(this.logFile)) {
        const logs = fs.readFileSync(this.logFile, 'utf-8');
        const lines = logs.split('\n');
        
        // Look for startup timing logs
        const startupLogs = lines.filter(line => 
          line.includes('ApplicationBootstrapper') || 
          line.includes('Manager started') ||
          line.includes('initialized')
        );
        
        console.log(`⏱️  Found ${startupLogs.length} startup timing entries`);
        
        // Extract timing information if available
        startupLogs.forEach(log => {
          const timeMatch = log.match(/(\d+)ms/);
          if (timeMatch) {
            this.metrics.startup.push(parseInt(timeMatch[1]));
          }
        });
      }
    } catch (error) {
      console.error('❌ Startup analysis failed:', error.message);
    }
  }

  async analyzeMemoryUsage() {
    try {
      // Check if we have memory usage logs
      if (fs.existsSync(this.logFile)) {
        const logs = fs.readFileSync(this.logFile, 'utf-8');
        const memoryLogs = logs.split('\n').filter(line => 
          line.includes('Memory') || line.includes('heap') || line.includes('MB')
        );
        
        console.log(`💾 Found ${memoryLogs.length} memory-related log entries`);
      }
      
      // Analyze bundle size as a proxy for memory usage
      const outDir = path.join(__dirname, '../../out');
      if (fs.existsSync(outDir)) {
        const bundleSize = this.calculateDirectorySize(outDir);
        console.log(`📦 Bundle size: ${Math.round(bundleSize / 1024 / 1024)}MB`);
        this.metrics.memory.push(bundleSize);
      }
    } catch (error) {
      console.error('❌ Memory analysis failed:', error.message);
    }
  }

  async analyzeIPCPerformance() {
    try {
      if (fs.existsSync(this.logFile)) {
        const logs = fs.readFileSync(this.logFile, 'utf-8');
        const ipcLogs = logs.split('\n').filter(line => 
          line.includes('IPC') && (line.includes('ms') || line.includes('took'))
        );
        
        console.log(`📞 Found ${ipcLogs.length} IPC performance entries`);
        
        ipcLogs.forEach(log => {
          const timeMatch = log.match(/(\d+)ms/);
          if (timeMatch) {
            this.metrics.ipc.push(parseInt(timeMatch[1]));
          }
        });
      }
    } catch (error) {
      console.error('❌ IPC performance analysis failed:', error.message);
    }
  }

  async analyzeBundleSize() {
    try {
      const outDir = path.join(__dirname, '../../out');
      if (fs.existsSync(outDir)) {
        const rendererDir = path.join(outDir, 'renderer');
        const mainDir = path.join(outDir, 'main');
        
        const rendererSize = fs.existsSync(rendererDir) ? this.calculateDirectorySize(rendererDir) : 0;
        const mainSize = fs.existsSync(mainDir) ? this.calculateDirectorySize(mainDir) : 0;
        
        console.log(`📊 Renderer bundle: ${Math.round(rendererSize / 1024)}KB`);
        console.log(`📊 Main bundle: ${Math.round(mainSize / 1024)}KB`);
      }
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
    }
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Loop Performance Report');
    console.log('='.repeat(50));

    // Startup performance
    if (this.metrics.startup.length > 0) {
      const avgStartup = this.metrics.startup.reduce((a, b) => a + b, 0) / this.metrics.startup.length;
      console.log(`\n⏱️  Startup Performance:`);
      console.log(`   - Average component init: ${Math.round(avgStartup)}ms`);
      console.log(`   - Total measured events: ${this.metrics.startup.length}`);
    }

    // IPC performance
    if (this.metrics.ipc.length > 0) {
      const avgIPC = this.metrics.ipc.reduce((a, b) => a + b, 0) / this.metrics.ipc.length;
      const maxIPC = Math.max(...this.metrics.ipc);
      console.log(`\n📞 IPC Performance:`);
      console.log(`   - Average response time: ${Math.round(avgIPC)}ms`);
      console.log(`   - Maximum response time: ${maxIPC}ms`);
      console.log(`   - Total IPC calls measured: ${this.metrics.ipc.length}`);
    }

    // Optimization recommendations
    console.log('\n💡 Performance Recommendations:');
    
    if (this.metrics.startup.length > 0) {
      const slowStartup = this.metrics.startup.filter(t => t > 1000);
      if (slowStartup.length > 0) {
        console.log('   - Investigate slow startup components (>1s)');
      }
    }
    
    if (this.metrics.ipc.length > 0) {
      const slowIPC = this.metrics.ipc.filter(t => t > 100);
      if (slowIPC.length > 0) {
        console.log('   - Optimize slow IPC calls (>100ms)');
      }
    }
    
    console.log('   - Consider lazy loading for non-critical managers');
    console.log('   - Implement caching for frequently accessed data');
    console.log('   - Use background processes for heavy computations');
    console.log('   - Monitor memory usage in production');
    console.log('   - Consider code splitting for renderer bundle optimization');
  }
}

// Run the profiler
if (require.main === module) {
  const profiler = new PerformanceProfiler();
  profiler.profile().catch(console.error);
}

module.exports = { PerformanceProfiler };