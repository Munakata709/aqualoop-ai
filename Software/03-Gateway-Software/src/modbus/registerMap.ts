/**
 * Mirrors Software/04-PLC-Control-Specification/REGISTER_MAP.md exactly. If you change one, change
 * the other — this file and that document are the same contract.
 *
 * Addresses here are 0-based Modbus wire addresses (the spec document uses
 * 1-based "PLC-style" addresses, per convention: wire = spec - 1 within
 * each region).
 */

export const DISCRETE_INPUTS = {
  awgCompressorRunning: 0,
  awgFanRunning: 1,
  waterPumpRunning: 2,
  uvSystemActive: 3,
  uvFault: 4,
  tankHighLevelSwitch: 5,
  generatorRunning: 6,
  generatorFault: 7,
  powerSourceGeneratorActive: 8,
  dispensingTapEnabled: 9,
  eStopActive: 10,
  gasShutoffValveOpen: 11,
} as const;

export const INPUT_REGISTERS = {
  batterySoc: { address: 0, scale: 10 },
  batteryVoltage: { address: 1, scale: 10 },
  solarArrayPower: { address: 2, scale: 100 },
  generatorOutputPower: { address: 3, scale: 100 },
  awgCompressorPower: { address: 4, scale: 100 },
  tankLevel: { address: 5, scale: 10 },
  uvDose: { address: 6, scale: 10 },
  faultCode: { address: 7, scale: 1 },
} as const;

export const COILS = {
  requestAwgRun: 0,
  requestPumpRun: 1,
  disallowGeneratorRequest: 2,
  alarmAcknowledge: 3,
} as const;

export const HOLDING_REGISTERS = {
  heartbeatCounter: 0,
  requestPowerSourcePreference: 1,
} as const;

/** Scaled-integer Modbus register -> physical float, per REGISTER_MAP.md. */
export function unscale(rawValue: number, scale: number): number {
  return rawValue / scale;
}

/** Physical float -> scaled-integer Modbus register, clamped to a 16-bit unsigned range. */
export function scaleForWrite(physicalValue: number, scale: number): number {
  const raw = Math.round(physicalValue * scale);
  return Math.max(0, Math.min(65535, raw));
}
