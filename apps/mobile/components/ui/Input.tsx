import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { clsx } from 'clsx';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  inputClassName = '',
  editable = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={clsx("w-full space-y-1.5", className)}>
      {label && (
        <Text className="text-sm font-medium text-foreground">
          {label}
        </Text>
      )}

      <TextInput
        className={clsx(
          "h-11 px-3.5 border rounded-xl bg-card text-foreground text-base",
          isFocused ? "border-primary" : "border-border",
          error ? "border-destructive" : "",
          !editable && "bg-muted opacity-60",
          inputClassName
        )}
        placeholderTextColor="#627384"
        editable={editable}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />

      {error ? (
        <Text className="text-xs text-destructive mt-0.5">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-xs text-muted-foreground mt-0.5">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};
