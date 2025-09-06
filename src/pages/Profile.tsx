import React, { useState, useEffect } from 'react';
import { User, Crown, Mail, Calendar, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  provider: string;
  active_subscription: boolean;
  created_at: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        // Se o perfil não existe, criar um
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.name || null,
            email: user.email,
            provider: user.app_metadata?.provider || 'email',
            active_subscription: false
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          // Recarregar o perfil após criar
          loadProfile();
          return;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubscription = () => {
    // Mock - aqui seria integrado com sistema de pagamento
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Sistema de pagamento será implementado em breve.',
      variant: 'default'
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold">Meu Perfil</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          
          {/* Informações do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {profile?.name || 'Usuário'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile?.email || user.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {profile?.provider === 'google' ? 'Google' : 'Email'}
                    </Badge>
                    <Badge 
                      variant={profile?.active_subscription ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {profile?.active_subscription && <Crown className="h-3 w-3" />}
                      {profile?.active_subscription ? 'Premium' : 'Gratuito'}
                    </Badge>
                  </div>
                </div>
              </div>

              {profile?.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Calendar className="h-4 w-4" />
                  Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status da Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Plano de Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.active_subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold">Plano Premium Ativo</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <ul className="space-y-1">
                      <li>✓ Tratamentos ilimitados</li>
                      <li>✓ Análise avançada de receitas</li>
                      <li>✓ Sincronização em nuvem</li>
                      <li>✓ Suporte prioritário</li>
                    </ul>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Assinatura
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Plano Gratuito</h3>
                    <div className="text-sm text-muted-foreground mb-4">
                      <ul className="space-y-1">
                        <li>• Até 3 tratamentos por mês</li>
                        <li>• Análise básica de receitas</li>
                        <li>• Armazenamento local</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Upgrade para Premium
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Desbloqueie todos os recursos e gerencie quantos tratamentos precisar.
                    </p>
                    <Button 
                      onClick={handleActivateSubscription}
                      className="w-full"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Ativar Premium - R$ 9,90/mês
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Preferências de Notificação
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Editar Informações
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-600">
                  Excluir Conta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suporte */}
          <Card>
            <CardHeader>
              <CardTitle>Precisa de Ajuda?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Nossa equipe está sempre disponível para ajudar você a aproveitar ao máximo o Pills Planner.
              </p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  Central de Ajuda
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Contatar Suporte
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}