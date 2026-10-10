import type { GatewayDb } from "../storage/db.js";
import type { GatewayConfig } from "../config.js";

/**
 * Pushes unsynced telemetry batches to the cloud ingestion endpoint
 * (see app/api/telemetry/ingest in the main web app). Store-and-forward:
 * rows stay marked unsynced until the POST succeeds, so a connectivity
 * gap (LTE dropout, etc.) just delays the sync rather than losing data.
 */
export async function syncOnce(db: GatewayDb, config: GatewayConfig): Promise<{ sent: number }> {
  if (!config.CLOUD_INGEST_URL) return { sent: 0 };

  const batch = db.unsyncedSnapshots(50);
  if (batch.length === 0) return { sent: 0 };

  const response = await fetch(config.CLOUD_INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.CLOUD_INGEST_TOKEN ? { Authorization: `Bearer ${config.CLOUD_INGEST_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      deviceId: config.DEVICE_ID,
      snapshots: batch.map((b) => b.snapshot),
    }),
  });

  if (!response.ok) {
    throw new Error(`Cloud ingest failed: ${response.status} ${await response.text()}`);
  }

  db.markSynced(batch.map((b) => b.id));
  return { sent: batch.length };
}

export function startCloudSyncLoop(db: GatewayDb, config: GatewayConfig): () => void {
  const timer = setInterval(() => {
    syncOnce(db, config).catch((err) => console.error("Cloud sync failed (will retry):", err.message));
  }, config.CLOUD_SYNC_INTERVAL_MS);
  return () => clearInterval(timer);
}
