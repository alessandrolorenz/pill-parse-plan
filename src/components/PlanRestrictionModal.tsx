import React from 'react';
import { Crown, Lock, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlanRestrictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restrictionType: 'maxTreatments' | 'advancedAnalysis' | 'cloudStorage';
  onUpgrade: () => void;
}

const restrictionContent = {
  maxTreatments: {
    title: 'Limite de Tratamentos Atingido',
    description: 'Você já possui 1 tratamento ativo no plano gratuito.',
    icon: Lock,
    benefits: [
      'Tratamentos ilimitados',
      'Análise avançada com IA',
      'Sincronização em nuvem',
      'Exportação de calendários'
    ]
  },
  advancedAnalysis: {
    title: 'Análise Avançada Premium',
    description: 'A análise detalhada com IA está disponível apenas no plano Premium.',
    icon: Crown,
    benefits: [
      'Análise detalhada de receitas',
      'Extração completa de dados',
      'Dosagens e frequências precisas',
      'Observações médicas detalhadas'
    ]
  },
  cloudStorage: {
    title: 'Armazenamento em Nuvem',
    description: 'Sincronização e backup automático disponível apenas no Premium.',
    icon: Crown,
    benefits: [
      'Backup automático em nuvem',
      'Sincronização entre dispositivos',
      'Histórico completo de tratamentos',
      'Recuperação de dados'
    ]
  }
};

export function PlanRestrictionModal({
  open,
  onOpenChange,
  restrictionType,
  onUpgrade
}: PlanRestrictionModalProps) {
  const content = restrictionContent[restrictionType];
  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-5 w-5 text-yellow-500" />
            <DialogTitle>{content.title}</DialogTitle>
          </div>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">Desbloqueie com Premium</span>
              <Badge variant="secondary" className="text-xs">R$ 2,90/mês</Badge>
            </div>
            
            <ul className="space-y-2 text-sm">
              {content.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Continuar Gratuito
            </Button>
            <Button
              onClick={onUpgrade}
              className="flex-1"
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}