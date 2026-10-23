import React from 'react';
import { Pressable, View, Text, PressableProps } from 'react-native';
import { clsx } from 'clsx';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={clsx(
        "flex-row items-center min-h-[44px] py-1",
        disabled && "opacity-50",
        className
      )}
    >
      <View
        className={clsx(
          "w-6 h-6 rounded-md border items-center justify-center",
          checked
            ? "bg-primary border-primary"
            : "bg-card border-border active:border-primary/50"
        )}
      >
        {checked && (
          <Text className="text-white text-xs font-bold leading-none">✓</Text>
        )}
      </View>
      {label && (
        <Text
          className={clsx(
            "ml-3 text-base text-foreground font-medium",
            checked && "line-through text-muted-foreground"
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};
