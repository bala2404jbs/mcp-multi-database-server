import * as fs from 'fs';
import { DatabaseConfig } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class DatabaseConfigLoader {
  static load(): DatabaseConfig[] {
    const configPath = process.env.DATABASE_CONFIG_PATH;

    if (!configPath) {
      throw new Error('DATABASE_CONFIG_PATH environment variable is not set');
    }

    if (!fs.existsSync(configPath)) {
      throw new Error(`Database configuration file not found: ${configPath}`);
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const configs: DatabaseConfig[] = JSON.parse(configContent);

      if (!Array.isArray(configs)) {
        throw new Error('Database configuration must be an array');
      }

      // Validate each config
      for (const config of configs) {
        this.validateConfig(config);
      }

      logger.info(`Loaded ${configs.length} database configuration(s) from ${configPath}`);
      return configs;
    } catch (error) {
      logger.error('Failed to load database configuration', error);
      throw error;
    }
  }

  private static validateConfig(config: DatabaseConfig): void {
    if (!config.name) {
      throw new Error('Database config must have a name');
    }

    if (!config.type) {
      throw new Error(`Database config ${config.name} must have a type`);
    }

    const validTypes = ['postgres', 'mysql', 'sqlserver', 'mongodb', 'sqlite'];
    if (!validTypes.includes(config.type)) {
      throw new Error(`Invalid database type for ${config.name}: ${config.type}`);
    }

    if (config.type === 'sqlite') {
      if (!config.database && !config.filePath) {
        throw new Error(`SQLite database ${config.name} must have either database or filePath`);
      }
    } else {
      if (!config.host) {
        throw new Error(`Database config ${config.name} must have a host`);
      }

      if (!config.database) {
        throw new Error(`Database config ${config.name} must have a database name`);
      }
    }

    // Set defaults
    if (config.readOnly === undefined) {
      config.readOnly = true;
    }

    if (!config.maxPoolSize) {
      config.maxPoolSize = 5;
    }

    if (!config.queryTimeoutMs) {
      config.queryTimeoutMs = 30000;
    }
  }
}
