import { DatabaseConfig, IDatabaseAdapter } from '../types/database.types.js';
import { PostgresConnection } from './postgres.connection.js';
import { MySQLConnection } from './mysql.connection.js';
import { SQLServerConnection } from './sqlserver.connection.js';
import { MongoDBConnection } from './mongodb.connection.js';
import { SQLiteConnection } from './sqlite.connection.js';
import { logger } from '../utils/logger.js';

export class ConnectionManager {
  private connections: Map<string, IDatabaseAdapter> = new Map();
  private configs: Map<string, DatabaseConfig> = new Map();

  constructor(databaseConfigs: DatabaseConfig[]) {
    for (const config of databaseConfigs) {
      this.configs.set(config.name, config);
    }
  }

  async initializeConnections(): Promise<void> {
    logger.info(`Initializing ${this.configs.size} database connection(s)...`);

    const promises = Array.from(this.configs.entries()).map(async ([name, config]) => {
      try {
        const adapter = this.createAdapter(config);
        await adapter.connect();
        this.connections.set(name, adapter);
        logger.info(`Successfully connected to database: ${name}`);
      } catch (error) {
        logger.error(`Failed to connect to database: ${name}`, error);
        // Don't throw, continue with other connections
      }
    });

    await Promise.all(promises);

    logger.info(`Initialized ${this.connections.size} out of ${this.configs.size} database connection(s)`);
  }

  private createAdapter(config: DatabaseConfig): IDatabaseAdapter {
    switch (config.type) {
      case 'postgres':
        return new PostgresConnection(config);
      case 'mysql':
        return new MySQLConnection(config);
      case 'sqlserver':
        return new SQLServerConnection(config);
      case 'mongodb':
        return new MongoDBConnection(config);
      case 'sqlite':
        return new SQLiteConnection(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  getConnection(databaseName: string): IDatabaseAdapter {
    const connection = this.connections.get(databaseName);
    if (!connection) {
      throw new Error(`Database connection not found: ${databaseName}`);
    }
    return connection;
  }

  hasConnection(databaseName: string): boolean {
    return this.connections.has(databaseName);
  }

  getConfig(databaseName: string): DatabaseConfig | undefined {
    return this.configs.get(databaseName);
  }

  getAllDatabaseNames(): string[] {
    return Array.from(this.configs.keys());
  }

  getAllDatabaseInfo(): Array<{ name: string; type: string; connected: boolean }> {
    return Array.from(this.configs.entries()).map(([name, config]) => ({
      name,
      type: config.type,
      connected: this.connections.has(name),
    }));
  }

  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting all database connections...');

    const promises = Array.from(this.connections.entries()).map(async ([name, adapter]) => {
      try {
        await adapter.disconnect();
        logger.info(`Disconnected from database: ${name}`);
      } catch (error) {
        logger.error(`Error disconnecting from database: ${name}`, error);
      }
    });

    await Promise.all(promises);
    this.connections.clear();
  }

  async reconnect(databaseName: string): Promise<void> {
    const config = this.configs.get(databaseName);
    if (!config) {
      throw new Error(`Database config not found: ${databaseName}`);
    }

    // Disconnect if already connected
    const existingConnection = this.connections.get(databaseName);
    if (existingConnection) {
      try {
        await existingConnection.disconnect();
      } catch (error) {
        logger.warn(`Error during disconnect for ${databaseName}`, error);
      }
    }

    // Create new connection
    const adapter = this.createAdapter(config);
    await adapter.connect();
    this.connections.set(databaseName, adapter);
    logger.info(`Reconnected to database: ${databaseName}`);
  }
}
