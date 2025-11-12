import { PGlite } from '@electric-sql/pglite';
import * as dotenv from 'dotenv';
import { DefaultLogger } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import {
  type PgliteDatabase,
  drizzle as dirzzleLite,
} from 'drizzle-orm/pglite';
import { migrate as migrateLite } from 'drizzle-orm/pglite/migrator';
import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { parse } from 'pg-connection-string';
import postgres from 'postgres';
import * as schema from './schema';
import { DrizzleLogger } from './utils';

export * from 'drizzle-orm';

dotenv.config();

const connectionConfig = (databaseUrl: string) => {
  const connectionConfig = parse(databaseUrl);
  const config = {
    host: connectionConfig.host ?? 'localhost',
    port: connectionConfig.port
      ? Number.parseInt(connectionConfig.port, 10)
      : 5432,
    user: connectionConfig.user,
    password: connectionConfig.password,
    database: connectionConfig.database ?? undefined,
    ssl: connectionConfig.ssl as undefined,
    max: 10,
    idle_timeout: 25,
    max_lifetime: 60 * 30,
    connection: {
      application_name: 'compost',
    },
  };

  if (process.env.MAX_CONNECTIONS) {
    const maxConnections = Number.parseInt(process.env.MAX_CONNECTIONS);
    if (!Number.isNaN(maxConnections)) {
      config.max = maxConnections;
    }
  }

  return config;
};

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private conn: postgres.Sql | PGlite | undefined;
  private db!: PostgresJsDatabase | PgDatabase<PgQueryResultHKT, typeof schema>;
  private logger: DefaultLogger | undefined;

  private constructor() {
    this.initConnection();
    this.initLogger();
    this.initDb();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }

    return DatabaseConnection.instance;
  }

  private initConnection() {
    if (process.env.NODE_ENV === 'test') {
      this.conn = new PGlite();
    } else {
      if (!this.conn) {
        this.conn = postgres(
          process.env.DATABASE_URL
            ? connectionConfig(process.env.DATABASE_URL)
            : connectionConfig('')
        );
      }
    }
  }

  private initDb() {
    if (process.env.NODE_ENV === 'test') {
      this.db = dirzzleLite(this.conn as PGlite, {
        schema,
        logger: this.logger,
      }) as PgDatabase<PgQueryResultHKT, typeof schema>;
    } else {
      this.db = drizzle(this.conn as postgres.Sql, {
        schema,
        logger: this.logger,
      });
    }
  }

  private initLogger() {
    if (process.env.LOG_LEVEL === 'debug') {
      this.logger = new DefaultLogger({ writer: new DrizzleLogger() });
    }
  }

  getConnection() {
    return this.conn;
  }

  getDb() {
    return this.db;
  }

  setTestConnection(testConn: PGlite) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'setTestConnection can only be called in test environment'
      );
    }
    this.conn = testConn;
    this.initDb();
  }
}

export const db =
  DatabaseConnection.getInstance().getDb() as PostgresJsDatabase<typeof schema>;

export const conn = DatabaseConnection.getInstance().getConnection();

export const migrateDb = async (options?: {
  shouldExit?: boolean;
  applyMigrationsOverride?: boolean;
}) => {
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const shouldExit = options?.shouldExit ?? true;
  const applyMigrationsOverride = options?.applyMigrationsOverride ?? false;

  try {
    if (isTest) {
      await migrateLite(db as unknown as PgliteDatabase, {
        migrationsFolder: path.join(__dirname, 'drizzle'),
      });
    } else if (isProd || applyMigrationsOverride) {
      console.log('Migrating database...');

      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      await migrate(drizzle(postgres(connectionConfig(databaseUrl))), {
        migrationsFolder: './drizzle',
      });

      console.log('Migration completed');
    }
  } catch (error) {
    console.error('Error during migration: ', error);
    if (shouldExit) {
      process.exit(1);
    }
  }
};
