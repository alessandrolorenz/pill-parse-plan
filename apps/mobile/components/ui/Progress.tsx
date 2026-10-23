import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';

export interface ProgressProps extends ViewProps {
  value: number; // 0 to 100
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  className = '',
  indicatorClassName = '',
  ...props
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <View
      className={clsx(
        "h-2.5 w-full bg-muted rounded-full overflow-hidden",
        className
      )}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clampedValue }}
      {...props}
    >
      <View
        className={clsx(
          "h-full bg-primary rounded-full",
          indicatorClassName
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </View>
  );
};
