/** Telemetry published by the ESP32-S3 sensor node over MQTT. */
export interface SensorTelemetry {
  deviceId: string;
  uptimeMs: number;
  dataSource: "measured";
  air: {
    intakeTemperatureC: number;
    intakeHumidityPct: number;
    enclosureTemperatureC: number;
    enclosureHumidityPct: number;
  };
  refrigeration: {
    evaporatorTemperatureC: number;
    condenserTemperatureC: number;
    referenceTemperatureC: number;
  };
  water: {
    temperatureC: number;
    tdsPpm: number;
    tankLevelPct: number;
    tankHighLevelSwitch: boolean;
    flowRate1LitersPerMin: number;
    flowRate2LitersPerMin: number;
  };
}

/** Status read from the PLC — mirrors Software/04-PLC-Control-Specification/REGISTER_MAP.md exactly. */
export interface PlcStatus {
  // Discrete inputs
  awgCompressorRunning: boolean;
  awgFanRunning: boolean;
  waterPumpRunning: boolean;
  uvSystemActive: boolean;
  uvFault: boolean;
  tankHighLevelSwitch: boolean;
  generatorRunning: boolean;
  generatorFault: boolean;
  powerSourceGeneratorActive: boolean;
  dispensingTapEnabled: boolean;
  eStopActive: boolean;
  gasShutoffValveOpen: boolean;
  // Input registers (already scaled to physical units)
  batterySocPct: number;
  batteryVoltageV: number;
  solarArrayPowerKw: number;
  generatorOutputPowerKw: number;
  awgCompressorPowerKw: number;
  tankLevelPct: number;
  uvDoseMjCm2: number;
  faultCode: number;
}

export interface EnergyMeterReading {
  meterId: string;
  activePowerKw: number;
  cumulativeEnergyKwh: number;
}

/** What the gateway requests from the PLC — advisory only, see INTERLOCK_SPEC.md. */
export interface PlcAdvisoryRequest {
  requestAwgRun: boolean;
  requestPumpRun: boolean;
  disallowGeneratorRequest: boolean;
  requestPowerSourcePreference: 0 | 1 | 2;
  heartbeatCounter: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface GatewayAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  createdAtIso: string;
  acknowledgedAtIso?: string;
}

/** The gateway's merged view of the machine at a point in time. */
export interface MachineSnapshot {
  timestampIso: string;
  sensors: SensorTelemetry | null;
  plc: PlcStatus | null;
  energyMeters: EnergyMeterReading[];
  sensorsStale: boolean;
  plcStale: boolean;
}

export interface DecisionResult {
  request: PlcAdvisoryRequest;
  explanation: string;
  reserveOverrideActive: boolean;
}
