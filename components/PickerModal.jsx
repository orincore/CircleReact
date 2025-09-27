import React, { useMemo, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = true,
  placeholder = "Search",
  optionIconFor,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>

          {searchable && (
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor="#8880B6"
                style={styles.searchInput}
                autoFocus
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery("")}> 
                  <Ionicons name="close" size={16} color="#8880B6" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item)}
            style={{ maxHeight: 360 }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const isSelected = String(item) === String(selected);
              const leftIcon = optionIconFor ? optionIconFor(item) : null;
              return (
                <TouchableOpacity style={[styles.row, isSelected && styles.rowSelected]} onPress={() => { onSelect(item); onClose?.(); }}>
                  <View style={styles.rowLeft}>
                    {leftIcon}
                    <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{String(item)}</Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark" size={18} color="#7C2B86" /> : <Ionicons name="chevron-forward" size={16} color="#B5AADD" />}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  grabber: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#E9E6FF", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "800", color: "#1F1147", marginBottom: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E9E6FF", backgroundColor: "#FAF9FF", paddingHorizontal: 12, height: 44, marginBottom: 10 },
  searchInput: { flex: 1, color: "#1F1147" },
  sep: { height: 1, backgroundColor: "#F1EEFF" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowSelected: { backgroundColor: "#FFF6FB" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { fontSize: 16, color: "#1F1147" },
  rowTextSelected: { color: "#7C2B86", fontWeight: "700" },
  closeBtn: { marginTop: 12, backgroundColor: "#FFD6F2", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  closeText: { color: "#7C2B86", fontWeight: "800" },
});
