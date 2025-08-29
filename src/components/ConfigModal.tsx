import React, { useState, useEffect } from 'react';
import { Settings, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AppConfig } from '@/lib/types';

interface ConfigModalProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onConfigChange }) => {
  const [tempConfig, setTempConfig] = useState<AppConfig>(config);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleSave = () => {
    onConfigChange(tempConfig);
    setIsOpen(false);
    
    toast({
      title: 'Configurações salvas',
      description: 'As configurações foram atualizadas com sucesso.',
      variant: 'default'
    });
  };

  const hasEnvKey = !!import.meta.env.VITE_OPENAI_API_KEY;
  const hasLocalKey = !!tempConfig.openaiApiKey;

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
              <Key className="h-4 w-4" />
              OpenAI API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="apikey">Chave da API</Label>
                {hasEnvKey && (
                  <Badge variant="secondary">Configurada no .env</Badge>
                )}
                {hasLocalKey && (
                  <Badge variant="warning">Temporária</Badge>
                )}
              </div>
              
              <Input
                id="apikey"
                type="password"
                placeholder={hasEnvKey ? "Chave configurada no .env" : "sk-..."}
                value={tempConfig.openaiApiKey || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, openaiApiKey: e.target.value })}
                disabled={hasEnvKey}
              />
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Esta chave é armazenada <strong>temporariamente</strong> no navegador</p>
                <p>• Para produção, configure VITE_OPENAI_API_KEY no .env</p>
                <p>• Obtenha sua chave em: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline">platform.openai.com</a></p>
              </div>
            </div>

            {!hasEnvKey && !hasLocalKey && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning-foreground">
                  <strong>Chave da API necessária:</strong> Configure sua OpenAI API key para usar o app.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};