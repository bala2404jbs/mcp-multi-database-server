import Database from 'better-sqlite3';
import { DatabaseConfig, IDatabaseAdapter, TableInfo, TableSchema, ColumnInfo, QueryResult } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class SQLiteConnection implements IDatabaseAdapter {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const filePath = this.config.filePath || this.config.database;
      this.db = new Database(filePath, { 
        readonly: this.config.readOnly,
        timeout: this.config.queryTimeoutMs || 30000,
      });

      logger.info(`Connected to SQLite database: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to connect to SQLite database: ${this.config.name}`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info(`Disconnected from SQLite database: ${this.config.name}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.connect();
      }
      const result = this.db!.prepare('SELECT 1 as test').get();
      return (result as any).test === 1;
    } catch (error) {
      logger.error(`Connection test failed for ${this.config.name}`, error);
      return false;
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const query = `
      SELECT name, type
      FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const rows = this.db.prepare(query).all();
    return (rows as any[]).map(row => ({
      name: row.name,
      type: row.type,
    }));
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Get column information
    const columnQuery = `PRAGMA table_info(${tableName})`;
    const columnRows = this.db.prepare(columnQuery).all();

    const columns: ColumnInfo[] = (columnRows as any[]).map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      default: row.dflt_value,
      primaryKey: row.pk === 1,
    }));

    // Get indexes
    const indexQuery = `PRAGMA index_list(${tableName})`;
    const indexRows = this.db.prepare(indexQuery).all();
    const indexes = (indexRows as any[]).map(row => row.name);

    // Get foreign keys
    const fkQuery = `PRAGMA foreign_key_list(${tableName})`;
    const fkRows = this.db.prepare(fkQuery).all();
    const foreignKeyColumns = new Set((fkRows as any[]).map(row => row.from));

    // Mark foreign key columns
    columns.forEach(col => {
      if (foreignKeyColumns.has(col.name)) {
        col.foreignKey = true;
      }
    });

    return {
      tableName,
      columns,
      indexes,
    };
  }

  async executeQuery(query: string, limit: number): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    // Add LIMIT clause if not present
    let finalQuery = query.trim();
    if (!finalQuery.match(/LIMIT\s+\d+/i)) {
      finalQuery = finalQuery.replace(/;?\s*$/, '') + ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(finalQuery);
    const rows = stmt.all();

    const executionTimeMs = Date.now() - startTime;

    // Extract field names from first row
    const fields = rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null 
      ? Object.keys(rows[0] as Record<string, unknown>) 
      : [];

    return {
      rows: rows as any[],
      rowCount: rows.length,
      fields,
      executionTimeMs,
    };
  }

  async getSampleRows(tableName: string, limit: number): Promise<QueryResult> {
    const query = `SELECT * FROM ${tableName}`;
    return this.executeQuery(query, limit);
  }

  async explainQuery(query: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    const rows = this.db.prepare(explainQuery).all();
    return rows;
  }
}
