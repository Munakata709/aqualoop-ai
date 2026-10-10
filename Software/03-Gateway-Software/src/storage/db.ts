import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { MachineSnapshot, GatewayAlert } from "../types.js";

export class GatewayDb {
  private db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp_iso TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_synced ON telemetry_history(synced);

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        severity TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at_iso TEXT NOT NULL,
        acknowledged_at_iso TEXT
      );
    `);
  }

  insertSnapshot(snapshot: MachineSnapshot): void {
    this.db
      .prepare("INSERT INTO telemetry_history (timestamp_iso, snapshot_json) VALUES (?, ?)")
      .run(snapshot.timestampIso, JSON.stringify(snapshot));
  }

  recentSnapshots(limit: number): MachineSnapshot[] {
    const rows = this.db
      .prepare("SELECT snapshot_json FROM telemetry_history ORDER BY id DESC LIMIT ?")
      .all(limit) as { snapshot_json: string }[];
    return rows.map((r) => JSON.parse(r.snapshot_json) as MachineSnapshot).reverse();
  }

  unsyncedSnapshots(limit: number): { id: number; snapshot: MachineSnapshot }[] {
    const rows = this.db
      .prepare("SELECT id, snapshot_json FROM telemetry_history WHERE synced = 0 ORDER BY id ASC LIMIT ?")
      .all(limit) as { id: number; snapshot_json: string }[];
    return rows.map((r) => ({ id: r.id, snapshot: JSON.parse(r.snapshot_json) as MachineSnapshot }));
  }

  markSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const stmt = this.db.prepare("UPDATE telemetry_history SET synced = 1 WHERE id = ?");
    const tx = this.db.transaction((rows: number[]) => {
      for (const id of rows) stmt.run(id);
    });
    tx(ids);
  }

  upsertAlert(alert: GatewayAlert): void {
    this.db
      .prepare(
        `INSERT INTO alerts (id, severity, type, message, created_at_iso, acknowledged_at_iso)
         VALUES (@id, @severity, @type, @message, @createdAtIso, @acknowledgedAtIso)
         ON CONFLICT(id) DO UPDATE SET acknowledged_at_iso = excluded.acknowledged_at_iso`,
      )
      .run({ ...alert, acknowledgedAtIso: alert.acknowledgedAtIso ?? null });
  }

  acknowledgeAlert(id: string): void {
    this.db
      .prepare("UPDATE alerts SET acknowledged_at_iso = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
  }

  recentAlerts(limit: number): GatewayAlert[] {
    const rows = this.db
      .prepare("SELECT * FROM alerts ORDER BY created_at_iso DESC LIMIT ?")
      .all(limit) as Array<{
      id: string;
      severity: GatewayAlert["severity"];
      type: string;
      message: string;
      created_at_iso: string;
      acknowledged_at_iso: string | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      severity: r.severity,
      type: r.type,
      message: r.message,
      createdAtIso: r.created_at_iso,
      acknowledgedAtIso: r.acknowledged_at_iso ?? undefined,
    }));
  }

  close(): void {
    this.db.close();
  }
}
