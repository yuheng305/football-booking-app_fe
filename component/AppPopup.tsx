import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PopupTone = "info" | "success" | "warning" | "danger";
type PopupActionVariant = "primary" | "secondary" | "danger";

export type AppPopupAction = {
  label: string;
  onPress: () => void;
  variant?: PopupActionVariant;
  disabled?: boolean;
  loading?: boolean;
};

type AppPopupProps = {
  visible: boolean;
  title: string;
  message?: string;
  tone?: PopupTone;
  icon?: ComponentProps<typeof Ionicons>["name"];
  children?: ReactNode;
  actions?: AppPopupAction[];
  onClose?: () => void;
  dismissible?: boolean;
};

const TONE_CONFIG: Record<
  PopupTone,
  { icon: ComponentProps<typeof Ionicons>["name"]; color: string; bg: string }
> = {
  info: { icon: "information-circle-outline", color: "#114F99", bg: "#eff6ff" },
  success: { icon: "checkmark-circle-outline", color: "#119916", bg: "#ecfdf3" },
  warning: { icon: "alert-circle-outline", color: "#d97706", bg: "#fffbeb" },
  danger: { icon: "close-circle-outline", color: "#dc2626", bg: "#fef2f2" },
};

const ACTION_STYLES: Record<PopupActionVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: "#114F99", border: "#114F99", text: "#ffffff" },
  secondary: { bg: "#ffffff", border: "#d1d5db", text: "#374151" },
  danger: { bg: "#dc2626", border: "#dc2626", text: "#ffffff" },
};

export default function AppPopup({
  visible,
  title,
  message,
  tone = "info",
  icon,
  children,
  actions = [],
  onClose,
  dismissible = true,
}: AppPopupProps) {
  const toneConfig = TONE_CONFIG[tone];
  const canClose = dismissible && !!onClose;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canClose ? onClose : undefined}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={canClose ? onClose : undefined}
      >
        <Pressable style={styles.card}>
          {canClose ? (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}

          <View style={[styles.iconWrap, { backgroundColor: toneConfig.bg }]}>
            <Ionicons
              name={icon || toneConfig.icon}
              size={42}
              color={toneConfig.color}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children ? <View style={styles.content}>{children}</View> : null}

          {actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action) => {
                const variant = action.variant || "primary";
                const actionStyle = ACTION_STYLES[variant];
                return (
                  <TouchableOpacity
                    key={action.label}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: actionStyle.bg,
                        borderColor: actionStyle.border,
                        opacity: action.disabled ? 0.6 : 1,
                      },
                    ]}
                    onPress={action.onPress}
                    disabled={action.disabled || action.loading}
                    activeOpacity={0.85}
                  >
                    {action.loading ? (
                      <ActivityIndicator size="small" color={actionStyle.text} />
                    ) : (
                      <Text style={[styles.actionText, { color: actionStyle.text }]}>
                        {action.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: "#1E232C",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  content: {
    width: "100%",
    marginTop: 14,
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
