import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alemao@alemao.com');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignUp = activeTab === 'signup';

  const handleAuth = async () => {
    console.log('[Auth] Iniciando handleAuth:', { email, isSignUp });
    if (!email || !password) {
      Alert.alert('Campos obrigatórios', 'Por favor, informe seu e-mail e senha.');
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        Alert.alert('Nome obrigatório', 'Por favor, informe seu nome completo para o cadastro.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Senhas diferentes', 'A confirmação de senha não confere com a senha informada.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Senha curta', 'A senha deve conter no mínimo 6 caracteres.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });
        if (error) throw error;

        // Se o Supabase já retornar sessão ativa (confirmação desativada), entra direto
        if (data?.session) {
          Alert.alert('Bem-vindo!', 'Conta criada com sucesso.');
          router.replace('/(app)');
        } else {
          Alert.alert(
            'Conta criada!',
            'Cadastro realizado. Se o e-mail de confirmação estiver ativado no painel, verifique sua caixa de entrada.'
          );
          setActiveTab('signin');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data?.session) {
          router.replace('/(app)');
        }
      }
    } catch (err: any) {
      Alert.alert('Falha na autenticação', err.message || 'Verifique seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <Card className="w-full">
            <CardHeader className="items-center">
              <CardTitle className="text-3xl text-primary text-center">
                Pills Planner
              </CardTitle>
              <CardDescription className="text-center mt-1">
                {isSignUp
                  ? 'Preencha seus dados para começar a organizar suas receitas'
                  : 'Acesse sua conta para visualizar seus tratamentos e doses'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Abas Alternadoras de Modo */}
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as 'signin' | 'signup')}
                className="mb-3"
              >
                <TabsList>
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>
              </Tabs>

              {isSignUp && (
                <Input
                  label="Nome Completo"
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}

              <Input
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Input
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {isSignUp && (
                <Input
                  label="Confirmar Senha"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              )}

              <Button
                variant="default"
                size="lg"
                onPress={handleAuth}
                disabled={loading}
                className="mt-4"
              >
                {loading ? 'Aguarde...' : isSignUp ? 'Concluir Cadastro' : 'Entrar no Aplicativo'}
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
