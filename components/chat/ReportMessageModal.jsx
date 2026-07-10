import React from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Loader from "@/components/Loader";
import { REPORT_REASONS } from "@/src/api/reports";
import { styles } from "./chatConversationStyles";

// Report-message modal: reason list + optional details + submit.
function ReportMessageModal({
  visible,
  onClose,
  isDarkMode,
  selectedReportReason,
  setSelectedReportReason,
  reportAdditionalDetails,
  setReportAdditionalDetails,
  isSubmittingReport,
  onSubmit,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.reportModalOverlay}>
        <View style={[styles.reportModalContainer, { backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff' }]}>
          <View style={styles.reportModalHeader}>
            <Text style={[styles.reportModalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
              Report Message
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.reportModalCloseBtn}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.reportModalSubtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
            Why are you reporting this message?
          </Text>

          <ScrollView style={styles.reportReasonsContainer}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.type}
                style={[
                  styles.reportReasonItem,
                  {
                    backgroundColor: selectedReportReason?.type === reason.type
                      ? (isDarkMode ? '#3a3a5e' : '#e8f4fd')
                      : (isDarkMode ? '#2a2a4e' : '#f5f5f5'),
                    borderColor: selectedReportReason?.type === reason.type
                      ? '#007AFF'
                      : 'transparent',
                    borderWidth: selectedReportReason?.type === reason.type ? 2 : 0,
                  }
                ]}
                onPress={() => setSelectedReportReason(reason)}
              >
                <View style={styles.reportReasonContent}>
                  <Text style={[styles.reportReasonLabel, { color: isDarkMode ? '#fff' : '#000' }]}>
                    {reason.label}
                  </Text>
                  <Text style={[styles.reportReasonDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
                    {reason.description}
                  </Text>
                </View>
                {selectedReportReason?.type === reason.type && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[
              styles.reportAdditionalInput,
              {
                backgroundColor: isDarkMode ? '#2a2a4e' : '#f5f5f5',
                color: isDarkMode ? '#fff' : '#000',
                borderColor: isDarkMode ? '#3a3a5e' : '#ddd'
              }
            ]}
            placeholder="Additional details (optional)"
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
            value={reportAdditionalDetails}
            onChangeText={setReportAdditionalDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.reportSubmitBtn,
              {
                backgroundColor: selectedReportReason ? '#FF6B6B' : '#ccc',
                opacity: isSubmittingReport ? 0.7 : 1
              }
            ]}
            onPress={onSubmit}
            disabled={!selectedReportReason || isSubmittingReport}
          >
            {isSubmittingReport ? (
              <Loader size={16} color="#fff" />
            ) : (
              <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(ReportMessageModal);
