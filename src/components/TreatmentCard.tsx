import React from 'react';
import { Clock, Calendar, CheckCircle2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreatmentRecord } from '@/lib/types';

interface TreatmentCardProps {
  treatment: TreatmentRecord;
  progress: { completed: number; total: number };
  nextEvent: any;
  onViewDetails: (treatmentId: string) => void;
}

export function TreatmentCard({ treatment, progress, nextEvent, onViewDetails }: TreatmentCardProps) {
  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  
  const formatNextEvent = (event: any) => {
    if (!event) return 'Nenhum próximo evento';
    
    const date = new Date(event.startISO);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateStr;
    if (isToday) {
      dateStr = 'Hoje';
    } else if (isTomorrow) {
      dateStr = 'Amanhã';
    } else {
      dateStr = date.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
    
    const timeStr = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${dateStr} às ${timeStr}`;
  };

  return (
    <Card className="medical-card group hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {treatment.plan.planTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {treatment.plan.summary}
            </p>
          </div>
          <Badge 
            variant={treatment.status === 'active' ? 'default' : 'secondary'}
            className="ml-2 flex-shrink-0"
          >
            {treatment.status === 'active' ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Concluído
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {progress.completed}/{progress.total} doses
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progressPercentage.toFixed(0)}% concluído
          </p>
        </div>

        {/* Next Event */}
        {treatment.status === 'active' && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Próxima dose</p>
              <p className="text-xs text-muted-foreground">
                {formatNextEvent(nextEvent)}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="medical"
            size="sm"
            onClick={() => onViewDetails(treatment.id)}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver agenda
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}