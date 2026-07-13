import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Group, Image as SkiaImage, ColorMatrix, useImage, Skia, drawAsImage, ImageFormat } from '@shopify/react-native-skia';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FILTER_PRESETS } from './filterPresets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_MAX_WIDTH = SCREEN_WIDTH - 32;
const PREVIEW_MAX_HEIGHT = 380;
const THUMB_SIZE = 58;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const ASPECTS = [
  { key: 'original', label: 'Original', ratio: null },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '4:5', label: '4:5', ratio: 4 / 5 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
];

function clamp(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function FilterThumb({ image, preset, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.filterThumbWrap}>
      <View style={[styles.filterThumb, selected && styles.filterThumbSelected]}>
        <Canvas style={styles.filterThumbCanvas}>
          <SkiaImage image={image} x={0} y={0} width={THUMB_SIZE} height={THUMB_SIZE} fit="cover">
            <ColorMatrix matrix={preset.matrix} />
          </SkiaImage>
        </Canvas>
      </View>
      <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]} numberOfLines={1}>{preset.name}</Text>
    </TouchableOpacity>
  );
}

/**
 * Full-screen photo editor (its own pushed route -- see
 * app/secure/meme-edit-image.jsx). Simple top-to-bottom layout: a Discard/
 * Done top bar, the image centered in the middle, and the Filter/Crop
 * controls below it.
 *
 * Crop is a pinch-to-zoom-and-pan interaction over a fixed-shape frame (the
 * Instagram model), not draggable resize handles. Rotation is applied
 * immediately to the working file rather than tracked as a live transform,
 * so the pan/zoom gesture math never has to compose with a rotation.
 */
