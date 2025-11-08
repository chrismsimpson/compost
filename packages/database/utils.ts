import { type LogWriter, type SQL, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export const lower = (email: AnyPgColumn): SQL => {
  return sql`lower(${email})`;
};

export class DrizzleLogger implements LogWriter {
  write(message: string): void {
    console.log(message);
  }

  debug(message: string): void {
    console.debug(message);
  }

  info(message: string): void {
    console.info(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }
}
