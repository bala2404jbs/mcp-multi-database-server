import { QueryResult, TableInfo, TableSchema } from '../types/database.types.js';

export class ResponseFormatter {
  static formatQueryResult(result: QueryResult): string {
    const { rows, rowCount, executionTimeMs } = result;

    if (rowCount === 0) {
      return `No rows returned.\nExecution time: ${executionTimeMs}ms`;
    }

    let output = `Returned ${rowCount} row(s).\n`;
    output += `Execution time: ${executionTimeMs}ms\n\n`;

    // Create a simple table format
    if (rows.length > 0) {
      output += 'Results:\n';
      output += JSON.stringify(rows, null, 2);
    }

    return output;
  }

  static formatTableList(tables: TableInfo[]): string {
    if (tables.length === 0) {
      return 'No tables found.';
    }

    let output = `Found ${tables.length} table(s):\n\n`;
    for (const table of tables) {
      output += `- ${table.name}`;
      if (table.schema) {
        output += ` (schema: ${table.schema})`;
      }
      if (table.type) {
        output += ` [${table.type}]`;
      }
      output += '\n';
    }

    return output;
  }

  static formatTableSchema(schema: TableSchema): string {
    let output = `Table: ${schema.tableName}\n\n`;
    output += 'Columns:\n';

    for (const column of schema.columns) {
      output += `  - ${column.name}: ${column.type}`;
      if (column.primaryKey) {
        output += ' [PRIMARY KEY]';
      }
      if (!column.nullable) {
        output += ' NOT NULL';
      }
      if (column.default !== undefined && column.default !== null) {
        output += ` DEFAULT ${column.default}`;
      }
      if (column.foreignKey) {
        output += ' [FOREIGN KEY]';
      }
      output += '\n';
    }

    if (schema.indexes && schema.indexes.length > 0) {
      output += '\nIndexes:\n';
      for (const index of schema.indexes) {
        output += `  - ${index}\n`;
      }
    }

    if (schema.constraints && schema.constraints.length > 0) {
      output += '\nConstraints:\n';
      for (const constraint of schema.constraints) {
        output += `  - ${constraint}\n`;
      }
    }

    return output;
  }

  static formatDatabaseList(databases: Array<{ name: string; type: string }>): string {
    if (databases.length === 0) {
      return 'No databases configured.';
    }

    let output = `Available databases (${databases.length}):\n\n`;
    for (const db of databases) {
      output += `- ${db.name} (${db.type})\n`;
    }

    return output;
  }

  static formatError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred';
  }

  static sanitizeCredentials(config: any): any {
    const sanitized = { ...config };
    if (sanitized.password) {
      sanitized.password = '***';
    }
    if (sanitized.username) {
      sanitized.username = '***';
    }
    return sanitized;
  }
}
