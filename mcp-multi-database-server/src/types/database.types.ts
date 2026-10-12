export type DatabaseType = 'postgres' | 'mysql' | 'sqlserver' | 'mongodb' | 'sqlite';

export interface DatabaseConfig {
  name: string;
  type: DatabaseType;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  readOnly: boolean;
  ssl?: boolean;
  maxPoolSize?: number;
  queryTimeoutMs?: number;
  filePath?: string; // For SQLite
}

export interface UserAccess {
  userId: string;
  allowedDatabases: string[];
}

export interface UsersConfig {
  users: UserAccess[];
}

export interface TableInfo {
  name: string;
  type?: string;
  schema?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  primaryKey?: boolean;
  foreignKey?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  indexes?: string[];
  constraints?: string[];
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: string[];
  executionTimeMs: number;
}

export interface AuditLog {
  timestamp: string;
  userId?: string;
  databaseName: string;
  toolName: string;
  queryType: string;
  executionTimeMs?: number;
  success: boolean;
  errorMessage?: string;
  query?: string;
}

export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  listTables(): Promise<TableInfo[]>;
  describeTable(tableName: string): Promise<TableSchema>;
  executeQuery(query: string, limit: number): Promise<QueryResult>;
  getSampleRows(tableName: string, limit: number): Promise<QueryResult>;
  explainQuery(query: string): Promise<any>;
}
