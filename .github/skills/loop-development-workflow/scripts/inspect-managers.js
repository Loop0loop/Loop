#!/usr/bin/env node

/**
 * Loop Manager Inspector
 * Provides runtime inspection of manager states and coordination
 */

const fs = require('fs');
const path = require('path');

class ManagerInspector {
  constructor() {
    this.managersPath = path.join(__dirname, '../../src/main/managers');
    this.managers = [];
  }

  async inspect() {
    console.log('🔍 Inspecting Loop Manager System...\n');
    
    await this.loadManagerInfo();
    await this.analyzeManagerStates();
    await this.generateReport();
  }

  async loadManagerInfo() {
    try {
      const files = fs.readdirSync(this.managersPath);
      const managerFiles = files.filter(file => file.endsWith('.ts') && file.includes('Manager'));
      
      for (const file of managerFiles) {
        const filePath = path.join(this.managersPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract manager class name
        const classMatch = content.match(/class\s+(\w*Manager)/);
        const managerName = classMatch ? classMatch[1] : file.replace('.ts', '');
        
        // Check for singleton pattern
        const hasSingleton = content.includes('getInstance') || content.includes('instance');
        
        // Check for initialization methods
        const hasInit = content.includes('initialize') || content.includes('init');
        const hasStart = content.includes('start()') || content.includes('async start');
        const hasStop = content.includes('stop()') || content.includes('async stop');
        
        this.managers.push({
          name: managerName,
          file: file,
          hasSingleton,
          hasInit,
          hasStart,
          hasStop,
          size: content.length
        });
      }
      
      console.log(`📊 Found ${this.managers.length} managers to analyze`);
    } catch (error) {
      console.error('❌ Failed to load manager info:', error.message);
    }
  }

  async analyzeManagerStates() {
    console.log('🔄 Analyzing manager patterns...\n');
    
    const patterns = {
      singleton: this.managers.filter(m => m.hasSingleton).length,
      withInit: this.managers.filter(m => m.hasInit).length,
      withStart: this.managers.filter(m => m.hasStart).length,
      withStop: this.managers.filter(m => m.hasStop).length
    };
    
    console.log('📈 Manager Patterns:');
    console.log(`   - Singleton Pattern: ${patterns.singleton}/${this.managers.length}`);
    console.log(`   - With Initialization: ${patterns.withInit}/${this.managers.length}`);
    console.log(`   - With Start Method: ${patterns.withStart}/${this.managers.length}`);
    console.log(`   - With Stop Method: ${patterns.withStop}/${this.managers.length}`);
  }

  async generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('🏗️ Loop Manager System Report');
    console.log('='.repeat(50));

    // Manager overview
    console.log('\n📋 Manager Overview:');
    this.managers.forEach(manager => {
      const status = [];
      if (manager.hasSingleton) status.push('Singleton');
      if (manager.hasInit) status.push('Init');
      if (manager.hasStart) status.push('Start');
      if (manager.hasStop) status.push('Stop');
      
      console.log(`   ${manager.name}: [${status.join(', ')}]`);
    });

    // Size analysis
    const avgSize = this.managers.reduce((sum, m) => sum + m.size, 0) / this.managers.length;
    const largeManagers = this.managers.filter(m => m.size > avgSize * 2);
    
    if (largeManagers.length > 0) {
      console.log('\n⚠️  Large Managers (consider refactoring):');
      largeManagers.forEach(manager => {
        console.log(`   - ${manager.name}: ${Math.round(manager.size / 1024)}KB`);
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    const nonSingleton = this.managers.filter(m => !m.hasSingleton);
    if (nonSingleton.length > 0) {
      console.log('   - Consider singleton pattern for:');
      nonSingleton.forEach(m => console.log(`     * ${m.name}`));
    }
    
    const missingLifecycle = this.managers.filter(m => !m.hasInit || !m.hasStart || !m.hasStop);
    if (missingLifecycle.length > 0) {
      console.log('   - Add lifecycle methods to:');
      missingLifecycle.forEach(m => {
        const missing = [];
        if (!m.hasInit) missing.push('init');
        if (!m.hasStart) missing.push('start');
        if (!m.hasStop) missing.push('stop');
        console.log(`     * ${m.name}: ${missing.join(', ')}`);
      });
    }
    
    console.log('   - Ensure all managers are registered in ApplicationBootstrapper');
    console.log('   - Follow the BaseManager pattern for consistency');
    console.log('   - Implement proper error handling in all lifecycle methods');
  }
}

// Run the inspector
if (require.main === module) {
  const inspector = new ManagerInspector();
  inspector.inspect().catch(console.error);
}

module.exports = { ManagerInspector };