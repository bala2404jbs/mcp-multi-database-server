export class QueryValidator {
  private static readonly FORBIDDEN_KEYWORDS = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
    'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
    'MERGE', 'REPLACE', 'RENAME', 'VACUUM', 'ANALYZE'
  ];

  private static readonly DANGEROUS_PATTERNS = [
    /;\s*\w+/i, // Multiple statements
    /--/g, // SQL comments
    /\/\*/g, // Multi-line comments
    /xp_/gi, // SQL Server extended procedures
    /sp_/gi, // SQL Server system procedures
    /dbms_/gi, // Oracle packages
    /utl_/gi, // Oracle utilities
  ];

  static validateSelectQuery(query: string): { valid: boolean; error?: string } {
    if (!query || query.trim().length === 0) {
      return { valid: false, error: 'Query cannot be empty' };
    }

    // Remove leading/trailing whitespace
    const trimmedQuery = query.trim();

    // Check if query starts with SELECT (case insensitive)
    if (!trimmedQuery.match(/^\s*SELECT/i)) {
      return { valid: false, error: 'Only SELECT queries are allowed' };
    }

    // Check for forbidden keywords
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(trimmedQuery)) {
        return { valid: false, error: `Forbidden keyword detected: ${keyword}` };
      }
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedQuery)) {
        return { valid: false, error: 'Potentially dangerous SQL pattern detected' };
      }
    }

    // Check for semicolons (to prevent multiple statements)
    const semicolonCount = (trimmedQuery.match(/;/g) || []).length;
    if (semicolonCount > 1 || (semicolonCount === 1 && !trimmedQuery.endsWith(';'))) {
      return { valid: false, error: 'Multiple statements are not allowed' };
    }

    return { valid: true };
  }

  static validateLimit(limit?: number): number {
    const DEFAULT_LIMIT = 100;
    const MAX_LIMIT = 500;

    if (!limit || limit <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(limit, MAX_LIMIT);
  }

  static sanitizeTableName(tableName: string): { valid: boolean; error?: string } {
    if (!tableName || tableName.trim().length === 0) {
      return { valid: false, error: 'Table name cannot be empty' };
    }

    // Allow alphanumeric, underscore, dot (for schema.table), and hyphen
    const validPattern = /^[a-zA-Z0-9_.-]+$/;
    if (!validPattern.test(tableName)) {
      return { valid: false, error: 'Invalid table name format' };
    }

    // Check for SQL injection attempts
    const dangerousPatterns = [';', '--', '/*', '*/', 'xp_', 'sp_'];
    for (const pattern of dangerousPatterns) {
      if (tableName.toLowerCase().includes(pattern)) {
        return { valid: false, error: 'Invalid characters in table name' };
      }
    }

    return { valid: true };
  }

  static validateDatabaseName(databaseName: string): { valid: boolean; error?: string } {
    if (!databaseName || databaseName.trim().length === 0) {
      return { valid: false, error: 'Database name cannot be empty' };
    }

    // Allow alphanumeric, underscore, and hyphen
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(databaseName)) {
      return { valid: false, error: 'Invalid database name format' };
    }

    return { valid: true };
  }
}
