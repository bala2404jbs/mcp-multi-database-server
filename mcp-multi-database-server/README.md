# Multi-Database MCP Server

A production-ready MCP (Model Context Protocol) server that provides safe, read-only access to multiple database types (PostgreSQL, MySQL, SQL Server, MongoDB, SQLite) for AI agents in Cursor.

## Features

- Multi-database support (PostgreSQL, MySQL, SQL Server, MongoDB, SQLite)
- Connection pooling for optimal performance
- Read-only query enforcement with SQL injection protection
- User access control (optional)
- Comprehensive audit logging
- Query timeout enforcement
- Automatic query result limiting
- Environment-based configuration
- Full TypeScript implementation

## Supported Databases

- PostgreSQL (via `pg`)
- MySQL (via `mysql2`)
- SQL Server (via `mssql`)
- MongoDB (via `mongodb`)
- SQLite (via `better-sqlite3`)

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Steps

1. Clone or download this repository

2. Install dependencies:

```bash
cd mcp-multi-database-server
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

## Configuration

### 1. Database Configuration

Create a `databases.json` file with your database connections. See `databases.json.example` for reference.

Example configuration:

```json
[
  {
    "name": "postgres_prod_readonly",
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "database": "prod_db",
    "username": "readonly_user",
    "password": "your_password",
    "readOnly": true,
    "ssl": false,
    "maxPoolSize": 5,
    "queryTimeoutMs": 30000
  }
]
```

Configuration fields:

- `name` (required): Unique identifier for this database connection
- `type` (required): Database type (`postgres`, `mysql`, `sqlserver`, `mongodb`, `sqlite`)
- `host` (required for all except SQLite): Database server hostname
- `port` (optional): Database server port (uses default if not specified)
- `database` (required): Database name
- `username` (required for all except SQLite): Database username
- `password` (required for all except SQLite): Database password
- `readOnly` (required): Always set to `true` for safety
- `ssl` (optional): Enable SSL connection (default: false)
- `maxPoolSize` (optional): Maximum connection pool size (default: 5)
- `queryTimeoutMs` (optional): Query timeout in milliseconds (default: 30000)
- `filePath` (SQLite only): Absolute path to SQLite database file

### 2. User Access Control (Optional)

Create a `users.json` file to restrict database access by user. See `users.json.example` for reference.

Example configuration:

```json
{
  "users": [
    {
      "userId": "developer_1",
      "allowedDatabases": ["postgres_staging_readonly", "mysql_reporting_readonly"]
    },
    {
      "userId": "lead_1",
      "allowedDatabases": ["postgres_prod_readonly", "postgres_staging_readonly"]
    }
  ]
}
```

If you don't provide a `users.json` file or don't set the `USERS_CONFIG_PATH` environment variable, access control is disabled and all databases are accessible.

### 3. Environment Variables

Set the following environment variables (or create a `.env` file):

```bash
DATABASE_CONFIG_PATH=/absolute/path/to/databases.json
USERS_CONFIG_PATH=/absolute/path/to/users.json
AUDIT_LOG_PATH=/absolute/path/to/audit.log
LOG_LEVEL=info
```

## Running the Server

### Standalone

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

## Cursor MCP Configuration

Add the following to your Cursor MCP settings file (usually `~/.cursor/config.json` or in Cursor settings):

```json
{
  "mcpServers": {
    "multi-database": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-multi-database-server/dist/index.js"],
      "env": {
        "DATABASE_CONFIG_PATH": "/absolute/path/to/databases.json",
        "USERS_CONFIG_PATH": "/absolute/path/to/users.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

After adding this configuration, restart Cursor. The MCP server will be available to AI agents.

## Available MCP Tools

### 1. list_databases

Returns all configured database connections that the user has access to.

**Input:** None

**Example usage in Cursor:**
- "Show me all available databases"
- "What databases can I access?"
- "List databases"

### 2. test_connection

Tests if a database connection is working.

**Input:**
- `databaseName` (string): Name of the database to test

**Example usage:**
- "Test connection to postgres_prod_readonly"
- "Is mysql_reporting_readonly accessible?"

### 3. list_tables

Returns all tables/collections in a database.

**Input:**
- `databaseName` (string): Name of the database

**Example usage:**
- "Show me all tables in postgres_prod_readonly"
- "List tables in mysql_reporting_readonly"
- "What tables are in the database?"

### 4. describe_table

Returns schema information for a specific table.

**Input:**
- `databaseName` (string): Name of the database
- `tableName` (string): Name of the table

**Example usage:**
- "Describe the users table in postgres_prod_readonly"
- "What columns are in the orders table?"
- "Show me the schema for customers table"

### 5. execute_select_query

Executes a read-only SELECT query.

**Input:**
- `databaseName` (string): Name of the database
- `query` (string): SELECT query to execute
- `limit` (number, optional): Maximum rows to return (default: 100, max: 500)

**Example usage:**
- "Run query: SELECT * FROM users WHERE active = true"
- "Execute: SELECT COUNT(*) FROM orders WHERE created_at > '2024-01-01'"
- "Query the database for all customers in California"

**MongoDB Example:**
For MongoDB, provide query in JSON format:
```json
{
  "collection": "users",
  "filter": { "age": { "$gt": 18 } },
  "projection": { "name": 1, "email": 1 }
}
```

### 6. get_sample_rows

Returns sample rows from a table (quick way to see example data).

**Input:**
- `databaseName` (string): Name of the database
- `tableName` (string): Name of the table
- `limit` (number, optional): Maximum rows to return (default: 100, max: 500)

**Example usage:**
- "Show me some sample data from the users table"
- "Get 10 sample rows from orders"
- "What does the data in products look like?"

### 7. explain_query

Returns the query execution plan (helps understand performance).

**Input:**
- `databaseName` (string): Name of the database
- `query` (string): SELECT query to explain

**Example usage:**
- "Explain this query: SELECT * FROM users WHERE email = 'test@example.com'"
- "Show me the execution plan for this query"
- "How will this query perform?"

## Security Features

### Query Validation

The server enforces strict security measures:

1. **Read-only enforcement:** Only SELECT queries are allowed for SQL databases
2. **Blocked operations:** INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXEC, CALL are blocked
3. **SQL injection protection:** 
   - Multiple statements blocked
   - SQL comments (-- and /* */) blocked
   - Dangerous patterns detected
4. **Result limiting:** 
   - Default limit: 100 rows
   - Maximum limit: 500 rows
5. **Query timeout:** Configurable timeout prevents long-running queries
6. **Table name validation:** Only alphanumeric characters, underscores, dots, and hyphens allowed

### User Access Control

When enabled, users can only access databases they're explicitly granted access to:

- Each user has a `userId` and list of `allowedDatabases`
- Access is checked before every database operation
- If no user config is provided, access control is disabled

### Credential Protection

- Passwords and credentials are never exposed in responses
- Error messages are sanitized to remove sensitive information
- Audit logs sanitize queries and error messages

## Audit Logging

All database operations are logged to `audit.log` (or path specified in `AUDIT_LOG_PATH`).

Log format (JSON per line):

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "developer_1",
  "databaseName": "postgres_prod_readonly",
  "toolName": "execute_select_query",
  "queryType": "SELECT",
  "executionTimeMs": 45,
  "success": true,
  "query": "SELECT * FROM users LIMIT 10"
}
```

Fields logged:
- `timestamp`: ISO 8601 timestamp
- `userId`: User identifier (if access control enabled)
- `databaseName`: Database accessed
- `toolName`: MCP tool used
- `queryType`: Type of operation (SELECT, LIST, DESCRIBE, etc.)
- `executionTimeMs`: Query execution time
- `success`: Whether operation succeeded
- `errorMessage`: Sanitized error message (if failed)
- `query`: Sanitized query (if applicable)

## Example Prompts for Cursor

Here are some example prompts you can use with your AI agent in Cursor:

**Exploring databases:**
- "What databases are available?"
- "Show me all tables in postgres_prod_readonly"
- "Describe the users table in mysql_reporting_readonly"

**Querying data:**
- "How many users do we have in postgres_prod_readonly?"
- "Show me the top 10 orders from yesterday"
- "Find all customers with email addresses ending in @example.com"
- "What are the most common product categories?"

**Analyzing data:**
- "What's the schema of the orders table?"
- "Show me sample data from the products table"
- "Explain the performance of this query: SELECT * FROM large_table WHERE indexed_column = 'value'"

**MongoDB queries:**
- "Query MongoDB for users with age greater than 18"
- "Find all log entries from the last hour in mongodb_logs"

## Troubleshooting

### Connection Issues

1. **Check database credentials:** Verify username, password, host, and port in `databases.json`
2. **Test connectivity:** Try connecting to the database using a native client
3. **Check firewall:** Ensure the database port is accessible
4. **SSL settings:** Some databases require SSL connections

### Permission Issues

1. **Database user permissions:** Ensure the database user has SELECT permissions
2. **User access control:** Check `users.json` to verify user has access to the database
3. **File permissions:** Ensure the MCP server can read configuration files

### Query Errors

1. **SQL syntax:** Verify your SQL syntax is correct for the database type
2. **Table names:** Use fully qualified names (schema.table) if needed
3. **MongoDB format:** For MongoDB, use JSON query format
4. **Query timeout:** Increase `queryTimeoutMs` for long-running queries

### Logs

Check the server logs for detailed error messages:

```bash
# Set debug logging
export LOG_LEVEL=debug
npm start
```

View audit logs:

```bash
tail -f audit.log
```

## Development

### Build

```bash
npm run build
```

### Watch mode (auto-rebuild on changes)

```bash
npm run watch
```

### Clean build artifacts

```bash
npm run clean
```

## Project Structure

```
mcp-multi-database-server/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── config/
│   │   ├── database.config.ts      # Database configuration loader
│   │   └── users.config.ts         # User access control loader
│   ├── connections/
│   │   ├── connection.manager.ts   # Connection pool manager
│   │   ├── postgres.connection.ts  # PostgreSQL adapter
│   │   ├── mysql.connection.ts     # MySQL adapter
│   │   ├── sqlserver.connection.ts # SQL Server adapter
│   │   ├── mongodb.connection.ts   # MongoDB adapter
│   │   └── sqlite.connection.ts    # SQLite adapter
│   ├── tools/
│   │   ├── list-databases.tool.ts
│   │   ├── test-connection.tool.ts
│   │   ├── list-tables.tool.ts
│   │   ├── describe-table.tool.ts
│   │   ├── execute-select-query.tool.ts
│   │   ├── get-sample-rows.tool.ts
│   │   └── explain-query.tool.ts
│   ├── utils/
│   │   ├── query-validator.ts      # SQL injection protection
│   │   ├── response-formatter.ts   # Format responses
│   │   ├── logger.ts               # Application logger
│   │   └── audit-logger.ts         # Audit logging
│   └── types/
│       └── database.types.ts       # TypeScript type definitions
├── databases.json.example
├── users.json.example
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Security Notes

IMPORTANT SECURITY CONSIDERATIONS:

1. **Read-only access:** Always set `readOnly: true` in database configurations
2. **Database user permissions:** Create dedicated read-only database users
3. **Credential storage:** Store `databases.json` and `users.json` securely
4. **Network security:** Use SSL connections for production databases
5. **Access control:** Enable user access control in production environments
6. **Audit logs:** Regularly review audit logs for suspicious activity
7. **Query limits:** Default limits prevent excessive data exposure
8. **Timeout enforcement:** Prevents resource exhaustion from long queries

### Recommended Database User Setup

PostgreSQL:
```sql
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE your_db TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
```

MySQL:
```sql
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT ON your_db.* TO 'readonly_user'@'%';
FLUSH PRIVILEGES;
```

SQL Server:
```sql
CREATE LOGIN readonly_user WITH PASSWORD = 'secure_password';
USE your_db;
CREATE USER readonly_user FOR LOGIN readonly_user;
ALTER ROLE db_datareader ADD MEMBER readonly_user;
```

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on the project repository.
