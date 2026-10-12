import { ConnectionManager } from '../connections/connection.manager.js';
import { QueryValidator } from '../utils/query-validator.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { auditLogger } from '../utils/audit-logger.js';
import { UsersConfigLoader } from '../config/users.config.js';

export async function listTablesTool(
  connectionManager: ConnectionManager,
  args: { databaseName: string },
  userId?: string
): Promise<string> {
  const startTime = Date.now();
  const { databaseName } = args;

  try {
    // Validate database name
    const validation = QueryValidator.validateDatabaseName(databaseName);
    if (!validation.valid) {
      throw new Error(validation.error);
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
    const tables = await connection.listTables();

    auditLogger.logDatabaseOperation(
      databaseName,
      'list_tables',
      'LIST',
      true,
      userId,
      Date.now() - startTime
    );

    return ResponseFormatter.formatTableList(tables);
  } catch (error) {
    auditLogger.logDatabaseOperation(
      databaseName,
      'list_tables',
      'LIST',
      false,
      userId,
      Date.now() - startTime,
      ResponseFormatter.formatError(error)
    );
    throw error;
  }
}
