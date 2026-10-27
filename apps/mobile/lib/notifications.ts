import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function getNotifications(): any {
  if (isExpoGo && Platform.OS === 'android') {
    return null;
  }
  try {
    const mod = require('expo-notifications');
    return mod?.default || mod;
  } catch {
    return null;
  }
}

export const NOTIFICATION_CATEGORY_DOSE = 'MEDICATION_DOSE';
export const MAX_PENDING_NOTIFICATIONS = 50;

export interface DoseNotificationItem {
  id: string;
  treatmentId: string;
  label: string;
  startISO: string;
  done?: boolean | null;
}

/**
 * Solicita permissão para notificações e configura canais no Android
 */
export async function setupNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    // Configurar handler sob demanda com proteção
    try {
      if (typeof Notifications.setNotificationHandler === 'function') {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }
    } catch {
      // Ignorar se não suportado no ambiente atual
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Canal no Android com alta prioridade para sobreviver ao Doze mode
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medications', {
        name: 'Lembretes de Medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#106BC6',
        sound: 'default',
      });
    }

    // Configurar ações interativas da notificação ("Tomei" e "Adiar 15 min")
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_DOSE, [
      {
        identifier: 'TAKE_DOSE',
        buttonTitle: '✓ Tomei',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'SNOOZE_15',
        buttonTitle: '⏱ Adiar 15 min',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    return true;
  } catch (err) {
    console.warn('Erro ao configurar notificações:', err);
    return false;
  }
}

/**
 * Agenda notificações com algoritmo de Janela Deslizante (teto de 50 no iOS e Android)
 */
export async function scheduleSlidingWindowNotifications(
  events: DoseNotificationItem[]
): Promise<number> {
  const now = new Date();

  // Filtrar eventos futuros não concluídos e ordenar cronologicamente
  const upcomingEvents = events
    .filter((e) => !e.done && new Date(e.startISO) > now)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
    .slice(0, MAX_PENDING_NOTIFICATIONS);

  if (upcomingEvents.length === 0) {
    return 0;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    console.log(`[Expo Go] ${upcomingEvents.length} notificações locais calculadas na janela deslizante.`);
    return upcomingEvents.length;
  }

  const hasPermission = await setupNotificationPermissions();
  if (!hasPermission) return 0;

  try {
    // Limpar notificações agendadas anteriores para evitar duplicações
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduledCount = 0;
    for (const event of upcomingEvents) {
      const triggerDate = new Date(event.startISO);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora do Medicamento',
          body: event.label,
          sound: 'default',
          categoryIdentifier: NOTIFICATION_CATEGORY_DOSE,
          data: {
            eventId: event.id,
            treatmentId: event.treatmentId,
            startISO: event.startISO,
          },
        },
        trigger: triggerDate,
      });
      scheduledCount++;
    }

    return scheduledCount;
  } catch (err) {
    console.warn('Erro ao agendar notificações:', err);
    return 0;
  }
}

/**
 * Cancela apenas as notificações de um tratamento (ao arquivar ou excluir), preservando as dos demais
 */
export async function cancelTreatmentNotifications(treatmentId: string): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (n: any) => n.content?.data?.treatmentId === treatmentId
    );
    for (const n of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    return toCancel.length;
  } catch (err) {
    console.warn('Erro ao cancelar notificações do tratamento:', err);
    return 0;
  }
}

/**
 * Listener para respostas de ações na notificação (Tomei / Adiar)
 */
export function registerNotificationResponseListener() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { remove: () => {} };
  }

  try {
    return Notifications.addNotificationResponseReceivedListener(async (response: any) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as {
        eventId?: string;
        treatmentId?: string;
        startISO?: string;
      };

      if (actionId === 'TAKE_DOSE' && data?.eventId) {
        // Marcar dose como tomada no Supabase
        try {
          await supabase
            .from('events')
            .update({ done: true })
            .eq('id', data.eventId);
        } catch (err) {
          console.error('Erro ao marcar dose via notificação:', err);
        }
      } else if (actionId === 'SNOOZE_15') {
        // Adiar por 15 minutos
        const snoozeDate = new Date(Date.now() + 15 * 60 * 1000);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Lembrete Adiado: Hora do Medicamento',
            body: response.notification.request.content.body || 'Tome seu medicamento',
            sound: 'default',
            categoryIdentifier: NOTIFICATION_CATEGORY_DOSE,
            data,
          },
          trigger: snoozeDate,
        });
      }
    });
  } catch (err) {
    console.warn('Erro ao registrar listener de notificação:', err);
    return { remove: () => {} };
  }
}
