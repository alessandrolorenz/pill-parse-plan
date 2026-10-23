import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { clsx } from 'clsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import { Badge } from './badge';
import { Progress } from './Progress';
import { Button } from './button';

export interface TreatmentCardProps {
  id: string;
  title: string;
  summary?: string | null;
  status: 'active' | 'completed' | string;
  progressPercent?: number;
  nextDose?: string | null;
  onPress?: () => void;
  className?: string;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({
  id,
  title,
  summary,
  status,
  progressPercent = 0,
  nextDose,
  onPress,
  className = '',
}) => {
  const isActive = status === 'active';

  return (
    <Card className={clsx("mb-4", className)}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <CardTitle className="text-lg">{title}</CardTitle>
          {summary && (
            <CardDescription className="text-sm mt-1" numberOfLines={2}>
              {summary}
            </CardDescription>
          )}
        </View>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Em andamento' : 'Concluído'}
        </Badge>
      </View>

      <View className="mt-4 space-y-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-muted-foreground">Progresso</Text>
          <Text className="text-xs font-bold text-foreground">{Math.round(progressPercent)}%</Text>
        </View>
        <Progress value={progressPercent} />
      </View>

      {nextDose && (
        <View className="mt-3 p-2.5 rounded-lg bg-muted/60">
          <Text className="text-xs text-muted-foreground">Próxima dose:</Text>
          <Text className="text-sm font-semibold text-foreground">{nextDose}</Text>
        </View>
      )}

      <View className="mt-4 pt-3 border-t border-border flex-row justify-end">
        <Button
          variant="outline"
          size="sm"
          onPress={onPress}
        >
          Ver agenda
        </Button>
      </View>
    </Card>
  );
};
