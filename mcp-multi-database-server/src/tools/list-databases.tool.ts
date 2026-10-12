import { ConnectionManager } from '../connections/connection.manager.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { auditLogger } from '../utils/audit-logger.js';
import { UsersConfigLoader } from '../config/users.config.js';

export async function listDatabasesTool(
  connectionManager: ConnectionManager,
  _args: any,
  userId?: string
): Promise<string> {
  const startTime = Date.now();

  try {
    const allDatabases = connectionManager.getAllDatabaseInfo();

    // Filter by user access if access control is enabled
    const accessibleDatabases = UsersConfigLoader.isEnabled() && userId
      ? allDatabases.filter(db => UsersConfigLoader.canAccessDatabase(userId, db.name))
      : allDatabases;

    // Remove sensitive information (only return name and type)
    const sanitizedDatabases = accessibleDatabases.map(db => ({
      name: db.name,
      type: db.type,
    }));

    auditLogger.logDatabaseOperation(
      'N/A',
      'list_databases',
      'LIST',
      true,
      userId,
      Date.now() - startTime
    );

    return ResponseFormatter.formatDatabaseList(sanitizedDatabases);
  } catch (error) {
    auditLogger.logDatabaseOperation(
      'N/A',
      'list_databases',
      'LIST',
      false,
      userId,
      Date.now() - startTime,
      ResponseFormatter.formatError(error)
    );
    throw error;
  }
}
