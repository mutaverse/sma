import type { DbClient, SqlValue } from '@/db/client';
import type { RemoteRow } from '@/db/sync/remote';
import {
  INSERT_IGNORE_TABLES,
  INTEGER_COLUMNS,
  LWW_TABLES,
  PULL_ORDER,
  TABLE_COLUMNS,
  type RemoteTable,
} from '@/db/sync/tables';

export async function applyRemoteRows(
  db: DbClient,
  table: RemoteTable,
  rows: RemoteRow[],
  options: { force: boolean },
): Promise<number> {
  let applied = 0;
  for (const row of rows) {
    if (await applyRemoteRow(db, table, row, options.force)) {
      applied += 1;
    }
  }
  return applied;
}

export async function pullTables(
  db: DbClient,
  listUpdatedSince: (table: RemoteTable, sinceIso: string | null) => Promise<RemoteRow[]>,
  options: { force: boolean; since: string | null },
): Promise<number> {
  let pulled = 0;
  for (const table of PULL_ORDER) {
    const rows = await listUpdatedSince(table, options.force ? null : options.since);
    pulled += await applyRemoteRows(db, table, rows, { force: options.force });
  }
  return pulled;
}

async function applyRemoteRow(
  db: DbClient,
  table: RemoteTable,
  row: RemoteRow,
  force: boolean,
): Promise<boolean> {
  const id = cell(table, 'id', row.id);
  if (id == null) {
    return false;
  }

  if (table === 'daily_sales') {
    const skipped = await resolveSaleDateClash(db, row, force);
    if (skipped) {
      return false;
    }
  }

  const columns = [...TABLE_COLUMNS[table]];
  const values = columns.map((column) => cell(table, column, row[column]));

  if (table === 'app_settings') {
    const existingPulled = await db.getFirstAsync<{ last_pulled_at: string | null }>(
      'SELECT last_pulled_at FROM app_settings WHERE id = ?',
      [id],
    );
    columns.push('last_pulled_at');
    values.push(existingPulled?.last_pulled_at ?? null);
  }

  const placeholders = columns.map(() => '?').join(', ');

  if (INSERT_IGNORE_TABLES.has(table)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values,
    );
    return true;
  }

  if (!LWW_TABLES.has(table)) {
    return false;
  }

  const updatable = columns.filter((column) => column !== 'id' && column !== 'last_pulled_at');
  const assignments = updatable.map((column) => `${column} = excluded.${column}`).join(', ');
  const lwwClause = force ? '' : ` WHERE excluded.updated_at >= ${table}.updated_at`;

  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${assignments}${lwwClause}`,
    values,
  );
  return true;
}

async function resolveSaleDateClash(db: DbClient, row: RemoteRow, force: boolean): Promise<boolean> {
  const id = cell('daily_sales', 'id', row.id);
  const saleDate = cell('daily_sales', 'sale_date', row.sale_date);
  if (id == null || saleDate == null) {
    return true;
  }

  const clash = await db.getFirstAsync<{ id: string; updated_at: string }>(
    'SELECT id, updated_at FROM daily_sales WHERE sale_date = ? AND id != ?',
    [saleDate, id],
  );

  if (!clash) {
    return false;
  }

  const remoteUpdated = String(row.updated_at ?? '');
  if (force || remoteUpdated >= clash.updated_at) {
    await db.runAsync('DELETE FROM daily_sales WHERE id = ?', [clash.id]);
    return false;
  }

  return true;
}

function cell(_table: RemoteTable, column: string, value: string | number | null | undefined): SqlValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (INTEGER_COLUMNS.has(column)) {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  return String(value);
}
