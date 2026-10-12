import { Pool } from 'pg';
import { DatabaseConfig, IDatabaseAdapter, TableInfo, TableSchema, ColumnInfo, QueryResult } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class PostgresConnection implements IDatabaseAdapter {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        max: this.config.maxPoolSize || 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: this.config.queryTimeoutMs || 30000,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      });

      // Test the connection
      const client = await this.pool.connect();
      client.release();
      logger.info(`Connected to PostgreSQL database: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to connect to PostgreSQL database: ${this.config.name}`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info(`Disconnected from PostgreSQL database: ${this.config.name}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const result = await this.pool!.query('SELECT 1 as test');
      return result.rows[0].test === 1;
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
        table_schema as schema,
        table_name as name,
        table_type as type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      name: row.name,
      type: row.type,
      schema: row.schema,
    }));
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    // Parse schema and table name
    const parts = tableName.split('.');
    const schema = parts.length > 1 ? parts[0] : 'public';
    const table = parts.length > 1 ? parts[1] : tableName;

    // Get column information
    const columnQuery = `
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.is_nullable as nullable,
        c.column_default as default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;

    const columnResult = await this.pool.query(columnQuery, [schema, table]);

    const columns: ColumnInfo[] = columnResult.rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default_value,
      primaryKey: row.is_primary_key,
      foreignKey: row.is_foreign_key,
    }));

    // Get indexes
    const indexQuery = `
      SELECT indexname as name
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = $2
    `;

    const indexResult = await this.pool.query(indexQuery, [schema, table]);
    const indexes = indexResult.rows.map(row => row.name);

    return {
      tableName: `${schema}.${table}`,
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

    const result = await this.pool.query({
      text: finalQuery,
      rowMode: 'array',
    });

    const executionTimeMs = Date.now() - startTime;

    const fields = result.fields.map(f => f.name);
    const rows = result.rows.map(row => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });

    return {
      rows,
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
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const explainQuery = `EXPLAIN (FORMAT JSON, ANALYZE false) ${query}`;
    const result = await this.pool.query(explainQuery);
    return result.rows[0]['QUERY PLAN'];
  }
}
