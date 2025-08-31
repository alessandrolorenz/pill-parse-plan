import React, { useState, useEffect } from 'react';
import { Download, Calendar, Bell, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

import { TreatmentRecord } from '@/lib/types';
import { eventsToICS } from '@/lib/ics';
import { requestNotificationPermission, scheduleNotifications } from '@/lib/notifications';
import { useTreatments } from '@/hooks/useTreatments';

interface ScheduleViewProps {
  treatmentId: string;
  onBack: () => void;
  onEventsUpdate: (treatmentId: string, completedEvents: Record<string, boolean>) => void;
}

export function ScheduleView({ treatmentId, onBack, onEventsUpdate }: ScheduleViewProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();
  const { getTreatment, getTreatmentProgress } = useTreatments();
  
  const treatment = getTreatment(treatmentId);
  
  if (!treatment) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Tratamento não encontrado.</p>
          <Button onClick={onBack} className="mt-4">Voltar</Button>
        </CardContent>
      </Card>
    );
  }

  const { events, completedEvents } = treatment;
  const progress = getTreatmentProgress(treatment);

  const handleEventToggle = (eventKey: string, completed: boolean) => {
    const updatedCompletedEvents = {
      ...completedEvents,
      [eventKey]: completed
    };
    
    onEventsUpdate(treatmentId, updatedCompletedEvents);
    
    toast({
      title: completed ? 'Dose marcada como tomada' : 'Dose desmarcada',
      description: completed ? 'Parabéns por manter o tratamento em dia!' : 'Dose removida da lista de concluídas',
      variant: 'default'
    });
  };

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
        description: 'O arquivo .ics foi baixado com sucesso.',
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

  // Usar progresso calculado pelo hook
  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Agrupar eventos por data
  const eventsByDate = events.reduce((groups, event) => {
    const date = new Date(event.startISO).toLocaleDateString('pt-BR');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com progresso */}
      <Card className="medical-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl gradient-primary bg-clip-text text-transparent">
                {treatment.plan.planTitle}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {treatment.plan.summary}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Progresso geral */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progresso Geral</span>
                <span className="text-muted-foreground">
                  {progress.completed}/{progress.total} doses ({progressPercentage.toFixed(0)}%)
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-muted"
              />
              {progressPercentage === 100 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Tratamento concluído! 🎉</span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="medical" 
                onClick={handleDownloadICS}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar .ICS
              </Button>

              <Button 
                variant={notificationsEnabled ? "secondary" : "outline"}
                onClick={handleEnableNotifications}
                disabled={notificationsEnabled}
                size="sm"
              >
                <Bell className="h-4 w-4 mr-2" />
                {notificationsEnabled ? 'Notificações Ativas' : 'Ativar Notificações'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de eventos por data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Cronograma de Doses
        </h3>
        
        {Object.entries(eventsByDate).map(([date, dayEvents]) => (
          <Card key={date} className="medical-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{date}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dayEvents
                  .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
                  .map((event, index) => {
                    const eventKey = `${event.startISO}-${event.title}`;
                    const isCompleted = completedEvents[eventKey] === true;
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center gap-3 p-3 bg-background rounded-lg border transition-all duration-200 ${
                          isCompleted 
                            ? 'bg-primary/5 border-primary/20 opacity-75' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={(checked) => handleEventToggle(eventKey, checked as boolean)}
                          className="flex-shrink-0"
                        />
                        
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${
                            isCompleted ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {event.title}
                          </div>
                          {event.description && (
                            <div className={`text-xs ${
                              isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {event.description}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.startISO).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}