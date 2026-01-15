#!/usr/bin/env node

/**
 * Loop IPC Debug Script
 * Analyzes IPC communication patterns and identifies issues
 */

const fs = require('fs');
const path = require('path');

class IPCDebugger {
  constructor() {
    this.logFile = path.join(__dirname, '../../debug.log');
    this.ipcChannels = new Map();
    this.errors = [];
  }

  async analyze() {
    console.log('🔍 Analyzing Loop IPC Communication...\n');
    
    await this.loadIPCDefinitions();
    await this.analyzeLogs();
    await this.generateReport();
  }

  async loadIPCDefinitions() {
    try {
      const ipcTypesPath = path.join(__dirname, '../../src/shared/ipcTypes.ts');
      const content = fs.readFileSync(ipcTypesPath, 'utf-8');
      
      // Extract channel names from IPC definitions
      const channelMatches = content.match(/['"]([^'"]+)['"]\s*:/g);
      if (channelMatches) {
        channelMatches.forEach(match => {
          const channel = match.replace(/['":]/g, '').trim();
          this.ipcChannels.set(channel, { defined: true, used: false, errors: [] });
        });
      }
      
      console.log(`📝 Found ${this.ipcChannels.size} defined IPC channels`);
    } catch (error) {
      console.error('❌ Failed to load IPC definitions:', error.message);
    }
  }

  async analyzeLogs() {
    if (!fs.existsSync(this.logFile)) {
      console.log('⚠️  No log file found, skipping log analysis');
      return;
    }

    try {
      const logs = fs.readFileSync(this.logFile, 'utf-8');
      const lines = logs.split('\n');
      
      let ipcCalls = 0;
      let ipcErrors = 0;

      lines.forEach(line => {
        if (line.includes('IPC:')) {
          ipcCalls++;
          
          // Extract channel name
          const channelMatch = line.match(/channel[:\s]+([^\s,]+)/i);
          if (channelMatch) {
            const channel = channelMatch[1];
            if (this.ipcChannels.has(channel)) {
              this.ipcChannels.get(channel).used = true;
            }
          }
          
          if (line.includes('ERROR') || line.includes('Error')) {
            ipcErrors++;
            this.errors.push(line);
          }
        }
      });

      console.log(`📊 Analyzed ${lines.length} log lines`);
      console.log(`📞 Found ${ipcCalls} IPC calls`);
      console.log(`❌ Found ${ipcErrors} IPC errors\n`);
    } catch (error) {
      console.error('❌ Failed to analyze logs:', error.message);
    }
  }

  async generateReport() {
    console.log('='.repeat(50));
    console.log('🔍 Loop IPC Debug Report');
    console.log('='.repeat(50));

    // Unused channels
    const unusedChannels = Array.from(this.ipcChannels.entries())
      .filter(([_, info]) => info.defined && !info.used)
      .map(([channel]) => channel);

    if (unusedChannels.length > 0) {
      console.log('\n⚠️  Unused IPC Channels:');
      unusedChannels.forEach(channel => console.log(`   - ${channel}`));
    }

    // Recent errors
    if (this.errors.length > 0) {
      console.log('\n❌ Recent IPC Errors:');
      this.errors.slice(-5).forEach(error => {
        console.log(`   ${error.trim()}`);
      });
    }

    // Channel usage stats
    const usedChannels = Array.from(this.ipcChannels.entries())
      .filter(([_, info]) => info.used)
      .map(([channel]) => channel);

    console.log(`\n✅ Active IPC Channels: ${usedChannels.length}/${this.ipcChannels.size}`);
    
    console.log('\n💡 Recommendations:');
    if (unusedChannels.length > 0) {
      console.log('   - Consider removing unused IPC channels');
    }
    if (this.errors.length > 0) {
      console.log('   - Review and fix IPC error handling');
    }
    console.log('   - Ensure all IPC calls have proper error handling');
    console.log('   - Use type-safe IPC contracts for all channels');
  }
}

// Run the debugger
if (require.main === module) {
  const debugger = new IPCDebugger();
  debugger.analyze().catch(console.error);
}

module.exports = { IPCDebugger };