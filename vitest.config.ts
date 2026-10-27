import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Fuso fixo: datas de dose são horário local do usuário (ver toEventRow)
process.env.TZ = 'America/Sao_Paulo';

export default defineConfig({
  plugins: [react()],
  define: {
    __DEV__: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'packages/core/src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './packages/core/src'),
      'expo-notifications': path.resolve(__dirname, './src/test/mocks/expo-notifications.ts'),
      'expo-calendar': path.resolve(__dirname, './src/test/mocks/expo-calendar.ts'),
      'react-native': path.resolve(__dirname, './src/test/mocks/react-native.ts'),
      'expo-constants': path.resolve(__dirname, './src/test/mocks/expo-constants.ts'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, './src/test/mocks/async-storage.ts'),
    },
  },
});
