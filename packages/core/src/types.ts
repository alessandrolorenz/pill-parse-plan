export type TreatmentItem = {
  type: "medication" | "care";
  name: string;            // ex: "Amoxicilina"
  dose?: number;           // ex: 500
  unit?: string;           // ex: "mg"
  route?: string;          // ex: "VO"
  frequency: {             // escolha 1 das duas formas
    everyHours?: number;   // ex: 8  (q8h)
    timesPerDay?: number;  // ex: 3  (3x/dia)
  };
  durationDays: number;    // ex: 7
  preferredTimes?: string[]; // ["08:00","16:00","00:00"] (opcional)
  notes?: string;
  confidence?: number;     // 0..1
};

export type TreatmentPlan = {
  planTitle: string;       // ex: "Otite – Amoxicilina"
  summary: string;         // texto curto para humanos
  items: TreatmentItem[];
};

export type CalendarEvent = {
  title: string;           // "Tomar Amoxicilina 500 mg"
  description?: string;    // observações
  startISO: string;        // "2025-09-01T08:00:00-03:00"
  endISO?: string;         // opcional (mesmo que start + 5 min)
};

export type TreatmentRecord = {
  id: string;
  plan: TreatmentPlan;
  events: CalendarEvent[];
  startDateTime: Date;
  createdAt: Date;
  status: 'active' | 'completed';
  completedEvents: Record<string, boolean>; // eventId -> completed
};

export type AppConfig = {
  // Configuration moved to server-side only
};