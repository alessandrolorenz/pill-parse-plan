/**
 * @pill-parse/core — platform-agnostic domain layer.
 *
 * Nothing in this package may import a browser, Node, or React Native API.
 * It is consumed verbatim by the web app today and by the React Native app
 * later; see _plans/rn-migration-sdd-guide.md.
 */

export type {
  TreatmentItem,
  TreatmentPlan,
  CalendarEvent,
  TreatmentRecord,
  AppConfig,
} from './types';

export { expandPlanToEvents, formatEventForDisplay } from './scheduler';
