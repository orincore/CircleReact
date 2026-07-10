import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./chatConversationStyles";

// Multi-select bulk-delete toolbar, shown above the composer while the user
// has one or more messages selected.
function SelectionToolbar({ visible, selectedCount, onDelete, onCancel }) {
  if (!visible) return null;

  return (
    <View style={styles.selectionToolbar}>
      <Text style={styles.selectionToolbarText}>
        {selectedCount} selected
      </Text>
      <View style={styles.selectionToolbarActions}>
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.selectionToolbarButton, { backgroundColor: "#FEE2E2" }]}
        >
          <Text
            style={[
              styles.selectionToolbarButtonText,
              styles.deleteText,
            ]}
          >
            Delete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.selectionToolbarButton}
        >
          <Text style={styles.selectionToolbarButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(SelectionToolbar);
