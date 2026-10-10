/**
 * Self-contained copy of the dew-point estimate from the main web app's
 * lib/physics/water.ts (Magnus-Tetens approximation). Duplicated rather
 * than imported because this gateway is a separately deployed package
 * with its own build/runtime target — see Software/03-Gateway-Software/README.md.
 */
export function estimateDewPointC(temperatureC: number, relativeHumidityPct: number): number {
  const rh = Math.min(100, Math.max(0.1, relativeHumidityPct));
  const a = 17.62;
  const b = 243.12;
  const alpha = Math.log(rh / 100) + (a * temperatureC) / (b + temperatureC);
  return (b * alpha) / (a - alpha);
}
