import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { clsx } from 'clsx';

export interface BadgeProps extends ViewProps {
  variant?: 'default' | 'secondary' | 'outline' | 'warning' | 'destructive';
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  textClassName = '',
  ...props
}) => {
  const variantBgClasses = {
    default: "bg-primary/10 border-primary/20",
    secondary: "bg-secondary/10 border-secondary/20",
    outline: "bg-transparent border-border",
    warning: "bg-warning/10 border-warning/20",
    destructive: "bg-destructive/10 border-destructive/20",
  }[variant];

  const variantTextClasses = {
    default: "text-primary font-semibold text-xs",
    secondary: "text-secondary font-semibold text-xs",
    outline: "text-foreground font-semibold text-xs",
    warning: "text-warning font-semibold text-xs",
    destructive: "text-destructive font-semibold text-xs",
  }[variant];

  return (
    <View
      className={clsx(
        "flex-row items-center justify-center rounded-full px-2.5 py-0.5 border self-start",
        variantBgClasses,
        className
      )}
      {...props}
    >
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text className={clsx(variantTextClasses, textClassName)}>
          {children}
        </Text>
      )}
    </View>
  );
};
