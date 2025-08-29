import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TreatmentPlan, TreatmentItem } from '@/lib/types';

interface PlanReviewProps {
  plan: TreatmentPlan;
  onGenerateSchedule: (startDateTime: Date) => void;
  startDateTime: Date;
  onStartDateTimeChange: (dateTime: Date) => void;
}

export const PlanReview: React.FC<PlanReviewProps> = ({
  plan,
  onGenerateSchedule,
  startDateTime,
  onStartDateTimeChange
}) => {
  const [showJson, setShowJson] = useState(false);

  const formatFrequency = (item: TreatmentItem) => {
    if (item.frequency.everyHours) {
      return `A cada ${item.frequency.everyHours} horas`;
    }
    if (item.frequency.timesPerDay) {
      return `${item.frequency.timesPerDay}x por dia`;
    }
    return 'Frequência não especificada';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'secondary';
    if (confidence >= 0.8) return 'secondary';
    if (confidence >= 0.6) return 'warning';
    return 'destructive';
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="text-xl text-center gradient-primary bg-clip-text text-transparent">
            {plan.planTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            {plan.summary}
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer médico */}
      <Card className="medical-card border-warning">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-warning">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              <strong>Importante:</strong> Este app NÃO substitui orientação médica. 
              Confirme sempre com seu médico antes de iniciar qualquer tratamento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de medicamentos/cuidados */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tratamentos Identificados</h3>
        
        {plan.items.map((item, index) => (
          <Card key={index} className="medical-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={item.type === 'medication' ? 'default' : 'secondary'}>
                      {item.type === 'medication' ? 'Medicamento' : 'Cuidado'}
                    </Badge>
                    {item.confidence && (
                      <Badge variant={getConfidenceColor(item.confidence)}>
                        {Math.round(item.confidence * 100)}% confiança
                      </Badge>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-lg">
                    {item.name}
                    {item.dose && item.unit && (
                      <span className="text-muted-foreground ml-2">
                        {item.dose}{item.unit}
                      </span>
                    )}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{formatFrequency(item)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{item.durationDays} dias</span>
                </div>
                
                {item.route && (
                  <div className="text-muted-foreground">
                    Via: {item.route}
                  </div>
                )}
              </div>

              {item.preferredTimes && item.preferredTimes.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Horários preferenciais:</p>
                  <p className="text-sm text-muted-foreground">
                    {item.preferredTimes.join(', ')}
                  </p>
                </div>
              )}

              {item.notes && (
                <div className="mt-3 p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm">
                    <strong>Observações:</strong> {item.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data/hora de início */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quando começar o tratamento?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data</label>
              <input
                type="date"
                value={startDateTime.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(startDateTime);
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  newDate.setFullYear(year, month - 1, day);
                  onStartDateTimeChange(newDate);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Horário</label>
              <input
                type="time"
                value={startDateTime.toTimeString().substring(0, 5)}
                onChange={(e) => {
                  const newDate = new Date(startDateTime);
                  const [hours, minutes] = e.target.value.split(':').map(Number);
                  newDate.setHours(hours, minutes);
                  onStartDateTimeChange(newDate);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Primeira dose em: <strong>{formatDateTime(startDateTime)}</strong>
          </div>
        </CardContent>
      </Card>

      {/* JSON técnico (colapsível) */}
      <Collapsible open={showJson} onOpenChange={setShowJson}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full">
            {showJson ? 'Ocultar' : 'Ver'} dados técnicos (JSON)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="medical-card mt-4">
            <CardContent className="pt-6">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(plan, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Botão de gerar agenda */}
      <div className="text-center">
        <Button 
          size="lg" 
          variant="medical"
          onClick={() => onGenerateSchedule(startDateTime)}
          className="w-full md:w-auto"
        >
          Gerar Agenda de Medicamentos
        </Button>
      </div>
    </div>
  );
};