import ModbusRTU from "modbus-serial";
import type { GatewayConfig } from "../config.js";
import type { PlcStatus, PlcAdvisoryRequest } from "../types.js";
import { parsePlcStatus, buildAdvisoryWrites } from "./parse.js";

const DISCRETE_INPUT_COUNT = 12;
const INPUT_REGISTER_COUNT = 8;

export class PlcClient {
  private client = new ModbusRTU();
  private connected = false;

  constructor(private config: GatewayConfig) {}

  async connect(): Promise<void> {
    if (this.config.MODBUS_SERIAL_PATH) {
      await this.client.connectRTUBuffered(this.config.MODBUS_SERIAL_PATH, {
        baudRate: this.config.MODBUS_SERIAL_BAUD,
      });
    } else {
      // `timeout` bounds the TCP connect attempt itself — without it, an unreachable
      // (not actively refused) PLC host can hang far longer than our poll interval,
      // which must never block the gateway's HTTP API or poll loop from starting.
      await this.client.connectTCP(this.config.MODBUS_PLC_HOST, {
        port: this.config.MODBUS_PLC_PORT,
        timeout: 3000,
      });
    }
    this.client.setID(this.config.MODBUS_PLC_UNIT_ID);
    this.client.setTimeout(3000);
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Exposes the underlying connection so other Modbus devices sharing the same bus/gateway (e.g. energy meters) can reuse it instead of opening a second transport. */
  getRawClient(): ModbusRTU {
    return this.client;
  }

  async readStatus(): Promise<PlcStatus> {
    // Re-assert our unit ID in case another device sharing this transport (e.g. an
    // energy meter via getRawClient()) changed it since our last call.
    this.client.setID(this.config.MODBUS_PLC_UNIT_ID);
    const discreteResult = await this.client.readDiscreteInputs(0, DISCRETE_INPUT_COUNT);
    const inputRegResult = await this.client.readInputRegisters(0, INPUT_REGISTER_COUNT);
    return parsePlcStatus(discreteResult.data, inputRegResult.data);
  }

  /** Writes advisory requests only — see Software/04-PLC-Control-Specification/INTERLOCK_SPEC.md for what the PLC must do with these. */
  async writeAdvisory(request: PlcAdvisoryRequest): Promise<void> {
    this.client.setID(this.config.MODBUS_PLC_UNIT_ID);
    const plan = buildAdvisoryWrites(request);
    for (const coil of plan.coils) {
      await this.client.writeCoil(coil.address, coil.value);
    }
    for (const reg of plan.holdingRegisters) {
      await this.client.writeRegister(reg.address, reg.value);
    }
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.client.close(() => resolve()));
    this.connected = false;
  }
}
