import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "./chatConversationStyles";

// In-chat search overlay. Purely presentational; only renders when `visible`.
function ChatSearchBar({
  visible,
  theme,
  searchQuery,
  setSearchQuery,
  searchMatches,
  searchMatchIndex,
  goToPreviousSearchMatch,
  goToNextSearchMatch,
  closeSearch,
}) {
  if (!visible) return null;

  return (
    <View style={[styles.searchBarRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
      <TextInput
        autoFocus
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search messages"
        placeholderTextColor={theme.textPlaceholder}
        style={[styles.searchBarInput, { color: theme.textPrimary }]}
        returnKeyType="search"
      />
      {searchQuery.trim().length > 0 && (
        <Text style={[styles.searchMatchCount, { color: theme.textSecondary }]}>
          {searchMatches.length > 0 ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0/0'}
        </Text>
      )}
      <TouchableOpacity
        onPress={goToPreviousSearchMatch}
        disabled={searchMatchIndex <= 0}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.searchNavButton}
      >
        <Ionicons name="chevron-up" size={20} color={searchMatchIndex > 0 ? theme.textPrimary : theme.textPlaceholder} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={goToNextSearchMatch}
        disabled={searchMatchIndex >= searchMatches.length - 1}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.searchNavButton}
      >
        <Ionicons name="chevron-down" size={20} color={searchMatchIndex < searchMatches.length - 1 ? theme.textPrimary : theme.textPlaceholder} />
      </TouchableOpacity>
      <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.searchNavButton}>
        <Ionicons name="close" size={22} color={theme.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(ChatSearchBar);
