import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/Progress';
import { Badge } from '../../../components/ui/badge';
import { EventItem } from '../../../components/ui/EventItem';
import { supabase } from '../../../lib/supabase';
import { scheduleSlidingWindowNotifications, cancelTreatmentNotifications } from '../../../lib/notifications';
import { syncEventsToNativeCalendar } from '../../../lib/calendar';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TreatmentDetail {
  id: string;
  title: string;
  notes: string | null;
  status: string | null;
}

interface DoseEvent {
  id: string;
  treatment_id: string;
  date: string;
  time: string;
  label: string;
  done: boolean | null;
}

interface DateSection {
  title: string;
  date: string;
  data: DoseEvent[];
}

export default function TreatmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [treatment, setTreatment] = useState<TreatmentDetail | null>(null);
  const [sections, setSections] = useState<DateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [doneEvents, setDoneEvents] = useState(0);
  const [isUpdatingTreatment, setIsUpdatingTreatment] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Buscar detalhes do tratamento
      const { data: treatmentData, error: treatmentError } = await supabase
        .from('treatments')
        .select('*')
        .eq('id', id)
        .single();

      if (treatmentError) throw treatmentError;
      setTreatment(treatmentData);

      // 2. Buscar eventos/doses
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('treatment_id', id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (eventsError) throw eventsError;

      const events: DoseEvent[] = eventsData || [];
      setTotalEvents(events.length);
      const completedCount = events.filter((e) => e.done).length;
      setDoneEvents(completedCount);

      // Agrupar eventos por data
      const grouped: Record<string, DoseEvent[]> = {};
      events.forEach((ev) => {
        if (!grouped[ev.date]) {
          grouped[ev.date] = [];
        }
        grouped[ev.date].push(ev);
      });

      const formattedSections: DateSection[] = Object.keys(grouped).map((dateStr) => {
        let title = dateStr;
        try {
          const parsedDate = parseISO(`${dateStr}T12:00:00`);
          if (isToday(parsedDate)) {
            title = `Hoje - ${format(parsedDate, "dd 'de' MMMM", { locale: ptBR })}`;
          } else if (isTomorrow(parsedDate)) {
            title = `Amanhã - ${format(parsedDate, "dd 'de' MMMM", { locale: ptBR })}`;
          } else {
            title = format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
            title = title.charAt(0).toUpperCase() + title.slice(1);
          }
        } catch {
          title = dateStr;
        }

        return {
          title,
          date: dateStr,
          data: grouped[dateStr],
        };
      });

      setSections(formattedSections);
    } catch (err: any) {
      console.error('Erro ao carregar agenda:', err);
      Alert.alert('Erro', err.message || 'Não foi possível carregar a agenda de doses.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleEvent = async (eventId: string, currentStatus: boolean | null) => {
    const newStatus = !currentStatus;

    // Atualização otimista
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        data: sec.data.map((item) =>
          item.id === eventId ? { ...item, done: newStatus } : item
        ),
      }))
    );
    setDoneEvents((prev) => (newStatus ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const { error } = await supabase
        .from('events')
        .update({ done: newStatus })
        .eq('id', eventId);

      if (error) throw error;

      // Reagendar janela deslizante de notificações para manter sincronizado
      const allEvents = sections.flatMap((s) => s.data);
      scheduleSlidingWindowNotifications(
        allEvents.map((ev) => ({
          id: ev.id,
          treatmentId: ev.treatment_id,
          label: ev.label,
          startISO: `${ev.date}T${ev.time}`,
          done: ev.id === eventId ? newStatus : ev.done,
        }))
      ).catch(() => {});
    } catch (err: any) {
      Alert.alert('Erro ao atualizar dose', err.message);
      // Reverter em caso de falha
      loadData();
    }
  };

  const setStatus = async (status: 'active' | 'archived') => {
    if (!treatment) return;
    setIsUpdatingTreatment(true);
    try {
      const { error } = await supabase
        .from('treatments')
        .update({ status })
        .eq('id', treatment.id);

      if (error) throw error;

      if (status === 'archived') {
        await cancelTreatmentNotifications(treatment.id);
        router.back();
      } else {
        setTreatment({ ...treatment, status });
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar o tratamento.');
    } finally {
      setIsUpdatingTreatment(false);
    }
  };

  const handleDelete = () => {
    if (!treatment) return;
    Alert.alert(
      'Excluir tratamento?',
      `"${treatment.title}" e todas as suas doses serão apagados permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setIsUpdatingTreatment(true);
            try {
              // Eventos e lembretes são removidos pelo ON DELETE CASCADE
              const { error } = await supabase.from('treatments').delete().eq('id', treatment.id);
              if (error) throw error;
              await cancelTreatmentNotifications(treatment.id);
              router.back();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Não foi possível excluir o tratamento.');
              setIsUpdatingTreatment(false);
            }
          },
        },
      ]
    );
  };

  const handleSyncCalendar = async () => {
    if (!treatment || sections.length === 0) return;
    try {
      const allEvents = sections.flatMap((sec) => sec.data);
      const count = await syncEventsToNativeCalendar(
        treatment.title,
        allEvents.map((ev) => ({
          title: ev.label,
          startISO: `${ev.date}T${ev.time}`,
          notes: treatment.notes || undefined,
        }))
      );
      Alert.alert('Calendário Sincronizado', `${count} doses foram salvas na sua agenda nativa.`);
    } catch (err: any) {
      Alert.alert('Erro ao sincronizar', err.message);
    }
  };

  const handleResyncNotifications = async () => {
    if (!treatment || sections.length === 0) return;
    try {
      const allEvents = sections.flatMap((sec) => sec.data);
      const count = await scheduleSlidingWindowNotifications(
        allEvents.map((ev) => ({
          id: ev.id,
          treatmentId: ev.treatment_id,
          label: ev.label,
          startISO: `${ev.date}T${ev.time}`,
          done: ev.done,
        }))
      );
      Alert.alert('Lembretes Atualizados', `${count} notificações locais agendadas com sucesso.`);
    } catch (err: any) {
      Alert.alert('Erro ao agendar', err.message);
    }
  };

  const progressPercent = totalEvents > 0 ? (doneEvents / totalEvents) * 100 : 0;
  const isActive = treatment?.status === 'active' || !treatment?.status;
  const allDosesDone = totalEvents > 0 && doneEvents === totalEvents;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#106BC6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 py-3">
        {/* Header do Tratamento com Progresso */}
        {treatment && (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-1">
              <CardTitle className="text-xl flex-1 mr-2">{treatment.title}</CardTitle>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Ativo' : 'Arquivado'}
              </Badge>
            </View>

            {treatment.notes && (
              <CardDescription className="mb-3">{treatment.notes}</CardDescription>
            )}

            <View className="space-y-1.5 mt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-muted-foreground">Progresso do Tratamento</Text>
                <Text className="text-xs font-bold text-foreground">
                  {doneEvents} de {totalEvents} doses ({Math.round(progressPercent)}%)
                </Text>
              </View>
              <Progress value={progressPercent} />
            </View>

            <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onPress={handleSyncCalendar}
                className="flex-1 mr-2"
              >
                📅 Salvar na Agenda
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={handleResyncNotifications}
                className="flex-1"
              >
                🔔 Reagendar Alarmes
              </Button>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setStatus(isActive ? 'archived' : 'active')}
                disabled={isUpdatingTreatment}
                className="flex-1 mr-2"
              >
                {isActive ? '🗄️ Arquivar' : '↩️ Reativar'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onPress={handleDelete}
                disabled={isUpdatingTreatment}
                className="flex-1"
              >
                🗑️ Excluir
              </Button>
            </View>
          </Card>
        )}

        {treatment && isActive && allDosesDone && (
          <Card className="mb-4 border-primary">
            <Text className="text-base font-bold text-foreground">Todas as doses foram concluídas 🎉</Text>
            <Text className="text-xs text-muted-foreground mt-1 mb-3">
              Arquive o tratamento para tirá-lo da lista de ativos. Ele continua disponível em Concluídos.
            </Text>
            <Button variant="default" onPress={() => setStatus('archived')} disabled={isUpdatingTreatment}>
              Arquivar tratamento
            </Button>
          </Card>
        )}

        {/* Lista de Doses por Dia */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-background py-2 mt-2">
              <Text className="text-sm font-bold text-primary">{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <EventItem
              id={item.id}
              label={item.label}
              time={item.time.substring(0, 5)}
              done={Boolean(item.done)}
              onToggle={() => handleToggleEvent(item.id, item.done)}
            />
          )}
          ListEmptyComponent={
            <Card className="items-center py-6 mt-4">
              <Text className="text-muted-foreground text-center">
                Nenhum horário de dose gerado para este tratamento.
              </Text>
            </Card>
          }
        />
      </View>
    </SafeAreaView>
  );
}
