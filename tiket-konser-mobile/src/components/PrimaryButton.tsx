import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
}

const PrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}) => {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#4F46E5' : '#fff'} />
      ) : (
        <Text style={isOutline ? styles.outlineText : styles.primaryText}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#4F46E5' },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  outlineText: { color: '#4F46E5', fontWeight: '600', fontSize: 16 },
});

export default PrimaryButton;
