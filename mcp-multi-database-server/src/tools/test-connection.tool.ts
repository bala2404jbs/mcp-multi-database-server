import { ConnectionManager } from '../connections/connection.manager.js';
import { QueryValidator } from '../utils/query-validator.js';
import { auditLogger } from '../utils/audit-logger.js';
import { UsersConfigLoader } from '../config/users.config.js';

export async function testConnectionTool(
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
    const isConnected = await connection.testConnection();

    auditLogger.logDatabaseOperation(
      databaseName,
      'test_connection',
      'TEST',
      true,
      userId,
      Date.now() - startTime
    );

    if (isConnected) {
      return `Connection to database "${databaseName}" is successful.`;
    } else {
      return `Connection to database "${databaseName}" failed.`;
    }
  } catch (error) {
    auditLogger.logDatabaseOperation(
      databaseName,
      'test_connection',
      'TEST',
      false,
      userId,
      Date.now() - startTime,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
