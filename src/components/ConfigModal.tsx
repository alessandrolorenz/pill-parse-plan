import React, { useState, useEffect } from 'react';
import { Settings, Info, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AppConfig } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

interface ConfigModalProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'configured' | 'missing'>('checking');
  const { toast } = useToast();

  useEffect(() => {
    checkServerConfiguration();
  }, []);

  const checkServerConfiguration = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('openai-status');
      if (!error && data) {
        setServerStatus(data.configured ? 'configured' : 'missing');
      } else {
        setServerStatus('missing');
      }
    } catch (error) {
      setServerStatus('missing');
    }
  };

  const handleSave = () => {
    setIsOpen(false);
    
    toast({
      title: 'Configurações salvas',
      description: 'As configurações foram atualizadas com sucesso.',
      variant: 'default'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Status do Servidor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">OpenAI API</span>
                {serverStatus === 'checking' && (
                  <Badge variant="secondary">Verificando...</Badge>
                )}
                {serverStatus === 'configured' && (
                  <Badge variant="secondary">✓ Configurada</Badge>
                )}
                {serverStatus === 'missing' && (
                  <Badge variant="warning">⚠ Não configurada</Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                {serverStatus === 'configured' ? (
                  <p>• A chave da OpenAI está configurada no servidor</p>
                ) : (
                  <p>• Configure OPENAI_API_KEY no arquivo .env do servidor</p>
                )}
                <p>• A chave nunca é exposta ao navegador por segurança</p>
                <p>• Todas as chamadas são processadas via proxy interno</p>
              </div>
            </div>

            {serverStatus === 'missing' && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning-foreground">
                  <strong>Configuração necessária:</strong> Configure OPENAI_API_KEY no arquivo .env do servidor para usar o app.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
              <Button onClick={checkServerConfiguration} variant="secondary">
                Verificar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};