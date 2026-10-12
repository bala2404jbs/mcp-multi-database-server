import { AuditLog } from '../types/database.types.js';
import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

export class AuditLogger {
  private auditLogPath: string;

  constructor(auditLogPath?: string) {
    this.auditLogPath = auditLogPath || path.join(process.cwd(), 'audit.log');
    this.ensureLogFileExists();
  }

  private ensureLogFileExists() {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        fs.writeFileSync(this.auditLogPath, '');
        logger.info(`Created audit log file at ${this.auditLogPath}`);
      }
    } catch (error) {
      logger.error('Failed to create audit log file', error);
    }
  }

  log(auditLog: AuditLog) {
    try {
      const logLine = JSON.stringify(auditLog) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine);
      logger.debug('Audit log entry created', auditLog);
    } catch (error) {
      logger.error('Failed to write audit log', error);
    }
  }

  logDatabaseOperation(
    databaseName: string,
    toolName: string,
    queryType: string,
    success: boolean,
    userId?: string,
    executionTimeMs?: number,
    errorMessage?: string,
    query?: string
  ) {
    const auditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      userId,
      databaseName,
      toolName,
      queryType,
      executionTimeMs,
      success,
      errorMessage: errorMessage ? this.sanitizeErrorMessage(errorMessage) : undefined,
      query: query ? this.sanitizeQuery(query) : undefined,
    };

    this.log(auditLog);
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive information from error messages
    return message
      .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=***')
      .replace(/pwd[=:]\s*["']?[^"'\s]+["']?/gi, 'pwd=***')
      .replace(/token[=:]\s*["']?[^"'\s]+["']?/gi, 'token=***')
      .replace(/api[_-]?key[=:]\s*["']?[^"'\s]+["']?/gi, 'api_key=***');
  }

  private sanitizeQuery(query: string): string {
    // Truncate long queries and remove potential sensitive data
    const maxLength = 500;
    let sanitized = query.length > maxLength ? query.substring(0, maxLength) + '...' : query;
    return this.sanitizeErrorMessage(sanitized);
  }
}

export const auditLogger = new AuditLogger(process.env.AUDIT_LOG_PATH);
