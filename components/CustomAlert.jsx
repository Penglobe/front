import React from "react";
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
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/15">
        <View className="bg-white rounded-2xl px-2xl py-xl shadow-lg w-80">
          {/* 제목 */}
          {title && (
            <Text className="text-h3 font-sf-b text-center py-sm text-gray-800">
              {title}
            </Text>
          )}
          {/* 메시지 */}
          {message && (
            <Text className="text-body text-center text-gray-600 py-sm">
              {message}
            </Text>
          )}

          {/* 버튼 영역 */}
          <View className="flex-row gap-lg py-md">
            {onCancel && (
              <TouchableOpacity
                className="flex-1 py-md rounded-xl"
                style={{ backgroundColor: colors.Colors.gray }}
                onPress={onCancel}
              >
                <Text className="text-button text-center text-white font-sf-md">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 py-md rounded-xl"
              style={{ backgroundColor: colors.Colors.green }}
              onPress={onConfirm}
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
