import mysql from 'mysql2/promise';
import { DatabaseConfig, IDatabaseAdapter, TableInfo, TableSchema, ColumnInfo, QueryResult } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class MySQLConnection implements IDatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        connectionLimit: this.config.maxPoolSize || 5,
        connectTimeout: this.config.queryTimeoutMs || 30000,
        enableKeepAlive: true,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      connection.release();
      logger.info(`Connected to MySQL database: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to connect to MySQL database: ${this.config.name}`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info(`Disconnected from MySQL database: ${this.config.name}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const [rows] = await this.pool!.query('SELECT 1 as test');
      return Array.isArray(rows) && rows.length > 0 && (rows[0] as any).test === 1;
    } catch (error) {
      logger.error(`Connection test failed for ${this.config.name}`, error);
      return false;
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const query = `
      SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type,
        TABLE_SCHEMA as schema
      FROM information_schema.tables
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const [rows] = await this.pool.query(query, [this.config.database]);
    return (rows as any[]).map(row => ({
      name: row.name,
      type: row.type,
      schema: row.schema,
    }));
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    // Get column information
    const columnQuery = `
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as default_value,
        COLUMN_KEY as key_type,
        EXTRA as extra
      FROM information_schema.columns
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const [columnRows] = await this.pool.query(columnQuery, [this.config.database, tableName]);

    const columns: ColumnInfo[] = (columnRows as any[]).map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default_value,
      primaryKey: row.key_type === 'PRI',
      foreignKey: row.key_type === 'MUL',
    }));

    // Get indexes
    const indexQuery = `
      SELECT DISTINCT INDEX_NAME as name
      FROM information_schema.statistics
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const [indexRows] = await this.pool.query(indexQuery, [this.config.database, tableName]);
    const indexes = (indexRows as any[]).map(row => row.name);

    return {
      tableName,
      columns,
      indexes,
    };
  }

  async executeQuery(query: string, limit: number): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    // Add LIMIT clause if not present
    let finalQuery = query.trim();
    if (!finalQuery.match(/LIMIT\s+\d+/i)) {
      finalQuery = finalQuery.replace(/;?\s*$/, '') + ` LIMIT ${limit}`;
    }

    const [rows, fields] = await this.pool.query(finalQuery);

    const executionTimeMs = Date.now() - startTime;

    const fieldNames = Array.isArray(fields) ? fields.map((f: any) => f.name) : [];

    return {
      rows: rows as any[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      fields: fieldNames,
      executionTimeMs,
    };
  }

  async getSampleRows(tableName: string, limit: number): Promise<QueryResult> {
    const query = `SELECT * FROM ${tableName}`;
    return this.executeQuery(query, limit);
  }

  async explainQuery(query: string): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const explainQuery = `EXPLAIN FORMAT=JSON ${query}`;
    const [rows] = await this.pool.query(explainQuery);
    return rows;
  }
}
