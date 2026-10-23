import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import { clsx } from 'clsx';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'medical' | 'accent' | 'warning' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  children,
  className = '',
  textClassName = '',
  disabled,
  ...props
}) => {
  const baseClasses = "flex-row items-center justify-center rounded-xl font-medium";

  const variantClasses = {
    default: "bg-primary",
    medical: "bg-primary",
    accent: "bg-accent",
    warning: "bg-warning",
    secondary: "bg-secondary",
    outline: "border border-border bg-card",
    ghost: "bg-transparent",
    destructive: "bg-destructive",
  }[variant];

  const sizeClasses = {
    default: "h-11 px-5 py-2.5",
    sm: "h-9 px-3.5 py-1.5",
    lg: "h-13 px-7 py-3",
    icon: "h-10 w-10 p-0",
  }[size];

  const textVariantClasses = {
    default: "text-white font-semibold text-base",
    medical: "text-white font-semibold text-base",
    accent: "text-white font-semibold text-base",
    warning: "text-white font-semibold text-base",
    secondary: "text-white font-semibold text-base",
    outline: "text-foreground font-medium text-base",
    ghost: "text-foreground font-medium text-base",
    destructive: "text-white font-semibold text-base",
  }[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={clsx(
        baseClasses,
        variantClasses,
        sizeClasses,
        disabled && "opacity-50",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text className={clsx(textVariantClasses, textClassName)}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};
