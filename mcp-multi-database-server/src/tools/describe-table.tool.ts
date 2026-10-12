import { ConnectionManager } from '../connections/connection.manager.js';
import { QueryValidator } from '../utils/query-validator.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { auditLogger } from '../utils/audit-logger.js';
import { UsersConfigLoader } from '../config/users.config.js';

export async function describeTableTool(
  connectionManager: ConnectionManager,
  args: { databaseName: string; tableName: string },
  userId?: string
): Promise<string> {
  const startTime = Date.now();
  const { databaseName, tableName } = args;

  try {
    // Validate database name
    const dbValidation = QueryValidator.validateDatabaseName(databaseName);
    if (!dbValidation.valid) {
      throw new Error(dbValidation.error);
    }

    // Validate table name
    const tableValidation = QueryValidator.sanitizeTableName(tableName);
    if (!tableValidation.valid) {
      throw new Error(tableValidation.error);
    }

    // Check user access
    if (UsersConfigLoader.isEnabled() && !UsersConfigLoader.canAccessDatabase(userId, databaseName)) {
      throw new Error(`Access denied to database: ${databaseName}`);
    }

    // Check if database exists
    if (!connectionManager.hasConnection(databaseName)) {
      throw new Error(`Database not found: ${databaseName}`);
    }

    const connection = connectionManager.getConnection(databaseName);
    const schema = await connection.describeTable(tableName);

    auditLogger.logDatabaseOperation(
      databaseName,
      'describe_table',
      'DESCRIBE',
      true,
      userId,
      Date.now() - startTime
    );

    return ResponseFormatter.formatTableSchema(schema);
  } catch (error) {
    auditLogger.logDatabaseOperation(
      databaseName,
      'describe_table',
      'DESCRIBE',
      false,
      userId,
      Date.now() - startTime,
      ResponseFormatter.formatError(error)
    );
    throw error;
  }
}
