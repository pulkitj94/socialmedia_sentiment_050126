import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File Watcher for CSV data files
 * Monitors data directory for changes and invalidates caches
 */
class FileWatcher {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir;
    this.watcher = null;
    this.callbacks = [];
    this.lastUpdate = null;
    this.fileStats = new Map();
  }

  /**
   * Start watching the data directory
   */
  start() {
    if (this.watcher) {
      console.log('⚠️  File watcher already running');
      return;
    }

    try {
      // Check if directory exists
      if (!fs.existsSync(this.dataDir)) {
        console.error(`❌ Data directory not found: ${this.dataDir}`);
        return;
      }

      // Initialize file stats
      this.initializeFileStats();

      // Watch directory for changes
      this.watcher = fs.watch(this.dataDir, { recursive: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.csv')) {
          this.handleFileChange(eventType, filename);
        }
      });

      console.log(`👀 File watcher started - Monitoring: ${this.dataDir}`);
      console.log(`   Watching for changes to CSV files`);

    } catch (error) {
      console.error('❌ Failed to start file watcher:', error);
    }
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('⏹️  File watcher stopped');
    }
  }

  /**
   * Initialize file stats for change detection
   */
  initializeFileStats() {
    try {
      const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.csv'));

      files.forEach(file => {
        const filePath = path.join(this.dataDir, file);
        const stats = fs.statSync(filePath);
        this.fileStats.set(file, {
          size: stats.size,
          mtime: stats.mtimeMs
        });
      });

      console.log(`📊 Initialized file stats for ${files.length} CSV files`);
    } catch (error) {
      console.error('Failed to initialize file stats:', error);
    }
  }

  /**
   * Handle file change event
   */
  handleFileChange(eventType, filename) {
    const filePath = path.join(this.dataDir, filename);

    // Verify file exists (might be deleted)
    if (!fs.existsSync(filePath)) {
      console.log(`🗑️  File deleted: ${filename}`);
      this.fileStats.delete(filename);
      this.notifyChange('delete', filename);
      return;
    }

    // Get current stats
    const stats = fs.statSync(filePath);
    const oldStats = this.fileStats.get(filename);

    // Check if file actually changed (avoid duplicate events)
    if (oldStats) {
      if (stats.size === oldStats.size && stats.mtimeMs === oldStats.mtime) {
        return; // No actual change
      }
    }

    // Update stats
    this.fileStats.set(filename, {
      size: stats.size,
      mtime: stats.mtimeMs
    });

    this.lastUpdate = new Date();

    console.log(`📝 File ${eventType}: ${filename}`);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Last modified: ${new Date(stats.mtimeMs).toLocaleString()}`);

    this.notifyChange(eventType, filename, stats);
  }

  /**
   * Notify registered callbacks about file changes
   */
  notifyChange(eventType, filename, stats = null) {
    this.callbacks.forEach(callback => {
      try {
        callback({
          eventType,
          filename,
          timestamp: new Date(),
          stats
        });
      } catch (error) {
        console.error('Error in file watcher callback:', error);
      }
    });
  }

  /**
   * Register callback for file changes
   * @param {Function} callback - Function to call when files change
   * @returns {Function} Unregister function
   */
  onChange(callback) {
    this.callbacks.push(callback);

    // Return unregister function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get last update time
   * @returns {Date|null} Last update timestamp
   */
  getLastUpdate() {
    return this.lastUpdate;
  }

  /**
   * Get watcher status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      active: this.watcher !== null,
      dataDir: this.dataDir,
      filesMonitored: this.fileStats.size,
      lastUpdate: this.lastUpdate,
      callbacksRegistered: this.callbacks.length
    };
  }

  /**
   * Force a manual check for changes
   */
  checkForChanges() {
    try {
      const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.csv'));
      let changesDetected = false;

      files.forEach(file => {
        const filePath = path.join(this.dataDir, file);
        const stats = fs.statSync(filePath);
        const oldStats = this.fileStats.get(file);

        if (!oldStats || stats.size !== oldStats.size || stats.mtimeMs !== oldStats.mtime) {
          this.handleFileChange('change', file);
          changesDetected = true;
        }
      });

      // Check for deleted files
      for (const file of this.fileStats.keys()) {
        if (!files.includes(file)) {
          this.handleFileChange('delete', file);
          changesDetected = true;
        }
      }

      return changesDetected;
    } catch (error) {
      console.error('Error checking for changes:', error);
      return false;
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of FileWatcher
 */
export function getFileWatcher(dataDir) {
  if (!instance) {
    instance = new FileWatcher(dataDir);
  }
  return instance;
}

export default FileWatcher;
