import React, { useState, useEffect } from 'react';
import { Pill, AlertTriangle, Loader2, Plus, Calendar, Activity, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import { ImagePicker } from '@/components/ImagePicker';
import { PlanReview } from '@/components/PlanReview';
import { SupabaseScheduleView } from '@/components/SupabaseScheduleView';
import { TreatmentCard } from '@/components/TreatmentCard';

import { TreatmentPlan, AppConfig } from '@/lib/types';
import { extractPlanFromImage } from '@/lib/openai';
import { useSupabaseTreatments } from '@/hooks/useSupabaseTreatments';

type AppStep = 'home' | 'upload' | 'review' | 'schedule';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<AppStep>('home');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [userNotes, setUserNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [startDateTime, setStartDateTime] = useState<Date>(new Date());
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('');
  const [serverConfigured, setServerConfigured] = useState<boolean>(true);
  const [imagePath, setImagePath] = useState<string>('');
  const { toast } = useToast();
  
  const {
    treatments,
    loading: treatmentsLoading,
    addTreatment,
    getActiveTreatments,
    getArchivedTreatments,
    uploadPrescriptionImage
  } = useSupabaseTreatments();

  // Verificar autenticação
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
      // Validar formato da imagem base64
      if (!selectedImage.includes(',')) {
        throw new Error('Formato de imagem inválido');
      }
      
      const base64Data = selectedImage.split(',')[1];
      
      if (!base64Data) {
        throw new Error('Dados da imagem não encontrados');
      }

      // Converter base64 para blob de forma mais robusta
      let imageBlob: Blob;
      try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imageBlob = new Blob([bytes], { type: 'image/jpeg' });
      } catch (decodeError) {
        console.error('Erro ao decodificar base64:', decodeError);
        throw new Error('Erro ao processar a imagem selecionada');
      }

      const file = new File([imageBlob], 'prescription.jpg', { type: 'image/jpeg' });
      const uploadedPath = await uploadPrescriptionImage(file);
      
      if (uploadedPath) {
        setImagePath(uploadedPath);
      }

      const plan = await extractPlanFromImage(
        base64Data, 
        userNotes || undefined
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

  const handleGenerateSchedule = async (startDate: Date) => {
    if (!treatmentPlan) return;

    try {
      const treatmentId = await addTreatment(treatmentPlan, startDate, imagePath);
      if (treatmentId) {
        setSelectedTreatmentId(treatmentId);
        setCurrentStep('schedule');
        
        toast({
          title: 'Tratamento criado!',
          description: 'Agenda gerada com sucesso.',
          variant: 'default'
        });
      } else {
        throw new Error('Falha ao criar tratamento');
      }
    } catch (error) {
      console.error('Erro ao criar tratamento:', error);
      toast({
        title: 'Erro na agenda',
        description: 'Não foi possível criar o tratamento.',
        variant: 'destructive'
      });
    }
  };

  const handleClearImage = () => {
    setSelectedImage('');
    setUserNotes('');
    setTreatmentPlan(null);
    setSelectedTreatmentId('');
    setImagePath('');
    setCurrentStep('upload');
  };

  const handleBackToHome = () => {
    handleClearImage();
    setCurrentStep('home');
  };

  const handleViewTreatmentDetails = (treatmentId: string) => {
    setSelectedTreatmentId(treatmentId);
    setCurrentStep('schedule');
  };

  const handleStartNewTreatment = () => {
    handleClearImage();
    setCurrentStep('upload');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }


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
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
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

        {/* Step: Home */}
        {currentStep === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Meus Tratamentos</h2>
                <p className="text-muted-foreground">
                  Gerencie seus tratamentos e acompanhe o progresso
                </p>
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={handleStartNewTreatment}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tratamento
              </Button>
            </div>


            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Ativos ({getActiveTreatments().length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Arquivados ({getArchivedTreatments().length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {treatmentsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </div>
                ) : getActiveTreatments().length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum tratamento ativo</h3>
                      <p className="text-muted-foreground mb-4">
                        Crie seu primeiro tratamento enviando uma foto da receita médica.
                      </p>
                      <Button 
                        variant="default" 
                        onClick={handleStartNewTreatment}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Tratamento
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {getActiveTreatments().map((treatment) => (
                      <Card key={treatment.id} className="p-4">
                        <CardContent className="p-0">
                          <h3 className="font-semibold">{treatment.title}</h3>
                          <p className="text-sm text-muted-foreground">{treatment.notes}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => handleViewTreatmentDetails(treatment.id)}
                          >
                            Ver agenda
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {getArchivedTreatments().length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum tratamento arquivado</h3>
                      <p className="text-muted-foreground">
                        Tratamentos arquivados aparecerão aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {getArchivedTreatments().map((treatment) => (
                      <Card key={treatment.id} className="p-4">
                        <CardContent className="p-0">
                          <h3 className="font-semibold">{treatment.title}</h3>
                          <p className="text-sm text-muted-foreground">{treatment.notes}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => handleViewTreatmentDetails(treatment.id)}
                          >
                            Ver agenda
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step: Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Novo Tratamento</h2>
                <p className="text-muted-foreground">
                  Tire uma foto ou selecione uma imagem da sua receita para análise automática
                </p>
              </div>
              <Button variant="outline" onClick={handleBackToHome}>
                Voltar
              </Button>
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
                  variant="default"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing}
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
              </div>
            )}
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && treatmentPlan && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Revisar Tratamento</h2>
              <Button variant="outline" onClick={handleBackToHome}>
                Voltar ao início
              </Button>
            </div>
            <PlanReview
              plan={treatmentPlan}
              onGenerateSchedule={handleGenerateSchedule}
              startDateTime={startDateTime}
              onStartDateTimeChange={setStartDateTime}
            />
          </div>
        )}

        {/* Step: Schedule */}
        {currentStep === 'schedule' && selectedTreatmentId && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Agenda do Tratamento</h2>
              <Button variant="outline" onClick={handleBackToHome}>
                Voltar ao início
              </Button>
            </div>
        <SupabaseScheduleView 
          treatmentId={selectedTreatmentId}
          onBack={handleBackToHome}
        />
          </div>
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
