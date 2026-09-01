/**
 * @pill-parse/core — platform-agnostic domain layer.
 *
 * Nothing in this package may import a browser, Node, or React Native API.
 * It is consumed verbatim by the web app today and by the React Native app
 * later; see _plans/rn-migration-sdd-guide.md.
 *
 * Also keep this package free of `Intl` / `toLocale*`. Hermes (React Native's
 * engine) delegates those to platform ICU on Android, so locale output can
 * differ by device — which would break behavioral parity in a way no Node-based
 * test run would catch. `formatEventForDisplay` was removed for exactly this
 * reason; recover it from git if RN needs it, with ICU-tolerant assertions.
 */

export type {
  TreatmentItem,
  TreatmentPlan,
  CalendarEvent,
  TreatmentRecord,
  AppConfig,
} from './types';

export { expandPlanToEvents } from './scheduler';
