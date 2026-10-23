import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/Separator';
import { planStore } from '../../../lib/planStore';
import { supabase } from '../../../lib/supabase';
import { expandPlanToEvents } from '../../../../../packages/core/src/scheduler';
import { scheduleSlidingWindowNotifications } from '../../../lib/notifications';
import { syncEventsToNativeCalendar } from '../../../lib/calendar';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useRouter } from 'expo-router';

export default function ReviewPlanScreen() {
  const router = useRouter();
  const { plan, imageBase64, startDateTime: initialStartDateTime } = planStore.getState();
  const [startDateTime, setStartDateTime] = useState<Date>(initialStartDateTime || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [syncWithCalendar, setSyncWithCalendar] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Card className="w-full items-center py-6">
          <CardTitle>Nenhuma receita em revisão</CardTitle>
          <CardDescription className="text-center mt-2">
            Por favor, capture uma receita médica para visualizar os dados.
          </CardDescription>
          <Button
            variant="default"
            onPress={() => router.replace('/(app)/new/upload')}
            className="mt-4"
          >
            Voltar para captura
          </Button>
        </Card>
      </SafeAreaView>
    );
  }

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const updated = new Date(startDateTime);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setStartDateTime(updated);
      planStore.setStartDateTime(updated);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const updated = new Date(startDateTime);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setStartDateTime(updated);
      planStore.setStartDateTime(updated);
    }
  };

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sessão expirada', 'Faça login novamente.');
        router.replace('/(auth)/sign-in');
        return;
      }

      // 1. Inserir tratamento
      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          user_id: user.id,
          title: plan.planTitle,
          notes: plan.summary,
          status: 'active',
        })
        .select()
        .single();

      if (treatmentError) throw treatmentError;

      // 2. Expandir eventos via @pill-parse-plan/core
      const events = expandPlanToEvents(plan, startDateTime);

      // 3. Inserir eventos na tabela
      const eventInserts = events.map((event) => ({
        treatment_id: treatment.id,
        date: event.startISO.split('T')[0],
        time: event.startISO.split('T')[1].split('.')[0],
        label: event.title,
        done: false,
      }));

      const { data: insertedEvents, error: eventsError } = await supabase
        .from('events')
        .insert(eventInserts)
        .select();

      if (eventsError) throw eventsError;

      // 4. Recursos Nativos: Notificações Locais
      if (enableNotifications && insertedEvents) {
        try {
          await scheduleSlidingWindowNotifications(
            insertedEvents.map((ev) => ({
              id: ev.id,
              treatmentId: treatment.id,
              label: ev.label,
              startISO: `${ev.date}T${ev.time}`,
              done: ev.done,
            }))
          );
        } catch (notifErr) {
          console.warn('Não foi possível agendar notificações locais:', notifErr);
        }
      }

      // 5. Recursos Nativos: Sincronização com o Calendário do Sistema
      if (syncWithCalendar) {
        try {
          await syncEventsToNativeCalendar(
            treatment.title,
            events.map((e) => ({
              title: e.title,
              startISO: e.startISO,
              notes: e.description,
            }))
          );
        } catch (calErr) {
          console.warn('Não foi possível sincronizar com o calendário:', calErr);
        }
      }

      planStore.clear();
      Alert.alert('Sucesso!', 'Tratamento e horários agendados com sucesso.');
      router.replace(`/(app)/treatment/${treatment.id}`);
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message || 'Ocorreu um erro ao salvar o tratamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Card do Disclaimer Médico Obrigatório */}
        <Card className="mb-4 bg-warning/10 border-warning/30">
          <Text className="text-warning font-bold text-sm mb-1">⚠️ Aviso Médico Importante</Text>
          <Text className="text-xs text-foreground leading-relaxed">
            Este aplicativo é um organizador e NÃO substitui orientação médica ou farmacêutica.
            Confirme sempre os medicamentos e horários com sua receita original.
          </Text>
        </Card>

        {/* Resumo do Plano */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{plan.planTitle}</CardTitle>
            <CardDescription>{plan.summary}</CardDescription>
          </CardHeader>
        </Card>

        {/* Medicamentos e Cuidados */}
        <Text className="text-lg font-bold text-foreground mb-3">
          Medicamentos Identificados ({plan.items.length})
        </Text>

        {plan.items.map((item, index) => (
          <Card key={index} className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-foreground flex-1 mr-2">
                {item.name}
              </Text>
              <Badge variant={item.type === 'medication' ? 'default' : 'secondary'}>
                {item.type === 'medication' ? 'Medicamento' : 'Cuidado'}
              </Badge>
            </View>

            {item.dose && (
              <Text className="text-sm text-foreground mb-1">
                Dosagem: <Text className="font-semibold">{item.dose} {item.unit || 'mg'}</Text>
              </Text>
            )}

            <Text className="text-sm text-muted-foreground mb-1">
              Frequência: {item.frequency.everyHours
                ? `A cada ${item.frequency.everyHours} horas`
                : `${item.frequency.timesPerDay}x ao dia`}
              {' • '}Duração: {item.durationDays} dias
            </Text>

            {item.notes && (
              <Text className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded-lg">
                Obs: {item.notes}
              </Text>
            )}
          </Card>
        ))}

        <Separator />

        {/* Configuração de Início */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Início do Tratamento</CardTitle>
            <CardDescription>
              Defina quando tomar a primeira dose:
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <View className="flex-row space-x-3">
              <Button
                variant="outline"
                className="flex-1 mr-2"
                onPress={() => setShowDatePicker(true)}
              >
                📅 {startDateTime.toLocaleDateString('pt-BR')}
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setShowTimePicker(true)}
              >
                🕒 {startDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Button>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={startDateTime}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={startDateTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Recursos Nativos: Notificações e Agenda */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Integrações Nativas</CardTitle>
            <CardDescription>
              Configure lembretes e sincronização no seu dispositivo:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Checkbox
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
              label="Ativar lembretes com alarme no celular"
            />
            <Checkbox
              checked={syncWithCalendar}
              onCheckedChange={setSyncWithCalendar}
              label="Sincronizar horários no calendário do celular"
            />
          </CardContent>
        </Card>

        {/* Botão de Confirmação */}
        <Button
          variant="default"
          size="lg"
          onPress={handleConfirmAndSave}
          disabled={isSaving}
          className="mb-8"
        >
          {isSaving ? 'Salvando Tratamento...' : 'Confirmar e Iniciar Tratamento'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
