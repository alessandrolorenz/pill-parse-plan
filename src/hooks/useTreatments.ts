import { useState, useEffect } from 'react';
import { TreatmentRecord, TreatmentPlan, CalendarEvent } from '@/lib/types';
import { expandPlanToEvents } from '@/lib/scheduler';

const STORAGE_KEY = 'medicationApp_treatments';

export function useTreatments() {
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);

  // Load treatments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const treatmentsWithDates = parsed.map((t: any) => ({
          ...t,
          startDateTime: new Date(t.startDateTime),
          createdAt: new Date(t.createdAt),
          events: t.events.map((e: any) => ({
            ...e,
            startISO: new Date(e.startISO).toISOString(),
            endISO: e.endISO ? new Date(e.endISO).toISOString() : undefined
          }))
        }));
        setTreatments(treatmentsWithDates);
      } catch (error) {
        console.error('Error loading treatments:', error);
      }
    }
  }, []);

  // Save treatments to localStorage
  const saveTreatments = (newTreatments: TreatmentRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTreatments));
    setTreatments(newTreatments);
  };

  const addTreatment = (plan: TreatmentPlan, startDateTime: Date): string => {
    const id = `treatment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const events = expandPlanToEvents(plan, startDateTime);
    
    const newTreatment: TreatmentRecord = {
      id,
      plan,
      events,
      startDateTime,
      createdAt: new Date(),
      status: 'active',
      completedEvents: {}
    };

    const newTreatments = [...treatments, newTreatment];
    saveTreatments(newTreatments);
    return id;
  };

  const updateTreatmentEvents = (treatmentId: string, completedEvents: Record<string, boolean>) => {
    const newTreatments = treatments.map(treatment => {
      if (treatment.id === treatmentId) {
        // Check if all events are completed
        const allCompleted = treatment.events.every(event => 
          completedEvents[`${event.startISO}-${event.title}`] === true
        );
        
        return {
          ...treatment,
          completedEvents,
          status: allCompleted ? 'completed' as const : 'active' as const
        };
      }
      return treatment;
    });
    saveTreatments(newTreatments);
  };

  const getTreatment = (treatmentId: string) => {
    return treatments.find(t => t.id === treatmentId);
  };

  const getActiveTreatments = () => {
    return treatments.filter(t => t.status === 'active');
  };

  const getCompletedTreatments = () => {
    return treatments.filter(t => t.status === 'completed');
  };

  const getTreatmentProgress = (treatment: TreatmentRecord) => {
    const totalEvents = treatment.events.length;
    const completedCount = Object.values(treatment.completedEvents).filter(Boolean).length;
    return { completed: completedCount, total: totalEvents };
  };

  const getNextEvent = (treatment: TreatmentRecord) => {
    const now = new Date();
    const upcomingEvents = treatment.events
      .filter(event => {
        const eventDate = new Date(event.startISO);
        const eventKey = `${event.startISO}-${event.title}`;
        return eventDate >= now && !treatment.completedEvents[eventKey];
      })
      .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
    
    return upcomingEvents[0] || null;
  };

  return {
    treatments,
    addTreatment,
    updateTreatmentEvents,
    getTreatment,
    getActiveTreatments,
    getCompletedTreatments,
    getTreatmentProgress,
    getNextEvent
  };
}