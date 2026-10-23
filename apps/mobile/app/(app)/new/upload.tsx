import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { extractPlanFromImageWithClient } from '../../../../../packages/core/src/openai';
import { planStore } from '../../../lib/planStore';
import { useRouter } from 'expo-router';

export default function UploadPrescriptionScreen() {
  const router = useRouter();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar sua receita.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível abrir a câmera.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível selecionar a imagem.');
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      Alert.alert('Atenção', 'Selecione ou fotografe uma receita antes de analisar.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const plan = await extractPlanFromImageWithClient(supabase, imageBase64, notes);
      planStore.setDraftPlan(plan, imageBase64);
      router.push('/(app)/new/review');
    } catch (err: any) {
      Alert.alert(
        'Falha na análise',
        err.message || 'Não foi possível ler a receita. Tente uma foto mais nítida ou com melhor iluminação.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Nova Receita Médica</CardTitle>
            <CardDescription>
              Fotografe a receita ou selecione da galeria para gerar o cronograma automático.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {imageUri ? (
              <View className="items-center">
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-72 rounded-xl border border-border"
                  resizeMode="contain"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setImageUri(null);
                    setImageBase64(null);
                  }}
                  className="mt-2 text-destructive"
                >
                  Remover e escolher outra foto
                </Button>
              </View>
            ) : (
              <View className="space-y-3">
                <Button
                  variant="default"
                  onPress={takePhoto}
                >
                  📷 Tirar Foto da Receita
                </Button>

                <Button
                  variant="outline"
                  onPress={pickImage}
                >
                  🖼️ Escolher da Galeria
                </Button>
              </View>
            )}

            <Input
              label="Observações do Paciente (Opcional)"
              placeholder="Ex: alergia a dipirona, prefiro tomar pela manhã..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              inputClassName="h-20 py-2"
            />

            <Button
              variant="medical"
              size="lg"
              onPress={handleAnalyze}
              disabled={!imageBase64 || isAnalyzing}
              className="mt-2"
            >
              {isAnalyzing ? 'Analisando Receita...' : 'Analisar com Inteligência Artificial'}
            </Button>

            {isAnalyzing && (
              <View className="flex-row items-center justify-center py-3 space-x-2">
                <ActivityIndicator size="small" color="#106BC6" />
                <Text className="text-sm text-primary font-medium ml-2">
                  Extraindo medicamentos e dosagens...
                </Text>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
