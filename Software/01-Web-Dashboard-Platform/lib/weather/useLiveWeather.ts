"use client";

import { useEffect, useState } from "react";
import type { LiveWeatherCurrent, LiveWeatherForecastPoint } from "./openWeatherMap";

interface LiveWeatherState {
  current: LiveWeatherCurrent | null;
  forecast: LiveWeatherForecastPoint[];
  loading: boolean;
  error: string | null;
}

/** Calls /api/weather (never the OpenWeatherMap key directly) from the client. */
export function useLiveWeather() {
  const [state, setState] = useState<LiveWeatherState>({ current: null, forecast: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ current: null, forecast: [], loading: false, error: body.error ?? "Live weather unavailable." });
          return;
        }
        setState({ current: body.current, forecast: body.forecast ?? [], loading: false, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ current: null, forecast: [], loading: false, error: "Live weather unavailable." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
