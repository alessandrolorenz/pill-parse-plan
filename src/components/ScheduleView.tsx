import React, { useState } from 'react';
import { Calendar, Download, Bell, BellOff, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarEvent } from '@/lib/types';
import { eventsToICS, createGoogleCalendarUrl } from '@/lib/ics';
import { formatEventForDisplay } from '@/lib/scheduler';
import { requestNotificationPermission, scheduleNotifications, showTestNotification } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

interface ScheduleViewProps {
  events: CalendarEvent[];
  onBack: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ events, onBack }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  const handleDownloadICS = () => {
    if (events.length === 0) {
      toast({
        title: 'Nenhum evento',
        description: 'Não há eventos para exportar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      eventsToICS(events);
      toast({
        title: 'Arquivo baixado!',
        description: 'O arquivo .ics foi baixado com sucesso. Importe-o no seu aplicativo de calendário preferido.',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível gerar o arquivo .ics.',
        variant: 'destructive'
      });
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      
      if (granted) {
        scheduleNotifications(events);
        setNotificationsEnabled(true);
        showTestNotification();
        
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá lembretes para seus medicamentos.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Permissão negada',
          description: 'Para receber lembretes, ative as notificações nas configurações do navegador.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro nas notificações',
        description: 'Não foi possível configurar as notificações.',
        variant: 'destructive'
      });
    }
  };

  const handleGoogleCalendar = () => {
    if (events.length === 0) return;
    
    const url = createGoogleCalendarUrl(events);
    if (url) {
      window.open(url, '_blank');
      
      toast({
        title: 'Google Calendar',
        description: 'Para adicionar todos os eventos, baixe o arquivo .ics e importe no Google Calendar.',
        variant: 'default'
      });
    }
  };

  // Agrupar eventos por data
  const eventsByDate = events.reduce((groups, event) => {
    const date = new Date(event.startISO).toLocaleDateString('pt-BR');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const upcomingEvents = events
    .filter(event => new Date(event.startISO) > new Date())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
          Agenda de Medicamentos
        </h2>
      </div>

      {/* Estatísticas */}
      <Card className="medical-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total de eventos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">{upcomingEvents.length}</div>
              <div className="text-sm text-muted-foreground">Próximos 5 eventos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">
                {Object.keys(eventsByDate).length}
              </div>
              <div className="text-sm text-muted-foreground">Dias de tratamento</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações principais */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exportar & Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              variant="medical" 
              onClick={handleDownloadICS}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar .ICS
            </Button>

            <Button 
              variant={notificationsEnabled ? "secondary" : "accent"}
              onClick={handleEnableNotifications}
              disabled={notificationsEnabled}
              className="flex items-center gap-2"
            >
              {notificationsEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  Notificações Ativas
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  Ativar Notificações
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={handleGoogleCalendar}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Google Calendar
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Arquivo .ICS:</strong> Importe em qualquer app de calendário</p>
            <p>• <strong>Notificações:</strong> Lembretes direto no navegador</p>
            <p>• <strong>Google Calendar:</strong> Adiciona o primeiro evento (use .ICS para todos)</p>
          </div>
        </CardContent>
      </Card>

      {/* Próximos eventos */}
      {upcomingEvents.length > 0 && (
        <Card className="medical-card">
          <CardHeader>
            <CardTitle>Próximos Medicamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatEventForDisplay(event)}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {new Date(event.startISO) < new Date(Date.now() + 24 * 60 * 60 * 1000) 
                      ? 'Hoje/Amanhã' 
                      : 'Em breve'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Lista completa de eventos agrupados por data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Cronograma Completo</h3>
        
        {Object.entries(eventsByDate).map(([date, dayEvents]) => (
          <Card key={date} className="medical-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{date}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dayEvents
                  .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
                  .map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <div className="font-medium text-sm">{event.title}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground">{event.description}</div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.startISO).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};