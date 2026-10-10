# AquaLoop AI

**Water From Air. Powered Intelligently.**

An intelligent operating and energy-management platform for atmospheric
water generators (AWGs) — coordinating solar power, battery storage,
natural gas backup, and water production through one platform.

Built by **HACKATHON TEAM 67** for IslanderHack 2026 (Coastal Conservation
/ Green AI track).

## Team

| Name | Role |
|---|---|
| Krish J. Parekh | Project Lead |
| Carlos J. Cabrera | AI Research Specialist |
| Francisco Tejeda-Villarreal | Principal AI Engineer |
| Emiliano S. Cavasos | Software Engineer |

## Problem Statement

Coastal commercial facilities, campuses, emergency-response organizations,
and remote sites depend on municipal freshwater that can be costly,
constrained, or unavailable exactly when it's needed most. Atmospheric
water generation can produce freshwater locally almost anywhere there's
humidity in the air — but it is energy-intensive, and running a fleet of
machines on a fixed schedule regardless of weather or energy source wastes
fuel and battery capacity.

**AquaLoop AI is the coordination layer**: it decides when AWGs should run,
which energy source to draw from, and when production can safely be
deferred — using weather, equipment performance, water demand, and
available energy. It does not manufacture water from nothing and does not
violate thermodynamic limits; it improves scheduling, monitoring, and
coordination of compatible AWG systems.

## Technologies Used

**Web Dashboard Platform** — Next.js (App Router), React, TypeScript,
Tailwind CSS, shadcn/ui, Recharts, Zustand, Vitest, ESLint, and a live
[OpenWeatherMap](https://openweathermap.org/api) integration for real
Corpus Christi conditions.

**Gateway Software** (Raspberry Pi) — Node.js, TypeScript, `modbus-serial`
(Modbus TCP/RTU), `mqtt`, `better-sqlite3`, Express, Zod, Vitest, ESLint.

**Sensor Firmware** (ESP32-S3) — C++, Arduino framework, PlatformIO,
I²C (SHT35), SPI (MAX31865/PT100), OneWire (DS18B20), MQTT.

**PLC Control Specification** — a documented Modbus register map and
interlock behavior spec, implementation-ready for a certified controls
engineer's ladder logic / structured text program.

See [`Software/README.md`](./Software/README.md) for how these four
subsystems fit together, and each subsystem's own README for install/build/
test instructions.

## Challenges We Ran Into

- **Where to draw the safety line.** The hardest design decision wasn't
  technical — it was deciding that the Gateway Software may only ever
  write *advisory* requests to the PLC, never a real actuator command. That
  meant designing a full register map and interlock spec before writing a
  single line of control code, rather than just wiring things up.
- **Avoiding fabricated results.** It would have been easy to hardcode an
  impressive "AI saves 23% energy!" number. Instead, every efficiency claim
  in the platform is computed live from an explicit baseline-vs-optimized
  comparison using the same seed — if the strategy doesn't actually help in
  a given scenario, the UI says so.
- **No hardware in the loop.** This environment had no ESP32 toolchain and
  no physical PLC/AWG to test against, so the firmware is written but
  unverified, and the gateway's Modbus/MQTT logic could only be validated
  with unit tests and a live run against an unreachable PLC (which
  surfaced a real startup-blocking bug we then fixed).
- **Framework churn.** Next.js 16's new Cache Components feature rejected
  non-deterministic values (`new Date()`) during prerendering, and the
  shadcn/ui registry we used is built on Base UI rather than Radix, so
  `asChild` doesn't exist — both cost debugging time before we found the
  right pattern.
- **Scoping a 32-hour build.** The original hardware vision (20 machines,
  full physical deployment) had to be explicitly reframed as a software
  simulation plus a single real prototype, so the team could demo something
  honest and working instead of something half-wired.

## Future Plans

- Get the PLC program written and validated by a certified controls
  engineer against `Software/04-PLC-Control-Specification/`.
- Flash and bench-test the ESP32-S3 firmware against real sensors.
- Stand up the cloud ingestion endpoint so real (measured) telemetry from
  the Gateway Software flows into the same dashboard that currently shows
  simulated data.
- ~~Replace the synthetic weather model with a real forecast API~~ —
  done for display purposes (OpenWeatherMap, live on `/deployment` and
  `/simulation`); still open: feed it into the actual 20-AWG fleet
  simulation and the AI Optimization Center's 24-hour schedule.
- Replace the simplified AWG production curve with a validated
  manufacturer performance table.
- Add a mixed-integer optimization solver as an alternative to the current
  rule-based scheduler, with the UI showing which method produced a given
  schedule.
- Persist scenarios in a real database (SQLite/Prisma) instead of
  in-memory state, and add Playwright/React Testing Library coverage.

Full detail on all of the above: [`Software/01-Web-Dashboard-Platform/ROADMAP.md`](./Software/01-Web-Dashboard-Platform/ROADMAP.md).

---

**Start here: [`Software/`](./Software/)** — the full stack, organized
into four subsystems so it's easy to see what's built, what's tested, and
what still needs real hardware or a certified controls engineer.
