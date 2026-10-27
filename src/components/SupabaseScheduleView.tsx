import React, { useState, useEffect } from 'react';
import { Calendar, Download, Bell, CheckCircle, Clock, ArrowLeft, Archive, ArchiveRestore, Trash2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseTreatments, SupabaseEvent } from '@/hooks/useSupabaseTreatments';
import { eventsToICS } from '@/lib/ics';
import { requestNotificationPermission, registerPushSubscription, scheduleNotifications } from '@/lib/notifications';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupabaseScheduleViewProps {
  treatmentId: string;
  onBack: () => void;
  onTreatmentChanged: (change: 'archived' | 'reactivated' | 'deleted') => void;
  // Returns false (and shows the plan limit modal) when the user can't have another active treatment
  canReactivate: () => boolean;
}

export function SupabaseScheduleView({ treatmentId, onBack, onTreatmentChanged, canReactivate }: SupabaseScheduleViewProps) {
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isUpdatingTreatment, setIsUpdatingTreatment] = useState(false);
  const { toast } = useToast();
  const { 
    treatments,
    getTreatmentEvents,
    updateEventStatus,
    setTreatmentStatus,
    deleteTreatment
  } = useSupabaseTreatments();

  const treatment = treatments.find(t => t.id === treatmentId);

  useEffect(() => {
    loadEvents();
  }, [treatmentId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const treatmentEvents = await getTreatmentEvents(treatmentId);
      setEvents(treatmentEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os eventos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualização otimista: não recarrega a lista, para não perder a posição do scroll
  const setEventDone = (eventId: string, done: boolean) => {
    setEvents(prev => prev.map(event => (event.id === eventId ? { ...event, done } : event)));
  };

  const handleEventToggle = async (eventId: string, completed: boolean) => {
    setEventDone(eventId, completed);
    try {
      await updateEventStatus(eventId, completed);
    } catch (error) {
      console.error('Error updating event:', error);
      setEventDone(eventId, !completed);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o evento.',
        variant: 'destructive'
      });
    }
  };

  const handleArchive = async () => {
    setIsUpdatingTreatment(true);
    try {
      await setTreatmentStatus(treatmentId, 'archived');
      toast({ title: 'Tratamento arquivado', description: 'Ele está na aba Arquivados.' });
      onTreatmentChanged('archived');
    } catch (error) {
      console.error('Error archiving treatment:', error);
      toast({ title: 'Erro', description: 'Não foi possível arquivar o tratamento.', variant: 'destructive' });
    } finally {
      setIsUpdatingTreatment(false);
    }
  };

  const handleReactivate = async () => {
    if (!canReactivate()) return;
    setIsUpdatingTreatment(true);
    try {
      await setTreatmentStatus(treatmentId, 'active');
      toast({ title: 'Tratamento reativado' });
      onTreatmentChanged('reactivated');
    } catch (error) {
      console.error('Error reactivating treatment:', error);
      toast({ title: 'Erro', description: 'Não foi possível reativar o tratamento.', variant: 'destructive' });
    } finally {
      setIsUpdatingTreatment(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdatingTreatment(true);
    try {
      await deleteTreatment(treatmentId);
      toast({ title: 'Tratamento excluído' });
      onTreatmentChanged('deleted');
    } catch (error) {
      console.error('Error deleting treatment:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o tratamento.', variant: 'destructive' });
      setIsUpdatingTreatment(false);
    }
  };

  const handleDownloadICS = () => {
    if (!treatment || events.length === 0) return;

    // Converter eventos do Supabase para formato CalendarEvent
    const calendarEvents = events.map(event => ({
      title: event.label,
      description: `Tratamento: ${treatment.title}`,
      startISO: `${event.date}T${event.time}`,
      endISO: undefined
    }));

    eventsToICS(calendarEvents, `${treatment.title.replace(/[^a-z0-9]/gi, '_')}.ics`);

    toast({
      title: 'Agenda baixada!',
      description: 'Arquivo .ics salvo. Importe no Google Calendar ou Apple Calendar.',
      variant: 'default'
    });
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();

      if (!granted) {
        toast({
          title: 'Permissão negada',
          description: 'Permita notificações para receber lembretes.',
          variant: 'destructive'
        });
        return;
      }

      // Converter eventos para formato CalendarEvent
      const calendarEvents = events.map(event => ({
        title: event.label,
        description: `Tratamento: ${treatment?.title}`,
        startISO: `${event.date}T${event.time}`,
        endISO: undefined
      }));

      // Registrar subscription e agendar notificações
      await registerPushSubscription();
      await scheduleNotifications(treatmentId, calendarEvents);
      setNotificationsEnabled(true);

      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá lembretes de cada dose.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Erro nas notificações',
        description: 'Não foi possível ativar os lembretes.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando agenda...</p>
        </div>
      </div>
    );
  }

  if (!treatment) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p>Tratamento não encontrado.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calcular progresso
  const completedEvents = events.filter(e => e.done).length;
  const totalEvents = events.length;
  const progressPercentage = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
  const isActive = treatment.status === 'active';
  const allDosesDone = totalEvents > 0 && completedEvents === totalEvents;

  // Agrupar eventos por data
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, SupabaseEvent[]>);

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header do tratamento */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{treatment.title}</CardTitle>
              {treatment.notes && (
                <p className="text-muted-foreground mt-1">{treatment.notes}</p>
              )}
            </div>
            <Badge variant={treatment.status === 'active' ? 'default' : 'secondary'}>
              {treatment.status === 'active' ? 'Ativo' : 'Arquivado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso do Tratamento</span>
                <span className="text-sm text-muted-foreground">
                  {completedEvents} de {totalEvents} concluídos
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadICS}
                disabled={events.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar .ICS
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEnableNotifications}
                disabled={notificationsEnabled || events.length === 0}
              >
                <Bell className="h-4 w-4 mr-2" />
                {notificationsEnabled ? 'Notificações Ativas' : 'Ativar Lembretes'}
              </Button>
              {isActive ? (
                <Button variant="outline" size="sm" onClick={handleArchive} disabled={isUpdatingTreatment}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleReactivate} disabled={isUpdatingTreatment}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Reativar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive" disabled={isUpdatingTreatment}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir tratamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{treatment.title}" e todas as suas doses serão apagados permanentemente. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {isActive && allDosesDone && (
        <Card className="border-primary">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <PartyPopper className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Todas as doses foram concluídas 🎉</p>
              <p className="text-sm text-muted-foreground">
                Arquive o tratamento para liberar espaço na lista de ativos. Ele continua disponível em Arquivados.
              </p>
            </div>
            <Button onClick={handleArchive} disabled={isUpdatingTreatment}>
              <Archive className="h-4 w-4 mr-2" />
              Arquivar tratamento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de eventos por data */}
      <div className="space-y-4">
        {Object.entries(eventsByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dateEvents]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatDateHeader(date)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dateEvents
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          event.done
                            ? 'bg-muted/50 border-muted-foreground/20'
                            : 'bg-background border-border'
                        }`}
                      >
                        <Checkbox
                          id={event.id}
                          checked={event.done}
                          onCheckedChange={(checked) =>
                            handleEventToggle(event.id, !!checked)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              event.done ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {event.label}
                            </span>
                            {event.done && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(`${event.date}T${event.time}`), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">
              Este tratamento não possui eventos agendados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}