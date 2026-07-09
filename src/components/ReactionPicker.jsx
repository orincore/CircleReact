import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  SectionList,
  FlatList,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import emojiKeywords from 'emojilib';
import emojiGroupsData from 'unicode-emoji-json/data-by-group.json';

const RECENTS_KEY = 'chat_recent_emojis';
const MAX_RECENTS = 21;

// A percentage width (100/7 = 14.285714...%) rounds/sums to just over 100%
// across 7 columns, which pushes the 7th cell of every row onto the next
// line and leaves a blank gap on the right. Use a pixel size computed from
// the actual screen width instead, so 7 columns always fit exactly.
const GRID_COLUMNS = 7;
const GRID_HORIZONTAL_PADDING = 12; // matches styles.list paddingHorizontal, both sides
const SCREEN_WIDTH = Dimensions.get('window').width;
const EMOJI_CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2) / GRID_COLUMNS);

// unicode-emoji-json ships the full ~1900-emoji Unicode set (the same set
// the device's own keyboard draws from), grouped exactly like a native
// emoji keyboard -- so "all emojis available on device" just means using
// this dataset directly instead of a hand-picked subset.
const GROUP_META = {
  smileys_emotion: { label: 'SMILEYS & EMOTION', icon: 'happy-outline' },
  people_body: { label: 'PEOPLE & BODY', icon: 'body-outline' },
  animals_nature: { label: 'ANIMALS & NATURE', icon: 'paw-outline' },
  food_drink: { label: 'FOOD & DRINK', icon: 'restaurant-outline' },
  travel_places: { label: 'TRAVEL & PLACES', icon: 'airplane-outline' },
  activities: { label: 'ACTIVITIES', icon: 'football-outline' },
  objects: { label: 'OBJECTS', icon: 'cube-outline' },
  symbols: { label: 'SYMBOLS', icon: 'shapes-outline' },
  flags: { label: 'FLAGS', icon: 'flag-outline' },
};

function chunkIntoRows(emojis) {
  const rows = [];
  for (let i = 0; i < emojis.length; i += GRID_COLUMNS) {
    rows.push(emojis.slice(i, i + GRID_COLUMNS));
  }
  return rows;
}

const CATEGORY_GROUPS = emojiGroupsData.map((group) => {
  const meta = GROUP_META[group.slug] || { label: group.name.toUpperCase(), icon: 'ellipse-outline' };
  const emojis = group.emojis.map((e) => e.emoji);
  return {
    key: group.slug,
    label: meta.label,
    icon: meta.icon,
    rows: chunkIntoRows(emojis),
  };
});

// Flat index of every emoji + its Unicode name, for search.
const ALL_EMOJIS = emojiGroupsData.flatMap((group) =>
  group.emojis.map((e) => ({ emoji: e.emoji, name: e.name }))
);

function emojiMatchesQuery(entry, query) {
  if (entry.name.toLowerCase().includes(query)) return true;
  const keywords = emojiKeywords[entry.emoji];
  if (!keywords) return false;
  return keywords.some((k) => k.toLowerCase().replace(/_/g, ' ').includes(query));
}

const THEME = {
  dark: {
    sheetBg: '#1C1C1E',
    handleBg: '#48484A',
    searchBg: '#2C2C2E',
    searchText: '#FFFFFF',
    placeholder: '#8E8E93',
    icon: '#8E8E93',
    categoryText: '#8E8E93',
    noResults: '#8E8E93',
    tabBorder: '#38383A',
  },
  light: {
    sheetBg: '#FFFFFF',
    handleBg: '#D1D1D6',
    searchBg: '#F2F2F7',
    searchText: '#000000',
    placeholder: '#8E8E93',
    icon: '#6B6B70',
    categoryText: '#6B6B70',
    noResults: '#6B6B70',
    tabBorder: '#E5E5EA',
  },
};

