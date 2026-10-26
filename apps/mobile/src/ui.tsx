import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  ink: '#16324F',
  blue: '#146C94',
  paper: '#F5F8FA',
  white: '#FFFFFF',
  coral: '#D1495B',
  green: '#26745B',
  line: '#D3DDE4',
};
export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
  selected = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && !selected && styles.secondaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, error && styles.error]}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'No se pudo completar la solicitud. Revisa tu conexión e intenta otra vez.';
export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  screen: { padding: 20, gap: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  header: { padding: 22, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow: { color: colors.blue, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  text: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  caption: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginTop: 5 },
  input: {
    backgroundColor: colors.white,
    color: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 50,
    padding: 13,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondary: { backgroundColor: colors.white },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryText: { color: colors.blue },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  notice: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue,
    padding: 14,
    marginVertical: 4,
  },
  error: { borderLeftColor: colors.coral },
  divider: { borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 18, gap: 9 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.blue },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});
