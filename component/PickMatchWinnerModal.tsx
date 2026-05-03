import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type PickMatchWinnerModalProps = {
  visible: boolean;
  onDismiss: () => void;
  topLabel: string;
  bottomLabel: string;
  onPickTop: () => void;
  onPickBottom: () => void;
  loading?: boolean;
};

/** Modal dùng StyleSheet — tránh className trong Modal (NativeWind không áp vào subtree Modal). */
export default function PickMatchWinnerModal({
  visible,
  onDismiss,
  topLabel,
  bottomLabel,
  loading = false,
  onPickTop,
  onPickBottom,
}: PickMatchWinnerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loading) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          disabled={loading}
          onPress={onDismiss}
          accessibilityLabel="Đóng"
        />

        <View style={styles.card} pointerEvents="box-none">
          <Text style={styles.title}>Chọn đội thắng</Text>

          <View style={styles.buttonColumn}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={onPickTop}
              style={[styles.choiceBtn, styles.choiceBtnTop, loading && styles.disabled]}
            >
              <Text style={styles.choiceText} numberOfLines={4}>
                {topLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={onPickBottom}
              style={[styles.choiceBtn, styles.choiceBtnBottom, loading && styles.disabled]}
            >
              <Text style={styles.choiceText} numberOfLines={4}>
                {bottomLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#93c5fd" size="small" />
              <Text style={styles.loadingText}>Đang lưu…</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onDismiss}
            disabled={loading}
            style={[styles.cancelWrap, loading && styles.disabled]}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#475569",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  buttonColumn: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  choiceBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#1e293b",
    borderLeftWidth: 4,
  },
  choiceBtnTop: {
    borderLeftColor: "#818cf8",
  },
  choiceBtnBottom: {
    borderLeftColor: "#34d399",
  },
  choiceText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
    marginLeft: 10,
  },
  cancelWrap: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#334155",
  },
  cancelText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.45,
  },
});
