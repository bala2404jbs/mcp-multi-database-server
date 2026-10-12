import * as fs from 'fs';
import { UsersConfig, UserAccess } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class UsersConfigLoader {
  private static config: UsersConfig | null = null;

  static load(): UsersConfig {
    const configPath = process.env.USERS_CONFIG_PATH;

    if (!configPath) {
      logger.warn('USERS_CONFIG_PATH not set, user access control is disabled');
      return { users: [] };
    }

    if (!fs.existsSync(configPath)) {
      logger.warn(`Users configuration file not found: ${configPath}, user access control is disabled`);
      return { users: [] };
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configContent);

      if (!this.config || !Array.isArray(this.config.users)) {
        throw new Error('Users configuration must have a users array');
      }

      logger.info(`Loaded ${this.config.users.length} user configuration(s) from ${configPath}`);
      return this.config;
    } catch (error) {
      logger.error('Failed to load users configuration', error);
      throw error;
    }
  }

  static getUserAccess(userId: string): UserAccess | undefined {
    if (!this.config) {
      return undefined;
    }

    return this.config.users.find(u => u.userId === userId);
  }

  static canAccessDatabase(userId: string | undefined, databaseName: string): boolean {
    // If no users config is loaded, allow all access
    if (!this.config || this.config.users.length === 0) {
      return true;
    }

    // If userId is not provided, allow access (user access control is optional)
    // This allows MCP clients that don't send userId to still work
    if (!userId) {
      logger.debug('No userId provided, allowing access (user access control bypassed)');
      return true;
    }

    const userAccess = this.getUserAccess(userId);
    if (!userAccess) {
      logger.warn(`User ${userId} not found in access control list`);
      return false;
    }

    return userAccess.allowedDatabases.includes(databaseName);
  }

  static isEnabled(): boolean {
    return this.config !== null && this.config.users.length > 0;
  }
}
