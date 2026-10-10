/**
 * Pure, unit-testable translation between raw Modbus register arrays and
 * typed application data. Kept separate from plcClient.ts (which does the
 * actual I/O) so this logic can be tested without a real PLC.
 */

import { DISCRETE_INPUTS, INPUT_REGISTERS, unscale, scaleForWrite } from "./registerMap.js";
import type { PlcStatus, PlcAdvisoryRequest } from "../types.js";

export function parsePlcStatus(discreteInputs: boolean[], inputRegisters: number[]): PlcStatus {
  const di = (name: keyof typeof DISCRETE_INPUTS) => discreteInputs[DISCRETE_INPUTS[name]] ?? false;
  const ir = (name: keyof typeof INPUT_REGISTERS) => {
    const def = INPUT_REGISTERS[name];
    return unscale(inputRegisters[def.address] ?? 0, def.scale);
  };

  return {
    awgCompressorRunning: di("awgCompressorRunning"),
    awgFanRunning: di("awgFanRunning"),
    waterPumpRunning: di("waterPumpRunning"),
    uvSystemActive: di("uvSystemActive"),
    uvFault: di("uvFault"),
    tankHighLevelSwitch: di("tankHighLevelSwitch"),
    generatorRunning: di("generatorRunning"),
    generatorFault: di("generatorFault"),
    powerSourceGeneratorActive: di("powerSourceGeneratorActive"),
    dispensingTapEnabled: di("dispensingTapEnabled"),
    eStopActive: di("eStopActive"),
    gasShutoffValveOpen: di("gasShutoffValveOpen"),
    batterySocPct: ir("batterySoc"),
    batteryVoltageV: ir("batteryVoltage"),
    solarArrayPowerKw: ir("solarArrayPower"),
    generatorOutputPowerKw: ir("generatorOutputPower"),
    awgCompressorPowerKw: ir("awgCompressorPower"),
    tankLevelPct: ir("tankLevel"),
    uvDoseMjCm2: ir("uvDose"),
    faultCode: ir("faultCode"),
  };
}

export interface AdvisoryWritePlan {
  coils: { address: number; value: boolean }[];
  holdingRegisters: { address: number; value: number }[];
}

export function buildAdvisoryWrites(request: PlcAdvisoryRequest): AdvisoryWritePlan {
  return {
    coils: [
      { address: 0, value: request.requestAwgRun },
      { address: 1, value: request.requestPumpRun },
      { address: 2, value: request.disallowGeneratorRequest },
    ],
    holdingRegisters: [
      { address: 0, value: scaleForWrite(request.heartbeatCounter, 1) },
      { address: 1, value: request.requestPowerSourcePreference },
    ],
  };
}
