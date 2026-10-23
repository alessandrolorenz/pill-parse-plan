import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { clsx } from 'clsx';

export const Card: React.FC<ViewProps & { className?: string }> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <View
      className={clsx(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
};

export const CardHeader: React.FC<ViewProps & { className?: string }> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <View className={clsx("flex-col space-y-1.5 pb-3", className)} {...props}>
      {children}
    </View>
  );
};

export const CardTitle: React.FC<TextProps & { className?: string }> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <Text
      className={clsx("text-lg font-bold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
};

export const CardDescription: React.FC<TextProps & { className?: string }> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <Text
      className={clsx("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
};

export const CardContent: React.FC<ViewProps & { className?: string }> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <View className={clsx("pt-0", className)} {...props}>
      {children}
    </View>
  );
};
