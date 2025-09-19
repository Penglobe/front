// CustomAlert.jsx
import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import colors from "@constants/Colors.cjs";

export default function CustomAlert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "확인",
  cancelText = "취소",
  deferMs = 200, // iOS fade 애니 기본 150~200ms
}) {
  const [locking, setLocking] = useState(false); // 중복 탭 방지
  const [hiding, setHiding] = useState(false); // 컴포넌트 내부에서 임시로 숨김

  // 부모가 visible=false로 내리면 내부 상태 초기화
  useEffect(() => {
    if (!visible) setHiding(false);
  }, [visible]);

  const handleConfirm = () => {
    if (locking) return;
    setLocking(true);

    // ✅ 즉시 자기 자신을 닫아 겹침 방지 (부모 visible과 무관)
    setHiding(true);

    // 약간의 지연 뒤 부모 콜백 실행(부모가 다음 알럿/네비게이션 등 수행)
    setTimeout(() => {
      try {
        onConfirm?.();
      } finally {
        setLocking(false);
      }
    }, deferMs);
  };

  const handleCancel = () => {
    if (locking) return;
    onCancel?.();
  };

  return (
    <Modal
      visible={visible && !hiding} // ← 내부 hiding으로 즉시 닫힘 효과
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/15">
        <View className="bg-white rounded-2xl px-2xl py-xl shadow-lg w-80">
          {title ? (
            <Text className="text-h3 font-sf-b text-center py-sm text-gray-800">
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text className="text-body text-center text-gray-600 py-sm">
              {message}
            </Text>
          ) : null}

          <View className="flex-row gap-lg py-md">
            {onCancel && (
              <TouchableOpacity
                className="flex-1 py-md rounded-xl"
                style={{
                  backgroundColor: colors.Colors.gray,
                  opacity: locking ? 0.6 : 1,
                }}
                onPress={handleCancel}
                disabled={locking}
              >
                <Text className="text-button text-center text-white font-sf-md">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 py-md rounded-xl"
              style={{
                backgroundColor: colors.Colors.green,
                opacity: locking ? 0.6 : 1,
              }}
              onPress={handleConfirm}
              disabled={locking}
            >
              <Text className="text-button text-center text-white font-sf-md">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
