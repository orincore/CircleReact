import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect, useIsFocused } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import CachedMediaImage from '@/src/components/CachedMediaImage';
import { memeUploadService } from '@/src/services/memeUploadService';
import NudgePreview from '@/components/memes/NudgePreview';
import { startEditorSession, consumeEditorResult } from '@/components/memes/editorSession';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const BRAND_GRADIENT = ['#7C2B86', '#5D5FEF'];
const MAX_GENRES = 3;
// scrollContent below has 16px horizontal padding on each side -- the
// carousel preview fills that content width exactly, so its FlatList's page
// width has to match or paging boundaries land inside the padding instead
// of at the container's edges.
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView key={uri} player={player} style={styles.mediaPreview} contentFit="contain" nativeControls={false} />
  );
}

function CarouselPreview({ images, width }) {
  const [index, setIndex] = useState(0);
  return (
    <View style={styles.mediaPreview}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${item.uri}-${i}`}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <CachedMediaImage mediaUrl={item.uri} style={{ width, height: styles.mediaPreview.height }} resizeMode="contain" showSaveButton={false} />
        )}
      />
      {images.length > 1 ? (
        <View style={styles.dotsRow} pointerEvents="none">
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GenreChip({ label, selected, disabled, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled && !selected}
      activeOpacity={0.75}
      style={[
        styles.chip,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' },
        disabled && !selected && styles.chipDisabled,
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CreateMemeScreen() {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isScreenFocused = useIsFocused();

  const [images, setImages] = useState([]); // [{uri}]
  const [video, setVideo] = useState(null); // {uri, duration}
  const [videoThumbnail, setVideoThumbnail] = useState(null);
  const [caption, setCaption] = useState('');
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);

  // Genres are required server-side (1-3, enforced in user-memes.routes.ts) so
  // this can't collapse away entirely like Instagram has no equivalent of --
  // expanded by default so the requirement is obvious instead of the user
  // wondering why Share is disabled.
  const [genresExpanded, setGenresExpanded] = useState(true);

  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, message: '' });

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    memeUploadService.fetchGenres(token).then((g) => {
      setGenres(g);
      setGenresLoading(false);
    });
  }, [token]);

  // Picks up the edited-media result when returning from the pushed editor
  // screen (see editorSession.js) -- editing is only offered for a single
  // image or a video, never a multi-image carousel, so it's unambiguous
  // which one a result belongs to.
  useFocusEffect(
    useCallback(() => {
      const result = consumeEditorResult();
      if (!result) return;
      if (video) {
        setVideo((prev) => (prev ? { ...prev, uri: result.uri } : prev));
      } else {
        setImages((prev) => (prev.length === 1 ? [{ ...prev[0], uri: result.uri }] : prev));
      }
    }, [video])
  );

  const openImageEditor = () => {
    startEditorSession({ uri: images[0].uri });
    router.push('/secure/meme-edit-image');
  };

  const openVideoEditor = () => {
    startEditorSession({ uri: video.uri, durationMs: video.duration });
    router.push('/secure/meme-edit-video');
  };

  const pickImages = async () => {
    const picked = await memeUploadService.pickImages();
    if (picked.length > 0) {
      setVideo(null);
      setVideoThumbnail(null);
      setImages(picked);
    }
  };

  const pickVideo = async () => {
    const picked = await memeUploadService.pickVideo();
    if (picked) {
      setImages([]);
      setVideo(picked);
      const thumb = await memeUploadService.generateVideoThumbnail(picked.uri);
      setVideoThumbnail(thumb);
    }
  };

  const removeMedia = () => {
    setImages([]);
    setVideo(null);
    setVideoThumbnail(null);
  };

  const toggleGenre = (value) => {
    setSelectedGenres((prev) => {
      if (prev.includes(value)) return prev.filter((g) => g !== value);
      if (prev.length >= MAX_GENRES) return prev;
      return [...prev, value];
    });
  };

  const canPost = (images.length > 0 || video) && selectedGenres.length > 0 && !posting;

  // Rendered through the real MemeCard in NudgePreview so the review step
  // matches the feed pixel-for-pixel. poster_alias is a placeholder -- the
  // real one is a persistent anonymous handle minted server-side per
  // uploader (see getOrCreateAlias in feed-memes.routes.ts), not something
  // worth an extra API round-trip just to label a preview.
  const draftItem = useMemo(() => {
    if (video) {
      return {
        id: 'draft',
        post_type: 'video',
        assets: [{ id: 'draft-video', asset_type: 'video', s3_url: video.uri }],
        caption,
        poster_alias: 'You',
        liked_by_me: false,
        like_count: 0,
        comment_count: 0,
        music: null,
      };
    }
    return {
      id: 'draft',
      post_type: images.length > 1 ? 'carousel' : 'image',
      assets: images.map((img, i) => ({ id: `draft-${i}`, asset_type: 'image', s3_url: img.uri })),
      caption,
      poster_alias: 'You',
      liked_by_me: false,
      like_count: 0,
      comment_count: 0,
      music: null,
    };
  }, [video, images, caption]);

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    setProgress({ pct: 0, message: 'Preparing...' });

    try {
      let media;
      if (video) {
        const compressed = await memeUploadService.compressVideo(video.uri, (p, msg) => {
          setProgress({ pct: p * 0.6, message: msg });
        });
        media = { video: compressed.uri, thumbnail: videoThumbnail };
      } else {
        const compressedUris = await memeUploadService.compressImages(
          images.map((i) => i.uri),
          (p, msg) => setProgress({ pct: p * 0.6, message: msg })
        );
        media = { images: compressedUris };
      }

      setProgress({ pct: 0.65, message: 'Uploading...' });

      const result = await memeUploadService.uploadMeme(
        { media, caption, genres: selectedGenres },
        token,
        (p, msg) => setProgress({ pct: 0.65 + p * 0.35, message: msg })
      );

      // NudgePreview renders the draft through the real MemeCard -- close it
      // here so its player is released before we navigate away, rather than
      // relying on unmount ordering mid-transition.
      setShowPreview(false);

      // Land on the newly created nudge (same viewer used for shared-meme
      // links) instead of just returning to wherever the feed happened to be
      // scrolled. Pop this finished create screen in its own (tabs)/memes
      // stack first, then push the viewer on the outer stack, so back from
      // the viewer exits to the feed. Don't collapse this into a single
      // router.replace: meme-view lives outside this screen's navigator, and
      // a cross-navigator replace degenerates into a push plus a GO_BACK
      // that no navigator handles ("The action 'GO_BACK' was not handled"),
      // leaving this screen mounted underneath forever.
      router.back();
      if (result?.meme_id) {
        router.push(`/secure/meme-view?memeId=${result.meme_id}`);
      }
    } catch (e) {
      console.error('Failed to post meme:', e);
      setProgress({ pct: 0, message: '' });
    } finally {
      setPosting(false);
    }
  };

  const headerTopPadding = (insets.top || (Platform.OS === 'android' ? 24 : 0)) + (Platform.OS === 'web' ? 20 : 12);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton} onPress={() => router.back()} disabled={posting}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Nudge</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.postButton, !canPost && styles.postButtonDisabled]}
            onPress={() => setShowPreview(true)}
            disabled={!canPost}
          >
            <Text style={styles.postButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {posting ? (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress.pct * 100)}%`, backgroundColor: theme.primary }]} />
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          {images.length === 0 && !video ? (
            <View style={styles.pickerRow}>
              <TouchableOpacity style={[styles.pickerButton, { borderColor: theme.border }]} onPress={pickImages} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={28} color={theme.primary} />
                <Text style={[styles.pickerButtonText, { color: theme.textPrimary }]}>Photos</Text>
                <Text style={[styles.pickerButtonSubtext, { color: theme.textMuted }]}>Up to 10, carousel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerButton, { borderColor: theme.border }]} onPress={pickVideo} activeOpacity={0.8}>
                <Ionicons name="videocam-outline" size={28} color={theme.primary} />
                <Text style={[styles.pickerButtonText, { color: theme.textPrimary }]}>Video</Text>
                <Text style={[styles.pickerButtonSubtext, { color: theme.textMuted }]}>Up to 90s</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {video ? <VideoPreview uri={video.uri} /> : <CarouselPreview images={images} width={PREVIEW_WIDTH} />}
              <View style={styles.mediaActionsRow}>
                <TouchableOpacity style={styles.removeMediaButton} onPress={removeMedia} disabled={posting}>
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.removeMediaText}>Change media</Text>
                </TouchableOpacity>
                {video || images.length === 1 ? (
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={video ? openVideoEditor : openImageEditor}
                    disabled={posting}
                  >
                    <Ionicons name="color-wand-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.removeMediaText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          <TextInput
            style={[styles.captionInput, { color: theme.textPrimary, borderColor: theme.border }]}
            placeholder="Write a caption..."
            placeholderTextColor={theme.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
            editable={!posting}
          />

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setGenresExpanded((v) => !v)}
            activeOpacity={0.7}
            disabled={posting}
          >
            <View style={styles.optionRowLeft}>
              <Ionicons name="pricetags-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.optionRowLabel, { color: theme.textPrimary }]}>Topics</Text>
            </View>
            <View style={styles.optionRowRight}>
              <Text
                style={[styles.optionRowValue, { color: selectedGenres.length ? theme.textMuted : theme.primary }]}
                numberOfLines={1}
              >
                {selectedGenres.length
                  ? genres.filter((g) => selectedGenres.includes(g.value)).map((g) => g.label).join(', ')
                  : `Select 1-${MAX_GENRES} to continue`}
              </Text>
              <Ionicons name={genresExpanded ? 'chevron-up' : 'chevron-forward'} size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          {genresExpanded ? (
            genresLoading ? (
              <Loader size={20} color={theme.primary} style={styles.optionRowContent} />
            ) : (
              <View style={[styles.chipsWrap, styles.optionRowContent]}>
                {genres.map((g) => (
                  <GenreChip
                    key={g.value}
                    label={g.label}
                    selected={selectedGenres.includes(g.value)}
                    disabled={selectedGenres.length >= MAX_GENRES}
                    onPress={() => toggleGenre(g.value)}
                    theme={theme}
                  />
                ))}
              </View>
            )
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>

      {showPreview ? (
        <NudgePreview
          item={draftItem}
          cardWidth={SCREEN_WIDTH}
          cardHeight={SCREEN_HEIGHT}
          posting={posting}
          progress={progress}
          // Tied to real navigation focus, not just showPreview -- stack
          // screens stay mounted underneath whatever covers them (e.g. the
          // editor screens pushed on top), and without a real isFocused
          // signal NudgePreview's embedded video kept playing in the
          // background. isScreenFocused going false is what silences it,
          // the same mechanism the feed and meme-view use.
          isFocused={isScreenFocused && showPreview}
          onBack={() => setShowPreview(false)}
          onShare={handlePost}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#3D1240',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 2,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerIconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  postButton: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.24)' },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  progressBar: { height: 3, backgroundColor: 'rgba(0,0,0,0.06)' },
  progressFill: { height: 3 },
  scrollContent: { padding: 16 },
  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickerButton: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 24, alignItems: 'center', gap: 6, borderStyle: 'dashed' },
  pickerButtonText: { fontSize: 15, fontWeight: '700' },
  pickerButtonSubtext: { fontSize: 12 },
  mediaPreview: { width: '100%', height: 380, borderRadius: 16, backgroundColor: '#000', overflow: 'hidden' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#FFFFFF' },
  mediaActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10, marginBottom: 4 },
  removeMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  removeMediaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  captionInput: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 16, minHeight: 70, fontSize: 15, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 18, marginBottom: 4 },
  // Instagram-style collapsed metadata row ("Tag people", "Add location", ...)
  // -- tap to expand instead of always showing the chip grid.
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  optionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '60%' },
  optionRowLabel: { fontSize: 15, fontWeight: '600' },
  optionRowValue: { fontSize: 13, flexShrink: 1, textAlign: 'right' },
  optionRowContent: { marginBottom: 6 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
