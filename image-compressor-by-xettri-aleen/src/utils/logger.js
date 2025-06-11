/**
 * Simple logging utility that can be turned on/off
 * Keeps the console clean when logging is disabled
 */
export class Logger {
    constructor(enabled = false, level = 'basic') {
      this.enabled = enabled;
      this.level = level;
    }
    
    log(message, type = 'info') {
      if (!this.enabled) return;
      
      const timestamp = new Date().toLocaleTimeString();
      const prefix = this.getPrefix(type);
      
      if (this.level === 'detailed') {
        console.log(`${prefix} [${timestamp}] ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
    
    group(title) {
      if (!this.enabled) return;
      console.group(title);
    }
    
    groupEnd() {
      if (!this.enabled) return;
      console.groupEnd();
    }
    
    getPrefix(type) {
      const prefixes = {
        'info': '🔵',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
      };
      
      return prefixes[type] || '🔵';
    }
  }