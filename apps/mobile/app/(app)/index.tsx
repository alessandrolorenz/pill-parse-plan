import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { TreatmentCard } from '../../components/ui/TreatmentCard';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

interface TreatmentWithProgress {
  id: string;
  title: string;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  progressPercent: number;
  nextDose?: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [treatments, setTreatments] = useState<TreatmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTreatments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/(auth)/sign-in');
          return;
        }

        const { data: treatmentsData, error } = await supabase
          .from('treatments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && treatmentsData) {
          // Carregar eventos para cada tratamento para calcular progresso
          const treatmentsWithProgress: TreatmentWithProgress[] = await Promise.all(
            treatmentsData.map(async (t) => {
              const { data: events } = await supabase
                .from('events')
                .select('done, date, time')
                .eq('treatment_id', t.id);

              const total = events?.length || 0;
              const done = events?.filter((e) => e.done).length || 0;
              const progressPercent = total > 0 ? (done / total) * 100 : 0;

              const next = events?.find((e) => !e.done);
              const nextDose = next ? `${next.date.split('-').reverse().slice(0, 2).join('/')} às ${next.time.substring(0, 5)}` : null;

              return {
                ...t,
                progressPercent,
                nextDose,
              };
            })
          );

          setTreatments(treatmentsWithProgress);
        }
      } catch (err) {
        console.error('Erro ao carregar tratamentos:', err);
        router.replace('/(auth)/sign-in');
      } finally {
        setLoading(false);
      }
    }

    loadTreatments();
  }, [router]);

  const filteredTreatments = treatments.filter((t) => {
    if (activeTab === 'active') {
      return t.status === 'active' || !t.status;
    }
    return t.status === 'archived' || t.status === 'completed';
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 py-4">
        {/* Header com Ações */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-bold text-foreground">Meus Tratamentos</Text>
            <Text className="text-xs text-muted-foreground">Acompanhe seus remédios diários</Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <Button
              size="sm"
              variant="default"
              onPress={() => router.push('/(app)/new/upload')}
              className="mr-2"
            >
              + Novo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push('/(app)/profile')}
            >
              👤
            </Button>
          </View>
        </View>

        {/* Abas Ativos / Concluídos */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'active' | 'archived')}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="active">
              Ativos ({treatments.filter((t) => t.status === 'active' || !t.status).length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Concluídos ({treatments.filter((t) => t.status === 'archived' || t.status === 'completed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#106BC6" />
          </View>
        ) : filteredTreatments.length === 0 ? (
          <Card className="items-center py-8 mt-2">
            <CardHeader className="items-center">
              <CardTitle className="text-center">
                {activeTab === 'active' ? 'Nenhum tratamento ativo' : 'Nenhum tratamento concluído'}
              </CardTitle>
              <CardDescription className="text-center mt-1">
                {activeTab === 'active'
                  ? 'Fotografe sua receita para gerar a agenda automática de medicação.'
                  : 'Os tratamentos finalizados aparecerão aqui para histórico.'}
              </CardDescription>
            </CardHeader>
            {activeTab === 'active' && (
              <CardContent className="mt-2">
                <Button
                  variant="medical"
                  onPress={() => router.push('/(app)/new/upload')}
                >
                  📷 Escanear Receita
                </Button>
              </CardContent>
            )}
          </Card>
        ) : (
          <FlatList
            data={filteredTreatments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TreatmentCard
                id={item.id}
                title={item.title}
                summary={item.notes}
                status={item.status || 'active'}
                progressPercent={item.progressPercent}
                nextDose={item.nextDose}
                onPress={() => router.push(`/(app)/treatment/${item.id}`)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
