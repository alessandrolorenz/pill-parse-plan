import React, { useState, useEffect } from 'react';
import { Pill, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { ImagePicker } from '@/components/ImagePicker';
import { PlanReview } from '@/components/PlanReview';
import { ScheduleView } from '@/components/ScheduleView';
import { ConfigModal } from '@/components/ConfigModal';

import { TreatmentPlan, CalendarEvent, AppConfig } from '@/lib/types';
import { extractPlanFromImage } from '@/lib/openai';
import { expandPlanToEvents } from '@/lib/scheduler';

type AppStep = 'upload' | 'review' | 'schedule';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [userNotes, setUserNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [config, setConfig] = useState<AppConfig>({});
  const { toast } = useToast();

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('medicationAppConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Salvar configurações no localStorage
  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('medicationAppConfig', JSON.stringify(newConfig));
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      toast({
        title: 'Imagem necessária',
        description: 'Por favor, selecione uma imagem da receita.',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const plan = await extractPlanFromImage(
        selectedImage, 
        userNotes || undefined,
        config.openaiApiKey
      );
      
      setTreatmentPlan(plan);
      setCurrentStep('review');
      
      toast({
        title: 'Receita analisada!',
        description: 'Revise o plano de tratamento antes de gerar a agenda.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: 'Erro na análise',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSchedule = (startDate: Date) => {
    if (!treatmentPlan) return;

    try {
      const events = expandPlanToEvents(treatmentPlan, startDate);
      setCalendarEvents(events);
      setCurrentStep('schedule');
      
      toast({
        title: 'Agenda gerada!',
        description: `${events.length} eventos criados para seu tratamento.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao gerar agenda:', error);
      toast({
        title: 'Erro na agenda',
        description: 'Não foi possível gerar os eventos.',
        variant: 'destructive'
      });
    }
  };

  const handleClearImage = () => {
    setSelectedImage('');
    setUserNotes('');
    setTreatmentPlan(null);
    setCalendarEvents([]);
    setCurrentStep('upload');
  };

  const handleBackToReview = () => {
    setCurrentStep('review');
  };

  const hasApiKey = !!(import.meta.env.VITE_OPENAI_API_KEY || config.openaiApiKey);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                  Tratamento por Receita
                </h1>
                <p className="text-sm text-muted-foreground">
                  Análise inteligente de prescrições médicas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!hasApiKey && (
                <Badge variant="warning">API Key necessária</Badge>
              )}
              <ConfigModal config={config} onConfigChange={handleConfigChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Disclaimer médico - sempre visível */}
        <Card className="medical-card border-warning mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-warning">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Aviso Legal Importante</p>
                <p className="text-sm text-warning/80">
                  Este aplicativo <strong>NÃO substitui</strong> a orientação médica profissional. 
                  Sempre confirme as informações com seu médico ou farmacêutico antes de iniciar qualquer tratamento.
                  Use apenas como ferramenta auxiliar de organização.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step: Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Carregar Receita Médica</h2>
              <p className="text-muted-foreground">
                Tire uma foto ou selecione uma imagem da sua receita para análise automática
              </p>
            </div>

            <ImagePicker
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
              onClear={handleClearImage}
            />

            {selectedImage && (
              <Card className="medical-card">
                <CardHeader>
                  <CardTitle className="text-lg">Observações Adicionais (Opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Adicione qualquer informação extra que possa ajudar na análise (ex: dificuldade para ler algum texto, informações sobre alergias, etc.)"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            )}

            {selectedImage && (
              <div className="text-center">
                <Button
                  size="lg"
                  variant="medical"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing || !hasApiKey}
                  className="w-full md:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analisando receita...
                    </>
                  ) : (
                    'Analisar Receita'
                  )}
                </Button>
                
                {!hasApiKey && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure sua OpenAI API key nas configurações para continuar
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && treatmentPlan && (
          <PlanReview
            plan={treatmentPlan}
            onGenerateSchedule={handleGenerateSchedule}
            startDateTime={startDateTime}
            onStartDateTimeChange={setStartDateTime}
          />
        )}

        {/* Step: Schedule */}
        {currentStep === 'schedule' && calendarEvents.length > 0 && (
          <ScheduleView
            events={calendarEvents}
            onBack={handleBackToReview}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Tratamento por Receita - MVP v1.0 | Powered by OpenAI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
