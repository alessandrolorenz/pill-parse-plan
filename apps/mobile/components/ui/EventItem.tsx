import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { clsx } from 'clsx';
import { Checkbox } from './Checkbox';

export interface EventItemProps {
  id: string;
  label: string;
  time: string;
  done?: boolean;
  onToggle?: (completed: boolean) => void;
  className?: string;
}

export const EventItem: React.FC<EventItemProps> = ({
  id,
  label,
  time,
  done = false,
  onToggle,
  className = '',
}) => {
  return (
    <Pressable
      onPress={() => onToggle?.(!done)}
      className={clsx(
        "flex-row items-center p-3.5 rounded-xl border mb-2.5",
        done
          ? "bg-muted/40 border-border/60"
          : "bg-card border-border active:border-primary/50",
        className
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggle?.(checked)}
      />

      <View className="flex-1 ml-3">
        <Text
          className={clsx(
            "text-base font-semibold text-foreground",
            done && "line-through text-muted-foreground"
          )}
        >
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          🕒 {time}
        </Text>
      </View>
    </Pressable>
  );
};
