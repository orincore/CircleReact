import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { trim } from 'react-native-video-trim';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_WIDTH = SCREEN_WIDTH - 64;
const HANDLE_WIDTH = 20;
const MIN_TRIM_MS = 1000;
const MAX_TRIM_MS = 90 * 1000; // matches memeUploadService's VIDEO_MAX_DURATION_SECONDS

function formatMs(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView key={uri} player={player} style={styles.preview} contentFit="contain" nativeControls={false} />;
}

/**
 * Basic video editor: trim only (start/end), via react-native-video-trim's
 * headless trim() -- a real cut (stream-copy on iOS/Android, no re-encode
 * needed for a plain trim), not just a stored in/out point. No color
 * filters here: baking those into a video needs frame-by-frame re-encoding,
 * a much larger pipeline than this pass covers -- see ImageEditor.jsx for
 * where that treatment does apply (images only).
 */
export default function VideoEditor({ uri, durationMs, onCancel, onDone }) {
  const insets = useSafeAreaInsets();
  const clampedDuration = Math.max(durationMs || 0, MIN_TRIM_MS);
  const initialEnd = Math.min(clampedDuration, MAX_TRIM_MS);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(initialEnd);
  const [processing, setProcessing] = useState(false);

  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  trimStartRef.current = trimStart;
  trimEndRef.current = trimEnd;

  // gesture.dx from PanResponder is the CUMULATIVE displacement since the
  // touch began, not a per-event delta -- it must be added to a FIXED
  // anchor captured once at gesture start. Reading trimStartRef/trimEndRef
  // (which update every move event) as that anchor double-counts every
  // prior event's movement on top of itself each frame, making the handle
  // run away far faster than the actual finger drag.
  const startGestureAnchorRef = useRef(0);
  const endGestureAnchorRef = useRef(0);

  const msToX = (ms) => (ms / clampedDuration) * BAR_WIDTH;
  const xToMs = (x) => Math.min(Math.max((x / BAR_WIDTH) * clampedDuration, 0), clampedDuration);

  const startPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureAnchorRef.current = trimStartRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const x = msToX(startGestureAnchorRef.current) + gesture.dx;
          const ms = xToMs(x);
          const maxAllowed = Math.min(trimEndRef.current - MIN_TRIM_MS, trimEndRef.current);
          setTrimStart(Math.min(Math.max(ms, 0), Math.max(maxAllowed, 0)));
        },
      }),
    [clampedDuration]
  );

  const endPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          endGestureAnchorRef.current = trimEndRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          const x = msToX(endGestureAnchorRef.current) + gesture.dx;
          const ms = xToMs(x);
          const minAllowed = trimStartRef.current + MIN_TRIM_MS;
          const maxAllowed = Math.min(clampedDuration, trimStartRef.current + MAX_TRIM_MS);
          setTrimEnd(Math.min(Math.max(ms, minAllowed), maxAllowed));
        },
      }),
    [clampedDuration]
  );

  const handleDone = async () => {
    if (processing) return;
    // Nothing to trim -- the source is already within range and untouched.
    if (trimStart <= 0 && trimEnd >= clampedDuration) {
      onDone(uri);
      return;
    }
    setProcessing(true);
    try {
      const result = await trim(uri, {
        startTime: Math.round(trimStart),
        endTime: Math.round(trimEnd),
      });
      onDone(result.outputPath);
    } catch (e) {
      console.error('Failed to trim video:', e);
      onDone(uri);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onCancel} disabled={processing} hitSlop={10}>
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Trim</Text>
        <TouchableOpacity onPress={handleDone} disabled={processing} hitSlop={10}>
          {processing ? <ActivityIndicator size="small" color="#7C2B86" /> : <Text style={[styles.doneText, processing && styles.doneTextDisabled]}>Done</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.previewArea}>
        <VideoPreview uri={uri} />
      </View>

      <View style={[styles.trimSection, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.trimTimeText}>{formatMs(trimStart)} – {formatMs(trimEnd)} <Text style={styles.trimTimeMuted}>({formatMs(trimEnd - trimStart)})</Text></Text>

        <View style={styles.trimBar}>
          <View style={styles.trimTrack} />
          <View
            style={[
              styles.trimSelected,
              { left: msToX(trimStart), width: Math.max(msToX(trimEnd) - msToX(trimStart), HANDLE_WIDTH) },
            ]}
          />
          <View style={[styles.handle, { left: msToX(trimStart) - HANDLE_WIDTH / 2 }]} {...startPanResponder.panHandlers}>
            <View style={styles.handleGrip} />
          </View>
          <View style={[styles.handle, { left: msToX(trimEnd) - HANDLE_WIDTH / 2 }]} {...endPanResponder.panHandlers}>
            <View style={styles.handleGrip} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  topTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  discardText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  doneText: { color: '#B47CFF', fontSize: 16, fontWeight: '800' },
  doneTextDisabled: { color: 'rgba(255,255,255,0.35)' },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', height: '100%' },
  trimSection: { paddingHorizontal: 32, paddingTop: 8, gap: 14 },
  trimTimeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  trimTimeMuted: { color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  trimBar: { height: 40, justifyContent: 'center' },
  trimTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  trimSelected: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C2B86',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleGrip: {
    width: HANDLE_WIDTH,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
});
