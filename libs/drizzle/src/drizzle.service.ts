import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DrizzleConfig } from './config/drizzle.config';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private _db: NodePgDatabase;

  constructor(
    @Inject('DRIZZLE_CONFIG')
    private readonly config: DrizzleConfig,
  ) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl,
    });

    this._db = drizzle(this.pool);
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  get db(): NodePgDatabase {
    if (!this._db) {
      throw new Error('Drizzle database not initialized. Make sure the module is properly loaded.');
    }
    return this._db;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}