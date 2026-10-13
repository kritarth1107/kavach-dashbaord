// Compile-time contract check (plan B1.5): every field the dashboard reads from an engine route must exist in that
// route's contract (lib/engine.gen.ts, generated from kawach-ai-engine contracts/). A field the engine renamed or
// dropped fails `tsc` here instead of blanking a page.
import type { DashHome, DashOverview, DashPortrait } from "./engine.gen";
import type { CareHomeSummary, CareOverview, Portrait } from "./care-memory-api";

type MissingKeys<Mine, Contract> = Exclude<keyof Mine, keyof Contract>;
type ExpectNone<T extends never> = T;

export type HomeKeysExist = ExpectNone<MissingKeys<CareHomeSummary, DashHome>>;
export type OverviewKeysExist = ExpectNone<MissingKeys<CareOverview, DashOverview>>;
export type PortraitKeysExist = ExpectNone<MissingKeys<Portrait, DashPortrait>>;
