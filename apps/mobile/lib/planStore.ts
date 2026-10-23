import { TreatmentPlan } from '@pill-parse-plan/core';

interface DraftPlanState {
  plan: TreatmentPlan | null;
  imageBase64: string | null;
  startDateTime: Date;
}

let draftState: DraftPlanState = {
  plan: null,
  imageBase64: null,
  startDateTime: new Date(),
};

const listeners = new Set<() => void>();

export const planStore = {
  getState: () => draftState,
  setDraftPlan: (plan: TreatmentPlan, imageBase64?: string | null) => {
    draftState = {
      ...draftState,
      plan,
      imageBase64: imageBase64 ?? draftState.imageBase64,
      startDateTime: new Date(),
    };
    listeners.forEach((l) => l());
  },
  setStartDateTime: (date: Date) => {
    draftState = {
      ...draftState,
      startDateTime: date,
    };
    listeners.forEach((l) => l());
  },
  clear: () => {
    draftState = {
      plan: null,
      imageBase64: null,
      startDateTime: new Date(),
    };
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
