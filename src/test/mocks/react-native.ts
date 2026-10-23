import { vi } from 'vitest';

export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios || obj.default,
};

export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const TextInput = 'TextInput';
export const ScrollView = 'ScrollView';
export const SafeAreaView = 'SafeAreaView';
export const FlatList = 'FlatList';
export const SectionList = 'SectionList';
export const ActivityIndicator = 'ActivityIndicator';
export const Alert = {
  alert: vi.fn(),
};
