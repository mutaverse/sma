import { DatabaseSync } from 'node:sqlite';

import type { DbClient, SqlValue } from '@/db/client';

export function createNodeSqliteClient(filename = ':memory:'): DbClient {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');

  return {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, params = []) => {
      const statement = db.prepare(sql);
      const result = statement.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getFirstAsync: async <T>(sql: string, params: SqlValue[] = []) => {
      const statement = db.prepare(sql);
      const row = statement.get(...params);
      return (row as T | undefined) ?? null;
    },
    getAllAsync: async <T>(sql: string, params: SqlValue[] = []) => {
      const statement = db.prepare(sql);
      return statement.all(...params) as T[];
    },
    withTransactionAsync: async (task) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