export default function ReactionPicker({ visible, onClose, onSelectEmoji, isDarkMode }) {
  const insets = useSafeAreaInsets();
  const colors = isDarkMode ? THEME.dark : THEME.light;
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState([]);
  const sectionListRef = useRef(null);

  // Pull-down-to-dismiss on the handle bar. Scoped to just the handle (not
  // the whole sheet) so it doesn't fight the emoji list's own scroll
  // gesture -- PanResponder is used instead of react-native-gesture-handler
  // here since this content lives inside a plain RN Modal, which is its own
  // native root and isn't guaranteed to be wrapped in a
  // GestureHandlerRootView the way the rest of the screen is.
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // Don't reset translateY here -- the sheet is still mounted and
            // visible (parent's `visible` prop only flips after this onClose
            // triggers a state update on its next render), so resetting to 0
            // now snaps the sheet back open for a frame before it actually
            // unmounts. Leave it off-screen; the `visible` effect below resets
            // it to 0 the next time the sheet opens.
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENTS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecents(parsed);
      } catch {
        // ignore corrupt cache
      }
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const handleSelect = useCallback((emoji) => {
    onSelectEmoji(emoji);
    setRecents((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    onClose();
  }, [onSelectEmoji, onClose]);

  const sections = useMemo(() => {
    const list = [];
    if (recents.length > 0) {
      list.push({ key: 'recents', title: '', data: chunkIntoRows(recents) });
    }
    CATEGORY_GROUPS.forEach((g) => list.push({ key: g.key, title: g.label, data: g.rows }));
    return list;
  }, [recents]);

  const searchRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const matches = ALL_EMOJIS.filter((e) => emojiMatchesQuery(e, q)).map((e) => e.emoji);
    return chunkIntoRows(matches);
  }, [query]);

  const scrollToSection = (key) => {
    const index = sections.findIndex((s) => s.key === key);
    if (index >= 0) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: index,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    }
  };

  const renderRow = ({ item }) => (
    <View style={styles.row}>
      {item.map((emoji, i) => (
        <TouchableOpacity
          key={`${emoji}-${i}`}
          style={styles.emojiButton}
          onPress={() => handleSelect(emoji)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdropTapArea} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.sheetBg },
            { paddingBottom: Math.max(insets.bottom, 8) },
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handleTouchArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.handleBg }]} />
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.searchBg }]}>
            <Ionicons name="search" size={18} color={colors.icon} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.placeholder}
              style={[styles.searchInput, { color: colors.searchText }]}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>

          {searchRows !== null ? (
            searchRows.length === 0 ? (
              <Text style={[styles.noResults, { color: colors.noResults }]}>No emoji found</Text>
            ) : (
              <FlatList
                style={styles.list}
                data={searchRows}
                keyExtractor={(row, i) => `search-row-${i}-${row[0]}`}
                renderItem={renderRow}
                keyboardShouldPersistTaps="handled"
              />
            )
          ) : (
            <SectionList
              ref={sectionListRef}
              style={styles.list}
              sections={sections}
              keyExtractor={(row, i) => `row-${i}-${row[0]}`}
              renderItem={renderRow}
              renderSectionHeader={({ section }) =>
                section.title ? (
                  <Text
                    style={[
                      styles.categoryTitle,
                      { color: colors.categoryText, backgroundColor: colors.sheetBg },
                    ]}
                  >
                    {section.title}
                  </Text>
                ) : null
              }
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
              onScrollToIndexFailed={() => {}}
            />
          )}

          {searchRows === null && (
            <View
              style={[
                styles.tabBar,
                { borderTopColor: colors.tabBorder, paddingBottom: Platform.OS === 'ios' ? 0 : 6 },
              ]}
            >
              <TouchableOpacity style={styles.tabButton} onPress={() => scrollToSection('recents')}>
                <Ionicons name="time-outline" size={20} color={colors.icon} />
              </TouchableOpacity>
              {CATEGORY_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group.key}
                  style={styles.tabButton}
                  onPress={() => scrollToSection(group.key)}
                >
                  <Ionicons name={group.icon} size={20} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTapArea: {
    height: 60,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleTouchArea: {
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  noResults: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
  },
  emojiButton: {
    width: EMOJI_CELL_SIZE,
    height: EMOJI_CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
});
