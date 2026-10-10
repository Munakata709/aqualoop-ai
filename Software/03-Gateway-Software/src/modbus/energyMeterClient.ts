import ModbusRTU from "modbus-serial";
import type { EnergyMeterReading } from "../types.js";

/**
 * Generic reader for an industrial Modbus energy meter (parts list #24).
 *
 * The exact register layout is meter-model-specific and not yet chosen
 * (the parts list marks the generator/meter sizing as "provisional").
 * This reader assumes the common convention of two consecutive 32-bit
 * (2-register) float values — active power and cumulative energy — at a
 * configurable base address. **Verify against the actual meter's Modbus
 * map before trusting these readings**; many meters instead use 16-bit
 * scaled integers like the PLC register map, in which case swap
 * `readFloat32BE` for the scaled-integer approach in `parse.ts`.
 */
export interface EnergyMeterConfig {
  meterId: string;
  unitId: number;
  activePowerRegisterAddress: number;
  cumulativeEnergyRegisterAddress: number;
}

export class EnergyMeterClient {
  constructor(
    private client: ModbusRTU,
    private config: EnergyMeterConfig,
  ) {}

  async read(): Promise<EnergyMeterReading> {
    this.client.setID(this.config.unitId);
    const powerResult = await this.client.readHoldingRegisters(this.config.activePowerRegisterAddress, 2);
    const energyResult = await this.client.readHoldingRegisters(this.config.cumulativeEnergyRegisterAddress, 2);

    return {
      meterId: this.config.meterId,
      activePowerKw: registersToFloat32(powerResult.data) / 1000,
      cumulativeEnergyKwh: registersToFloat32(energyResult.data) / 1000,
    };
  }
}

/** Big-endian 32-bit float from two consecutive 16-bit Modbus registers. */
export function registersToFloat32(registers: number[]): number {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(registers[0] ?? 0, 0);
  buf.writeUInt16BE(registers[1] ?? 0, 2);
  return buf.readFloatBE(0);
}