export default function ImageEditor({ uri, onCancel, onDone }) {
  const insets = useSafeAreaInsets();
  const [workingUri, setWorkingUri] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [activeTab, setActiveTab] = useState('filter'); // 'filter' | 'crop'
  const [filterIndex, setFilterIndex] = useState(0);
  const [aspectIndex, setAspectIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  const filterImage = useImage(workingUri);

  // Normalize the source before anything else touches it. Camera/library
  // photos often carry an EXIF orientation flag: expo-image-manipulator
  // bakes it into its (upright) output, but a raw Skia decode reports the
  // un-rotated sensor dimensions -- so `naturalSize` (from one) and the Skia
  // texture (the other) disagreed on width/height, and drawing the source at
  // naturalSize with fit="fill" during the final bake stretched the result.
  // Re-encoding once here produces a clean, orientation-baked file that every
  // stage (Skia decode, on-screen sizing, crop bake) then agrees on.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const norm = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.PNG });
        if (cancelled) return;
        setWorkingUri(norm.uri);
        setNaturalSize({ w: norm.width, h: norm.height });
      } catch (e) {
        console.error('Failed to normalize image:', e);
        if (cancelled) return;
        setWorkingUri(uri);
        RNImage.getSize(uri, (w, h) => setNaturalSize({ w, h }), () => {});
      }
    })();
    return () => { cancelled = true; };
  }, [uri]);

  const aspect = ASPECTS[aspectIndex];
  const targetRatio = aspect.ratio ?? (naturalSize ? naturalSize.w / naturalSize.h : 1);

  const frame = useMemo(() => {
    let w = PREVIEW_MAX_WIDTH;
    let h = w / targetRatio;
    if (h > PREVIEW_MAX_HEIGHT) {
      h = PREVIEW_MAX_HEIGHT;
      w = h * targetRatio;
    }
    return { width: w, height: h };
  }, [targetRatio]);

  const baseScale = naturalSize ? Math.max(frame.width / naturalSize.w, frame.height / naturalSize.h) : 1;

  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Frame shape or source image changed (new aspect ratio, or a fresh
  // rotate) -- the old pan/zoom no longer means anything against the new
  // geometry, so reset to centered/unzoomed.
  useEffect(() => {
    zoom.value = 1;
    savedZoom.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [aspectIndex, workingUri]);

  const naturalW = naturalSize?.w || 1;
  const naturalH = naturalSize?.h || 1;
  const frameW = frame.width;
  const frameH = frame.height;

  const panGesture = Gesture.Pan()
    .enabled(activeTab === 'crop')
    .onUpdate((e) => {
      const effScale = baseScale * zoom.value;
      const maxTX = Math.max((naturalW * effScale - frameW) / 2, 0);
      const maxTY = Math.max((naturalH * effScale - frameH) / 2, 0);
      translateX.value = clamp(savedTranslateX.value + e.translationX, -maxTX, maxTX);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -maxTY, maxTY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(activeTab === 'crop')
    .onUpdate((e) => {
      const newZoom = clamp(savedZoom.value * e.scale, MIN_ZOOM, MAX_ZOOM);
      zoom.value = newZoom;
      const effScale = baseScale * newZoom;
      const maxTX = Math.max((naturalW * effScale - frameW) / 2, 0);
      const maxTY = Math.max((naturalH * effScale - frameH) / 2, 0);
      translateX.value = clamp(translateX.value, -maxTX, maxTX);
      translateY.value = clamp(translateY.value, -maxTY, maxTY);
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Crop is drawn with Skia (not a plain <Image>), so the pinch/pan samples
  // the full-resolution GPU texture at every zoom level -- an <Image>
  // rasterizes at its layout size and any zoom past that magnifies the
  // raster (= blur). displayedW/H is the image's "cover" size that exactly
  // fills the frame at zoom 1; the transform below scales/pans about the
  // frame's center. Both are read by the Skia <Group> on the UI thread.
  const displayedW = naturalW * baseScale;
  const displayedH = naturalH * baseScale;
  const cropImgX = (frameW - displayedW) / 2;
  const cropImgY = (frameH - displayedH) / 2;

  const cropTransform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: zoom.value },
  ]);

  const rotate = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      const result = await manipulateAsync(workingUri, [{ rotate: 90 }], { compress: 1, format: SaveFormat.PNG });
      setWorkingUri(result.uri);
      setNaturalSize({ w: result.width, h: result.height });
    } catch (e) {
      console.error('Failed to rotate image:', e);
    } finally {
      setRotating(false);
    }
  };

  const handleDone = async () => {
    if (!naturalSize || processing) return;
    setProcessing(true);
    try {
      const effScale = baseScale * zoom.value;
      const shownW = naturalW * effScale;
      const shownH = naturalH * effScale;
      // Source-pixel crop rect: exactly the region currently inside the frame.
      // Aspect = cropWidth/cropHeight = frameW/frameH = the chosen ratio, so
      // the output is never squished.
      const cropWidth = clamp(frameW / effScale, 1, naturalW);
      const cropHeight = clamp(frameH / effScale, 1, naturalH);
      const cropOriginX = clamp(((shownW - frameW) / 2 - translateX.value) / effScale, 0, naturalW - cropWidth);
      const cropOriginY = clamp(((shownH - frameH) / 2 - translateY.value) / effScale, 0, naturalH - cropHeight);
      const outW = Math.round(cropWidth);
      const outH = Math.round(cropHeight);

      const preset = FILTER_PRESETS[filterIndex];

      // Crop-only (no color grade): plain geometry crop, keeps the source
      // pixels untouched.
      if (preset.name === 'Normal') {
        const cropped = await manipulateAsync(
          workingUri,
          [{ crop: { originX: Math.round(cropOriginX), originY: Math.round(cropOriginY), width: outW, height: outH } }],
          { compress: 1, format: SaveFormat.PNG }
        );
        onDone(cropped.uri);
        return;
      }

      // Crop + filter in ONE Skia pass (avoids a crop-then-refilter round trip
      // that was distorting the result): draw the full-res source shifted so
      // the crop origin sits at 0,0, into an offscreen canvas sized to the
      // crop rect. fit="fill" at the image's own natural dimensions is a 1:1
      // draw (no rescale => no distortion), ColorMatrix bakes the filter, and
      // the canvas clips to exactly the crop rect.
      const source = await loadSkImage(workingUri);
      const skImageResult = await drawAsImage(
        <Group transform={[{ translateX: -cropOriginX }, { translateY: -cropOriginY }]}>
          <SkiaImage image={source} x={0} y={0} width={naturalW} height={naturalH} fit="fill">
            <ColorMatrix matrix={preset.matrix} />
          </SkiaImage>
        </Group>,
        { width: outW, height: outH }
      );

      const base64 = skImageResult.encodeToBase64(ImageFormat.JPEG, 0.92);
      const outPath = `${FileSystem.cacheDirectory}nudge-edit-${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(outPath, base64, { encoding: FileSystem.EncodingType.Base64 });
      onDone(outPath);
    } catch (e) {
      console.error('Failed to apply image edits:', e);
      onDone(uri);
    } finally {
      setProcessing(false);
    }
  };

  const ready = !!naturalSize && !!filterImage && !rotating;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onCancel} disabled={processing} hitSlop={10}>
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit</Text>
        <TouchableOpacity onPress={handleDone} disabled={processing || !ready} hitSlop={10}>
          {processing ? <ActivityIndicator size="small" color="#7C2B86" /> : <Text style={[styles.doneText, (!ready || processing) && styles.doneTextDisabled]}>Done</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.previewArea}>
        {!ready ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <View style={[styles.frame, frame]}>
            {activeTab === 'crop' ? (
              <GestureDetector gesture={composedGesture}>
                <Canvas style={frame}>
                  <Group origin={{ x: frameW / 2, y: frameH / 2 }} transform={cropTransform}>
                    <SkiaImage image={filterImage} x={cropImgX} y={cropImgY} width={displayedW} height={displayedH} fit="fill">
                      <ColorMatrix matrix={FILTER_PRESETS[filterIndex].matrix} />
                    </SkiaImage>
                  </Group>
                </Canvas>
              </GestureDetector>
            ) : (
              <Canvas style={frame}>
                <SkiaImage image={filterImage} x={0} y={0} width={frame.width} height={frame.height} fit="cover">
                  <ColorMatrix matrix={FILTER_PRESETS[filterIndex].matrix} />
                </SkiaImage>
              </Canvas>
            )}
          </View>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('filter')}>
            <Text style={[styles.tabText, activeTab === 'filter' && styles.tabTextActive]}>Filters</Text>
            {activeTab === 'filter' ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('crop')}>
            <Text style={[styles.tabText, activeTab === 'crop' && styles.tabTextActive]}>Crop</Text>
            {activeTab === 'crop' ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        </View>

        {activeTab === 'filter' && filterImage ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_PRESETS.map((preset, i) => (
              <FilterThumb
                key={preset.name}
                image={filterImage}
                preset={preset}
                selected={i === filterIndex}
                onPress={() => setFilterIndex(i)}
              />
            ))}
          </ScrollView>
        ) : null}

        {activeTab === 'crop' ? (
          <View style={styles.cropPanel}>
            <View style={styles.aspectRow}>
              {ASPECTS.map((a, i) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.aspectChip, i === aspectIndex && styles.aspectChipActive]}
                  onPress={() => setAspectIndex(i)}
                >
                  <Text style={[styles.aspectChipText, i === aspectIndex && styles.aspectChipTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.rotateChip} onPress={rotate} disabled={rotating}>
                {rotating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="return-up-forward-outline" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.cropHint}>Pinch to zoom · drag to reposition</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

async function loadSkImage(uri) {
  const data = await Skia.Data.fromURI(uri);
  return Skia.Image.MakeImageFromEncoded(data);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
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
  frame: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#0A0A0A' },
  controls: { paddingTop: 8 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 4 },
  tabButton: { alignItems: 'center', paddingBottom: 8 },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  tabIndicator: { marginTop: 6, height: 2, width: 22, borderRadius: 1, backgroundColor: '#B47CFF' },
  filterRow: { paddingHorizontal: 16, paddingTop: 14, gap: 14, alignItems: 'flex-start' },
  filterThumbWrap: { alignItems: 'center', gap: 6, width: THUMB_SIZE + 10 },
  filterThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterThumbCanvas: { width: THUMB_SIZE, height: THUMB_SIZE },
  filterThumbSelected: { borderColor: '#B47CFF' },
  filterLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  filterLabelSelected: { color: '#FFFFFF' },
  cropPanel: { paddingHorizontal: 16, paddingTop: 18, alignItems: 'center', gap: 14 },
  aspectRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  aspectChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  aspectChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  aspectChipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  aspectChipTextActive: { color: '#000000' },
  rotateChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  cropHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
});
