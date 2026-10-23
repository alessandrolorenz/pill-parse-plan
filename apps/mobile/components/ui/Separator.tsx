import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';

export interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className = '',
  ...props
}) => {
  return (
    <View
      className={clsx(
        "bg-border",
        orientation === 'horizontal' ? "h-[1px] w-full my-3" : "w-[1px] h-full mx-3",
        className
      )}
      {...props}
    />
  );
};
