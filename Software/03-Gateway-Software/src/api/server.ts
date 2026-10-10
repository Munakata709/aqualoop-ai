import express from "express";
import type { GatewayDb } from "../storage/db.js";
import type { MachineSnapshot, DecisionResult } from "../types.js";

export interface ApiServerState {
  latestSnapshot: () => MachineSnapshot | null;
  latestDecision: () => DecisionResult | null;
}

export function createApiServer(db: GatewayDb, state: ApiServerState) {
  const app = express();
  app.use(express.json());
  app.use(express.static(new URL("../../public", import.meta.url).pathname));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, timestampIso: new Date().toISOString() });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      snapshot: state.latestSnapshot(),
      decision: state.latestDecision(),
    });
  });

  app.get("/api/history", (req, res) => {
    const limit = Math.min(500, Number(req.query.limit) || 100);
    res.json({ snapshots: db.recentSnapshots(limit) });
  });

  app.get("/api/alerts", (req, res) => {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    res.json({ alerts: db.recentAlerts(limit) });
  });

  app.post("/api/alerts/:id/ack", (req, res) => {
    db.acknowledgeAlert(req.params.id);
    res.json({ ok: true });
  });

  return app;
}
