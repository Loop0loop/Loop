#!/usr/bin/env node

/**
 * Loop Log Analyzer
 * Analyzes application logs for patterns, errors, and insights
 */

const fs = require('fs');
const path = require('path');

class LogAnalyzer {
  constructor() {
    this.logFile = path.join(__dirname, '../../debug.log');
    this.errorLogFile = path.join(__dirname, '../../error.log');
    this.analysis = {
      totalLines: 0,
      errors: [],
      warnings: [],
      performance: [],
      ipcCalls: [],
      managers: new Map(),
      patterns: new Map()
    };
  }

  async analyze() {
    console.log('🔍 Analyzing Loop Application Logs...\n');
    
    await this.processLogFile(this.logFile, 'debug');
    await this.processLogFile(this.errorLogFile, 'error');
    await this.generateInsights();
    await this.generateReport();
  }

  async processLogFile(filePath, logType) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${logType.toUpperCase()} log file not found: ${filePath}`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      console.log(`📄 Processing ${lines.length} lines from ${logType}.log`);
      this.analysis.totalLines += lines.length;

      lines.forEach((line, index) => {
        this.analyzeLine(line, index + 1, logType);
      });
    } catch (error) {
      console.error(`❌ Failed to process ${logType} log:`, error.message);
    }
  }

  analyzeLine(line, lineNumber, logType) {
    // Classify log level
    if (line.includes('ERROR') || line.includes('Error:')) {
      this.analysis.errors.push({ line, lineNumber, logType });
    } else if (line.includes('WARN') || line.includes('Warning:')) {
      this.analysis.warnings.push({ line, lineNumber, logType });
    }

    // Extract performance metrics
    const timeMatch = line.match(/(\d+)ms|took (\d+)/i);
    if (timeMatch) {
      const time = parseInt(timeMatch[1] || timeMatch[2]);
      this.analysis.performance.push({ time, line, lineNumber });
    }

    // Track IPC calls
    if (line.includes('IPC:') || line.includes('invoke:')) {
      const channelMatch = line.match(/channel[:\s]+([^\s,)]+)/i);
      const channel = channelMatch ? channelMatch[1] : 'unknown';
      this.analysis.ipcCalls.push({ channel, line, lineNumber });
    }

    // Track manager activity
    const managerMatch = line.match(/(\w*Manager)[:\s]/);
    if (managerMatch) {
      const manager = managerMatch[1];
      const count = this.analysis.managers.get(manager) || 0;
      this.analysis.managers.set(manager, count + 1);
    }

    // Track common patterns
    const patterns = [
      'initialized', 'started', 'stopped', 'created', 'updated', 'deleted',
      'connected', 'disconnected', 'timeout', 'retry', 'cache', 'memory'
    ];

    patterns.forEach(pattern => {
      if (line.toLowerCase().includes(pattern)) {
        const count = this.analysis.patterns.get(pattern) || 0;
        this.analysis.patterns.set(pattern, count + 1);
      }
    });
  }

  async generateInsights() {
    // Performance insights
    if (this.analysis.performance.length > 0) {
      const times = this.analysis.performance.map(p => p.time);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const slow = this.analysis.performance.filter(p => p.time > 1000);

      console.log('⚡ Performance Insights:');
      console.log(`   - Average operation time: ${Math.round(avg)}ms`);
      console.log(`   - Slowest operation: ${max}ms`);
      console.log(`   - Slow operations (>1s): ${slow.length}`);
    }

    // Error patterns
    if (this.analysis.errors.length > 0) {
      const errorTypes = new Map();
      this.analysis.errors.forEach(error => {
        const type = this.extractErrorType(error.line);
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
      });

      console.log('\n❌ Error Patterns:');
      errorTypes.forEach((count, type) => {
        console.log(`   - ${type}: ${count} occurrences`);
      });
    }

    // Manager activity
    if (this.analysis.managers.size > 0) {
      console.log('\n🏗️ Manager Activity:');
      const sortedManagers = Array.from(this.analysis.managers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      sortedManagers.forEach(([manager, count]) => {
        console.log(`   - ${manager}: ${count} log entries`);
      });
    }
  }

  extractErrorType(errorLine) {
    // Extract error type from line
    if (errorLine.includes('TypeError')) return 'TypeError';
    if (errorLine.includes('ReferenceError')) return 'ReferenceError';
    if (errorLine.includes('SyntaxError')) return 'SyntaxError';
    if (errorLine.includes('Network')) return 'Network';
    if (errorLine.includes('Database')) return 'Database';
    if (errorLine.includes('IPC')) return 'IPC';
    if (errorLine.includes('Permission')) return 'Permission';
    if (errorLine.includes('Timeout')) return 'Timeout';
    return 'Unknown';
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Loop Log Analysis Report');
    console.log('='.repeat(50));

    console.log(`\n📈 Overview:`);
    console.log(`   - Total log entries: ${this.analysis.totalLines}`);
    console.log(`   - Errors: ${this.analysis.errors.length}`);
    console.log(`   - Warnings: ${this.analysis.warnings.length}`);
    console.log(`   - Performance metrics: ${this.analysis.performance.length}`);
    console.log(`   - IPC calls: ${this.analysis.ipcCalls.length}`);

    // Recent errors
    if (this.analysis.errors.length > 0) {
      console.log(`\n❌ Recent Errors (last 3):`);
      this.analysis.errors.slice(-3).forEach(error => {
        console.log(`   Line ${error.lineNumber}: ${error.line.substring(0, 80)}...`);
      });
    }

    // Slow operations
    const slowOps = this.analysis.performance.filter(p => p.time > 1000);
    if (slowOps.length > 0) {
      console.log(`\n🐌 Slow Operations (>1s):`);
      slowOps.slice(-3).forEach(op => {
        console.log(`   ${op.time}ms: ${op.line.substring(0, 60)}...`);
      });
    }

    // Top IPC channels
    const channelCounts = new Map();
    this.analysis.ipcCalls.forEach(call => {
      channelCounts.set(call.channel, (channelCounts.get(call.channel) || 0) + 1);
    });

    if (channelCounts.size > 0) {
      console.log(`\n📞 Most Used IPC Channels:`);
      Array.from(channelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([channel, count]) => {
          console.log(`   - ${channel}: ${count} calls`);
        });
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (this.analysis.errors.length > 10) {
      console.log('   - High error count detected - review error handling');
    }
    
    const slowOpsCount = this.analysis.performance.filter(p => p.time > 500).length;
    if (slowOpsCount > 5) {
      console.log('   - Multiple slow operations detected - consider optimization');
    }
    
    if (this.analysis.ipcCalls.length > 1000) {
      console.log('   - High IPC usage - consider batching or caching');
    }
    
    console.log('   - Monitor log files regularly for patterns');
    console.log('   - Set up automated log rotation if files grow large');
    console.log('   - Consider structured logging for better analysis');
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new LogAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = { LogAnalyzer };