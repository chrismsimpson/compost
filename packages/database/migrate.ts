import { migrateDb } from './database';

migrateDb({ shouldExit: true, applyMigrationsOverride: true });
