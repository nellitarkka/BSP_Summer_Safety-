import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, colors, radius, space, fontSize, font } from '@/lib/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Cross-cutting confirmation guard for emergency actions (FR-34/FR-35).
// Nothing destructive happens until the user explicitly confirms.
export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', destructive, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View
            style={[styles.iconBadge, { backgroundColor: destructive ? colors.danger + '1A' : colors.brandSoft }]}
          >
            <Ionicons name={destructive ? 'alert-circle' : 'help-circle'} size={26} color={destructive ? colors.danger : colors.brand} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={destructive ? gradients.danger : gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: space[6],
  },
  dialog: {
    width: '100%',
    gap: space[2],
    borderRadius: radius['4xl'],
    backgroundColor: colors.white,
    padding: space[6],
  },
  iconBadge: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
  },
  title: { marginTop: space[1], fontSize: fontSize.xl, fontFamily: font.extrabold, color: colors.text },
  message: { fontSize: fontSize.sm, fontFamily: font.regular, lineHeight: 24, color: colors.muted },
  actions: { marginTop: space[4], gap: space[2] },
  confirmBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    paddingHorizontal: space[4],
  },
  confirmText: { fontSize: fontSize.base, fontFamily: font.bold, color: '#FFFFFF' },
  cancelBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
  },
  cancelText: { fontSize: fontSize.base, fontFamily: font.semibold, color: colors.muted },
});
