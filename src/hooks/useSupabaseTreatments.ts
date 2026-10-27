import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TreatmentPlan, CalendarEvent } from '@/lib/types';
import { expandPlanToEvents, toEventRow } from '@/lib/scheduler';

export interface SupabaseTreatment {
  id: string;
  title: string;
  notes: string | null;
  status: 'active' | 'archived';
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEvent {
  id: string;
  treatment_id: string;
  date: string;
  time: string;
  label: string;
  done: boolean;
  created_at: string;
}

export function useSupabaseTreatments() {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState<SupabaseTreatment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load treatments from Supabase
  const loadTreatments = async () => {
    if (!user) {
      setTreatments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTreatments((data || []) as SupabaseTreatment[]);
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreatments();
  }, [user]);

  const addTreatment = async (
    plan: TreatmentPlan, 
    startDateTime: Date,
    imagePath?: string
  ): Promise<string | null> => {
    if (!user) return null;

    // Generate events first: never create a treatment without doses
    const events = expandPlanToEvents(plan, startDateTime);
    if (events.length === 0) {
      throw new Error('O plano não gerou nenhuma dose. Verifique a duração e a frequência de cada item.');
    }

    try {
      // Insert treatment
      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          user_id: user.id,
          title: plan.planTitle,
          notes: plan.summary,
          status: 'active',
          image_path: imagePath
        })
        .select()
        .single();

      if (treatmentError) throw treatmentError;

      // Insert events (date/time in the user's local time)
      const eventInserts = events.map(event => ({
        treatment_id: treatment.id,
        ...toEventRow(event),
        label: event.title,
        done: false
      }));

      const { error: eventsError } = await supabase
        .from('events')
        .insert(eventInserts);

      if (eventsError) throw eventsError;

      await loadTreatments();
      return treatment.id;
    } catch (error) {
      console.error('Error adding treatment:', error);
      return null;
    }
  };

  const getTreatmentEvents = async (treatmentId: string): Promise<SupabaseEvent[]> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('treatment_id', treatmentId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  };

  // Throws on failure so callers can revert optimistic updates
  const updateEventStatus = async (eventId: string, done: boolean) => {
    const { error } = await supabase
      .from('events')
      .update({ done })
      .eq('id', eventId);

    if (error) throw error;
  };

  const setTreatmentStatus = async (treatmentId: string, status: 'active' | 'archived') => {
    const { error } = await supabase
      .from('treatments')
      .update({ status })
      .eq('id', treatmentId);

    if (error) throw error;
    await loadTreatments();
  };

  // Events and reminders are removed by ON DELETE CASCADE
  const deleteTreatment = async (treatmentId: string) => {
    const imagePath = treatments.find(t => t.id === treatmentId)?.image_path;

    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', treatmentId);

    if (error) throw error;

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from('prescriptions')
        .remove([imagePath]);
      if (storageError) console.error('Error removing prescription image:', storageError);
    }

    await loadTreatments();
  };

  const getActiveTreatments = () => {
    return treatments.filter(t => t.status === 'active');
  };

  const getArchivedTreatments = () => {
    return treatments.filter(t => t.status === 'archived');
  };

  const uploadPrescriptionImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const getPrescriptionImageUrl = async (imagePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('prescriptions')
        .createSignedUrl(imagePath, 3600);

      if (error || !data?.signedUrl) {
        const { data: publicData } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(imagePath);
        return publicData.publicUrl;
      }

      return data.signedUrl;
    } catch {
      const { data } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(imagePath);
      return data.publicUrl;
    }
  };

  return {
    treatments,
    loading,
    addTreatment,
    getTreatmentEvents,
    updateEventStatus,
    setTreatmentStatus,
    deleteTreatment,
    getActiveTreatments,
    getArchivedTreatments,
    uploadPrescriptionImage,
    getPrescriptionImageUrl,
    loadTreatments
  };
}