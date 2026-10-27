import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, ActivityIndicator, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/Separator';
import { planStore } from '../../../lib/planStore';
import { supabase } from '../../../lib/supabase';
import {
  expandPlanToEvents,
  getPlanSchedulingIssues,
  toEventRow,
  CONTINUOUS_HORIZON_DAYS,
  PlanSchedulingIssue,
} from '../../../../../packages/core/src/scheduler';
import { TreatmentItem, TreatmentPlan } from '../../../../../packages/core/src/types';
import { Input } from '../../../components/ui/Input';
import { scheduleSlidingWindowNotifications } from '../../../lib/notifications';
import { syncEventsToNativeCalendar } from '../../../lib/calendar';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useRouter } from 'expo-router';

type FrequencyMode = 'everyHours' | 'timesPerDay';

export default function ReviewPlanScreen() {
  const router = useRouter();
  const { plan: initialPlan, imageBase64, startDateTime: initialStartDateTime } = planStore.getState();
  const [plan, setPlan] = useState<TreatmentPlan | null>(initialPlan);
  // Campos que vieram faltando continuam editáveis mesmo depois de preenchidos
  const [initialIssues] = useState<PlanSchedulingIssue[]>(() =>
    initialPlan ? getPlanSchedulingIssues(initialPlan) : []
  );
  const [frequencyModes, setFrequencyModes] = useState<Record<number, FrequencyMode>>({});
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

  const issues = getPlanSchedulingIssues(plan);
  const needsInput = (itemIndex: number, field: PlanSchedulingIssue['field']) =>
    [...initialIssues, ...issues].some((i) => i.itemIndex === itemIndex && i.field === field);
  const hasIssue = (itemIndex: number, field: PlanSchedulingIssue['field']) =>
    issues.some((i) => i.itemIndex === itemIndex && i.field === field);

  const updateItem = (itemIndex: number, changes: Partial<TreatmentItem>) => {
    const updated = {
      ...plan,
      items: plan.items.map((item, i) => (i === itemIndex ? { ...item, ...changes } : item)),
    };
    setPlan(updated);
    planStore.updateDraftPlan(updated);
  };

  const parsePositiveInt = (value: string) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  };

  const getFrequencyMode = (itemIndex: number, item: TreatmentItem): FrequencyMode =>
    frequencyModes[itemIndex] ?? (item.frequency?.everyHours ? 'everyHours' : 'timesPerDay');

  const updateFrequency = (itemIndex: number, mode: FrequencyMode, value: number | null) => {
    updateItem(itemIndex, { frequency: value ? { [mode]: value } : {} });
  };

  const formatFrequency = (item: TreatmentItem) => {
    if (item.frequency?.everyHours) return `A cada ${item.frequency.everyHours} horas`;
    if (item.frequency?.timesPerDay) return `${item.frequency.timesPerDay}x ao dia`;
    return 'Não informada';
  };

  const formatDuration = (item: TreatmentItem) => {
    if (item.continuous) return 'Uso contínuo';
    return item.durationDays ? `${item.durationDays} dias` : 'Não informada';
  };

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
    // Expandir eventos antes de gravar: nunca criar tratamento sem doses
    const events = expandPlanToEvents(plan, startDateTime);
    if (events.length === 0) {
      Alert.alert('Plano sem doses', 'Verifique a duração e a frequência de cada medicamento.');
      return;
    }

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

      // 2. Inserir eventos na tabela (data e hora locais do usuário)
      const eventInserts = events.map((event) => ({
        treatment_id: treatment.id,
        ...toEventRow(event),
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
              Frequência: {formatFrequency(item)}
              {' • '}Duração: {formatDuration(item)}
            </Text>

            {(needsInput(index, 'durationDays') || item.continuous) && (
              <View className="mt-2 p-3 rounded-lg border border-warning/30 bg-warning/10">
                {hasIssue(index, 'durationDays') && (
                  <Text className="text-xs font-bold text-warning mb-2">
                    ⚠️ Duração não informada na receita. Informe os dias ou marque uso contínuo.
                  </Text>
                )}
                {!item.continuous && (
                  <Input
                    label="Duração (dias)"
                    keyboardType="number-pad"
                    value={item.durationDays ? String(item.durationDays) : ''}
                    onChangeText={(text) => updateItem(index, { durationDays: parsePositiveInt(text) })}
                    error={hasIssue(index, 'durationDays') ? 'Obrigatório' : undefined}
                  />
                )}
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-sm text-foreground flex-1 mr-2">
                    Uso contínuo (agenda para {CONTINUOUS_HORIZON_DAYS} dias)
                  </Text>
                  <Switch
                    value={!!item.continuous}
                    onValueChange={(value) => updateItem(index, { continuous: value })}
                  />
                </View>
              </View>
            )}

            {needsInput(index, 'frequency') && (
              <View className="mt-2 p-3 rounded-lg border border-warning/30 bg-warning/10">
                {hasIssue(index, 'frequency') && (
                  <Text className="text-xs font-bold text-warning mb-2">
                    ⚠️ Frequência não informada na receita. Confira com seu médico e preencha.
                  </Text>
                )}
                <View className="flex-row mb-2">
                  {(['timesPerDay', 'everyHours'] as FrequencyMode[]).map((mode) => {
                    const selected = getFrequencyMode(index, item) === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => {
                          setFrequencyModes((prev) => ({ ...prev, [index]: mode }));
                          const current = item.frequency?.everyHours ?? item.frequency?.timesPerDay ?? null;
                          updateFrequency(index, mode, current);
                        }}
                        className={`flex-1 py-2 rounded-lg border mr-2 items-center ${
                          selected ? 'bg-primary border-primary' : 'bg-background border-border'
                        }`}
                      >
                        <Text className={selected ? 'text-primary-foreground text-xs font-bold' : 'text-foreground text-xs'}>
                          {mode === 'timesPerDay' ? 'Vezes ao dia' : 'A cada X horas'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Input
                  label={getFrequencyMode(index, item) === 'timesPerDay' ? 'Vezes ao dia' : 'Intervalo (horas)'}
                  keyboardType="number-pad"
                  value={String(item.frequency?.[getFrequencyMode(index, item)] ?? '')}
                  onChangeText={(text) => updateFrequency(index, getFrequencyMode(index, item), parsePositiveInt(text))}
                  error={hasIssue(index, 'frequency') ? 'Obrigatório' : undefined}
                />
              </View>
            )}

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
          disabled={isSaving || issues.length > 0}
          className={issues.length > 0 ? 'mb-2' : 'mb-8'}
        >
          {isSaving ? 'Salvando Tratamento...' : 'Confirmar e Iniciar Tratamento'}
        </Button>
        {issues.length > 0 && (
          <Text className="text-xs text-warning text-center mb-8">
            Preencha os campos destacados para gerar a agenda.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
