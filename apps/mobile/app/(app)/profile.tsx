import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/Separator';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || null);
          const { data } = await supabase
            .from('users')
            .select('active_subscription')
            .eq('user_id', user.id)
            .single();

          setIsPremium(Boolean(data?.active_subscription));
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/sign-in');
    } catch (err: any) {
      Alert.alert('Erro ao sair', err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center justify-between">
              <View>
                <CardTitle>Minha Conta</CardTitle>
                <CardDescription>{email || 'Carregando...'}</CardDescription>
              </View>
              <Badge variant={isPremium ? 'default' : 'secondary'}>
                {isPremium ? 'Plano Premium' : 'Plano Gratuito'}
              </Badge>
            </View>
          </CardHeader>

          <CardContent className="space-y-3">
            <View className="p-3 rounded-xl bg-muted/60">
              <Text className="text-xs text-muted-foreground font-medium">Recursos do seu plano:</Text>
              <Text className="text-sm text-foreground mt-1 font-semibold">
                {isPremium ? '✓ Tratamentos simultâneos ilimitados' : '• 1 tratamento ativo simultâneo'}
              </Text>
              <Text className="text-sm text-foreground mt-0.5">
                ✓ Análise de receitas por IA
              </Text>
              <Text className="text-sm text-foreground mt-0.5">
                ✓ Lembretes locais de doses
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Disclaimer de Saúde */}
        <Card className="mb-5 bg-muted/40 border-border">
          <Text className="text-xs font-bold text-foreground mb-1">
            Termo de Responsabilidade e Saúde
          </Text>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            O Pills Planner é um utilitário pessoal para organização de horários e não emite diagnósticos nem prescreve dosagens.
            Em caso de divergência entre o aplicativo e sua receita impressa ou orientação médica, siga sempre as recomendações do seu médico.
          </Text>
        </Card>

        <Button
          variant="destructive"
          onPress={handleSignOut}
          className="mt-2"
        >
          Sair da Conta
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
