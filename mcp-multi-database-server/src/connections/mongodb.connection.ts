import { MongoClient, Db } from 'mongodb';
import { DatabaseConfig, IDatabaseAdapter, TableInfo, TableSchema, ColumnInfo, QueryResult } from '../types/database.types.js';
import { logger } from '../utils/logger.js';

export class MongoDBConnection implements IDatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const uri = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
      
      this.client = new MongoClient(uri, {
        maxPoolSize: this.config.maxPoolSize || 5,
        serverSelectionTimeoutMS: this.config.queryTimeoutMs || 30000,
        ssl: this.config.ssl,
      });

      await this.client.connect();
      this.db = this.client.db(this.config.database);
      logger.info(`Connected to MongoDB database: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to connect to MongoDB database: ${this.config.name}`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info(`Disconnected from MongoDB database: ${this.config.name}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client || !this.db) {
        await this.connect();
      }
      await this.db!.admin().ping();
      return true;
    } catch (error) {
      logger.error(`Connection test failed for ${this.config.name}`, error);
      return false;
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const collections = await this.db.listCollections().toArray();
    return collections.map(col => ({
      name: col.name,
      type: col.type || 'collection',
    }));
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // MongoDB doesn't have a fixed schema, so we'll sample documents to infer it
    const collection = this.db.collection(tableName);
    const sampleDocs = await collection.find({}).limit(100).toArray();

    if (sampleDocs.length === 0) {
      return {
        tableName,
        columns: [],
      };
    }

    // Analyze fields from sample documents
    const fieldTypes = new Map<string, Set<string>>();

    for (const doc of sampleDocs) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }
        fieldTypes.get(key)!.add(typeof value);
      }
    }

    const columns: ColumnInfo[] = Array.from(fieldTypes.entries()).map(([name, types]) => ({
      name,
      type: Array.from(types).join(' | '),
      nullable: true, // MongoDB fields are always optional
      primaryKey: name === '_id',
    }));

    // Get indexes
    const indexes = await collection.indexes();
    const indexNames = indexes.map(idx => idx.name || 'unknown');

    return {
      tableName,
      columns,
      indexes: indexNames,
    };
  }

  async executeQuery(query: string, limit: number): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    // Parse the query - for MongoDB, we expect JSON query format
    // Example: { "collection": "users", "filter": { "age": { "$gt": 18 } }, "projection": {} }
    let parsedQuery: any;
    try {
      parsedQuery = JSON.parse(query);
    } catch (error) {
      throw new Error('Invalid MongoDB query format. Expected JSON object with collection, filter, and optional projection.');
    }

    if (!parsedQuery.collection) {
      throw new Error('Query must specify a collection name');
    }

    const collection = this.db.collection(parsedQuery.collection);
    const filter = parsedQuery.filter || {};
    const projection = parsedQuery.projection || {};

    const cursor = collection.find(filter, { projection }).limit(limit);
    const rows = await cursor.toArray();

    const executionTimeMs = Date.now() - startTime;

    // Extract field names from first document
    const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      rows,
      rowCount: rows.length,
      fields,
      executionTimeMs,
    };
  }

  async getSampleRows(tableName: string, limit: number): Promise<QueryResult> {
    const query = JSON.stringify({
      collection: tableName,
      filter: {},
    });
    return this.executeQuery(query, limit);
  }

  async explainQuery(query: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    let parsedQuery: any;
    try {
      parsedQuery = JSON.parse(query);
    } catch (error) {
      throw new Error('Invalid MongoDB query format. Expected JSON object with collection and filter.');
    }

    if (!parsedQuery.collection) {
      throw new Error('Query must specify a collection name');
    }

    const collection = this.db.collection(parsedQuery.collection);
    const filter = parsedQuery.filter || {};

    const explanation = await collection.find(filter).explain();
    return explanation;
  }
}
