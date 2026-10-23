import React from 'react';
import { View, Text, TouchableOpacity, ViewProps } from 'react-native';
import { clsx } from 'clsx';

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextType>({
  value: '',
  onValueChange: () => {},
});

export interface TabsProps extends ViewProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  className = '',
  ...props
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View className={clsx("w-full", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<ViewProps & { className?: string }> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <View
      className={clsx(
        "flex-row bg-muted p-1 rounded-xl items-center",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
};

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = '',
  textClassName = '',
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => context.onValueChange(value)}
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
      }}
    >
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isActive ? '#21262C' : '#627384',
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};
