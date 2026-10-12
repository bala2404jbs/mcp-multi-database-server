#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { ConnectionManager } from './connections/connection.manager.js';
import { DatabaseConfigLoader } from './config/database.config.js';
import { UsersConfigLoader } from './config/users.config.js';
import { logger } from './utils/logger.js';

import { listDatabasesTool } from './tools/list-databases.tool.js';
import { testConnectionTool } from './tools/test-connection.tool.js';
import { listTablesTool } from './tools/list-tables.tool.js';
import { describeTableTool } from './tools/describe-table.tool.js';
import { executeSelectQueryTool } from './tools/execute-select-query.tool.js';
import { getSampleRowsTool } from './tools/get-sample-rows.tool.js';
import { explainQueryTool } from './tools/explain-query.tool.js';

class MultiDatabaseMCPServer {
  private server: Server;
  private connectionManager: ConnectionManager | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'multi-database-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_databases',
          description: 'Returns all configured database connections (name and type only, no credentials). Lists databases the user has access to.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'test_connection',
          description: 'Tests if a database connection is working and accessible.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database to test',
              },
            },
            required: ['databaseName'],
          },
        },
        {
          name: 'list_tables',
          description: 'Returns all tables/collections in the specified database.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database',
              },
            },
            required: ['databaseName'],
          },
        },
        {
          name: 'describe_table',
          description: 'Returns schema information for a specific table including columns, types, constraints, and indexes.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database',
              },
              tableName: {
                type: 'string',
                description: 'Name of the table to describe',
              },
            },
            required: ['databaseName', 'tableName'],
          },
        },
        {
          name: 'execute_select_query',
          description: 'Executes a read-only SELECT query on the specified database. Only SELECT queries are allowed. Maximum 500 rows.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database',
              },
              query: {
                type: 'string',
                description: 'SELECT query to execute (for MongoDB, provide JSON format: {"collection": "name", "filter": {}, "projection": {}})',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of rows to return (default: 100, max: 500)',
                default: 100,
              },
            },
            required: ['databaseName', 'query'],
          },
        },
        {
          name: 'get_sample_rows',
          description: 'Returns sample rows from a table. Quick way to see example data.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database',
              },
              tableName: {
                type: 'string',
                description: 'Name of the table',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of rows to return (default: 100, max: 500)',
                default: 100,
              },
            },
            required: ['databaseName', 'tableName'],
          },
        },
        {
          name: 'explain_query',
          description: 'Returns the query execution plan for a SELECT query. Helps understand query performance.',
          inputSchema: {
            type: 'object',
            properties: {
              databaseName: {
                type: 'string',
                description: 'Name of the database',
              },
              query: {
                type: 'string',
                description: 'SELECT query to explain',
              },
            },
            required: ['databaseName', 'query'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.connectionManager) {
        throw new Error('Connection manager not initialized');
      }

      const { name, arguments: args } = request.params;

      try {
        let result: string;

        // Extract userId from request metadata if available
        const userId = (request.params as any)._meta?.userId;

        switch (name) {
          case 'list_databases':
            result = await listDatabasesTool(this.connectionManager, args || {}, userId);
            break;

          case 'test_connection':
            result = await testConnectionTool(this.connectionManager, args as any, userId);
            break;

          case 'list_tables':
            result = await listTablesTool(this.connectionManager, args as any, userId);
            break;

          case 'describe_table':
            result = await describeTableTool(this.connectionManager, args as any, userId);
            break;

          case 'execute_select_query':
            result = await executeSelectQueryTool(this.connectionManager, args as any, userId);
            break;

          case 'get_sample_rows':
            result = await getSampleRowsTool(this.connectionManager, args as any, userId);
            break;

          case 'explain_query':
            result = await explainQueryTool(this.connectionManager, args as any, userId);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing tool ${name}`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      logger.error('MCP Server error', error);
    };

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });
  }

  async initialize() {
    try {
      logger.info('Initializing Multi-Database MCP Server...');

      // Load configurations
      const databaseConfigs = DatabaseConfigLoader.load();
      UsersConfigLoader.load();

      logger.info(`User access control: ${UsersConfigLoader.isEnabled() ? 'ENABLED' : 'DISABLED'}`);

      // Initialize connection manager
      this.connectionManager = new ConnectionManager(databaseConfigs);
      await this.connectionManager.initializeConnections();

      logger.info('Multi-Database MCP Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.connectionManager) {
      await this.connectionManager.disconnectAll();
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Multi-Database MCP Server started on stdio transport');
  }
}

// Main execution
async function main() {
  const server = new MultiDatabaseMCPServer();
  
  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
