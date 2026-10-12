import { ConnectionManager } from '../connections/connection.manager.js';
import { QueryValidator } from '../utils/query-validator.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { auditLogger } from '../utils/audit-logger.js';
import { UsersConfigLoader } from '../config/users.config.js';

export async function explainQueryTool(
  connectionManager: ConnectionManager,
  args: { databaseName: string; query: string },
  userId?: string
): Promise<string> {
  const startTime = Date.now();
  const { databaseName, query } = args;

  try {
    // Validate database name
    const dbValidation = QueryValidator.validateDatabaseName(databaseName);
    if (!dbValidation.valid) {
      throw new Error(dbValidation.error);
    }

    // Check user access
    if (UsersConfigLoader.isEnabled() && !UsersConfigLoader.canAccessDatabase(userId, databaseName)) {
      throw new Error(`Access denied to database: ${databaseName}`);
    }

    // Check if database exists
    if (!connectionManager.hasConnection(databaseName)) {
      throw new Error(`Database not found: ${databaseName}`);
    }

    // Get database config
    const config = connectionManager.getConfig(databaseName);
    if (!config) {
      throw new Error(`Database config not found: ${databaseName}`);
    }

    // For non-MongoDB databases, validate SELECT query
    if (config.type !== 'mongodb') {
      const queryValidation = QueryValidator.validateSelectQuery(query);
      if (!queryValidation.valid) {
        throw new Error(queryValidation.error);
      }
    }

    const connection = connectionManager.getConnection(databaseName);
    const explanation = await connection.explainQuery(query);

    auditLogger.logDatabaseOperation(
      databaseName,
      'explain_query',
      'EXPLAIN',
      true,
      userId,
      Date.now() - startTime,
      undefined,
      query
    );

    return `Query Execution Plan:\n\n${JSON.stringify(explanation, null, 2)}`;
  } catch (error) {
    auditLogger.logDatabaseOperation(
      databaseName,
      'explain_query',
      'EXPLAIN',
      false,
      userId,
      Date.now() - startTime,
      ResponseFormatter.formatError(error),
      query
    );
    throw error;
  }
}
