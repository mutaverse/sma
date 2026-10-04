export type SqlValue = string | number | null;

export type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

export type DbClient = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: SqlValue[]) => Promise<RunResult>;
  getFirstAsync: <T>(sql: string, params?: SqlValue[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, params?: SqlValue[]) => Promise<T[]>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
};
