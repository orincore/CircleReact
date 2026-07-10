import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// The "Share Media" picker modal: gallery / camera / view-once media / cancel.
function MediaOptionsSheet({
  visible,
  onClose,
  isDarkMode,
  onPickMedia,
  onTakePhoto,
  onPickViewOnceMedia,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ backgroundColor: isDarkMode ? '#1F1F2E' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: isDarkMode ? '#FFFFFF' : '#000000' }}>
              Share Media
            </Text>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
              onPress={onPickMedia}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED20', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                <Ionicons name="images-outline" size={24} color="#7C3AED" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                  Photo & Video Library
                </Text>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Choose from your gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
              onPress={onTakePhoto}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                <Ionicons name="camera-outline" size={24} color="#10B981" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                  Take Photo
                </Text>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Use your camera
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
              onPress={onPickViewOnceMedia}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                <Ionicons name="eye-off-outline" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                  View Once Media
                </Text>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Can only be viewed once (App only)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#E5E7EB', paddingTop: 15, marginTop: 10, alignItems: 'center' }}
              onPress={onClose}
            >
              <Text style={{ fontSize: 16, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default React.memo(MediaOptionsSheet);
