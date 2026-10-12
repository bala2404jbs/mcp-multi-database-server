import mssql from 'mssql';
import { DatabaseConfig, IDatabaseAdapter, TableInfo, TableSchema, ColumnInfo, QueryResult } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class SQLServerConnection implements IDatabaseAdapter {
  private pool: mssql.ConnectionPool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.pool = new mssql.ConnectionPool({
        server: this.config.host!,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        options: {
          encrypt: this.config.ssl || false,
          trustServerCertificate: true,
          requestTimeout: this.config.queryTimeoutMs || 30000,
        },
        pool: {
          max: this.config.maxPoolSize || 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      });

      await this.pool.connect();
      logger.info(`Connected to SQL Server database: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to connect to SQL Server database: ${this.config.name}`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info(`Disconnected from SQL Server database: ${this.config.name}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const result = await this.pool!.request().query('SELECT 1 as test');
      return result.recordset[0].test === 1;
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
        TABLE_SCHEMA as [schema],
        TABLE_NAME as [name],
        TABLE_TYPE as [type]
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const result = await this.pool.request().query(query);
    return result.recordset.map((row: any) => ({
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
    const schema = parts.length > 1 ? parts[0] : 'dbo';
    const table = parts.length > 1 ? parts[1] : tableName;

    // Get column information
    const columnQuery = `
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        c.IS_NULLABLE as nullable,
        c.COLUMN_DEFAULT as default_value,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_primary_key,
        CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_foreign_key
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          AND tc.TABLE_SCHEMA = @schema
          AND tc.TABLE_NAME = @table
      ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
      LEFT JOIN (
        SELECT ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
        WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND tc.TABLE_SCHEMA = @schema
          AND tc.TABLE_NAME = @table
      ) fk ON c.COLUMN_NAME = fk.COLUMN_NAME
      WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
      ORDER BY c.ORDINAL_POSITION
    `;

    const columnResult = await this.pool.request()
      .input('schema', mssql.NVarChar, schema)
      .input('table', mssql.NVarChar, table)
      .query(columnQuery);

    const columns: ColumnInfo[] = columnResult.recordset.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default_value,
      primaryKey: row.is_primary_key === 1,
      foreignKey: row.is_foreign_key === 1,
    }));

    // Get indexes
    const indexQuery = `
      SELECT name
      FROM sys.indexes
      WHERE object_id = OBJECT_ID(@fullTableName)
        AND name IS NOT NULL
    `;

    const indexResult = await this.pool.request()
      .input('fullTableName', mssql.NVarChar, `${schema}.${table}`)
      .query(indexQuery);

    const indexes = indexResult.recordset.map((row: any) => row.name);

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

    // Add TOP clause if not present (SQL Server uses TOP instead of LIMIT)
    let finalQuery = query.trim();
    if (!finalQuery.match(/\bTOP\s+\d+\b/i) && !finalQuery.match(/\bOFFSET\s+\d+\s+ROWS/i)) {
      finalQuery = finalQuery.replace(/^SELECT\s+/i, `SELECT TOP ${limit} `);
    }

    const result = await this.pool.request().query(finalQuery);

    const executionTimeMs = Date.now() - startTime;

    const fields = result.recordset.columns ? Object.keys(result.recordset.columns) : [];

    return {
      rows: result.recordset,
      rowCount: result.recordset.length,
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

    // SQL Server uses SET SHOWPLAN_XML ON for execution plans
    const explainQuery = `SET SHOWPLAN_XML ON; ${query}; SET SHOWPLAN_XML OFF;`;
    const result = await this.pool.request().query(explainQuery);
    return result.recordset;
  }
}
