import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useRef, useState } from "react";
import { Image, PixelRatio, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessagesBadge } from "@/hooks/useUnreadMessagesBadge";

/**
 * iOS-only bottom tab bar.
 *
 * Uses Expo Router's native tabs, which render the real UIKit `UITabBar`. When
 * the app is built against the iOS 26 SDK this automatically adopts the native
 * "Liquid Glass" material — translucency, blur and the scroll-to-minimize
 * behavior — which a JS-drawn tab bar cannot reproduce.
 *
 * The Profile tab shows the signed-in user's avatar instead of an SF Symbol.
 * UITabBar renders a tab image as-is (it won't clip to a circle or draw a
 * border), so we render the avatar inside a circular white-bordered frame
 * off-screen and rasterize it to a PNG with `captureRef`, then hand that image
 * to the native tab. Falls back to the `person` SF Symbol until the avatar is
 * available/captured (or when the user has no photo).
 *
 * Android and web continue to use the custom JS tab bar in `_layout.jsx`
 * (Metro resolves this `.ios` file only on iOS).
 */

// Render/display the avatar at a standard tab-icon point size so it matches the
// SF Symbols on the other tabs (and doesn't crowd out the "Profile" label). We
// capture at the screen pixel density and tag the resulting PNG with that scale
// (below) so UIKit shows it at exactly AVATAR_ICON_SIZE points, crisp on retina.
const AVATAR_ICON_SIZE = 28;
const AVATAR_BORDER = 1.5;

export default function TabsLayoutIOS() {
  const unread = useUnreadMessagesBadge();
  const badge = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : undefined;

  const { user } = useAuth();
  const avatarUrl = user?.profilePhotoUrl || null;

  const captureViewRef = useRef(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  // The captured PNG as a sized image source: { uri, scale, width, height }.
  // `scale` is derived from the PNG's real pixel size so it always displays at
  // AVATAR_ICON_SIZE points regardless of how view-shot rasterized it.
  const [iconSource, setIconSource] = useState(null);

  // Re-capture whenever the avatar URL changes.
  useEffect(() => {
    setAvatarLoaded(false);
    setIconSource(null);
  }, [avatarUrl]);

  useEffect(() => {
    if (!avatarUrl || !avatarLoaded) return;
    let cancelled = false;
    // Let the off-screen frame lay out for a frame before snapshotting.
    const timer = setTimeout(async () => {
      try {
        const uri = await captureRef(captureViewRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        if (cancelled) return;
        // Size the source from the PNG's actual pixels so the tab icon renders
        // at AVATAR_ICON_SIZE points (pointSize = pixelSize / scale).
        Image.getSize(
          uri,
          (pxWidth) => {
            if (cancelled) return;
            const scale = pxWidth > 0 ? pxWidth / AVATAR_ICON_SIZE : PixelRatio.get();
            setIconSource({ uri, scale, width: AVATAR_ICON_SIZE, height: AVATAR_ICON_SIZE });
          },
          () => {
            if (!cancelled) {
              setIconSource({ uri, scale: PixelRatio.get(), width: AVATAR_ICON_SIZE, height: AVATAR_ICON_SIZE });
            }
          }
        );
      } catch (e) {
        // Keep the SF Symbol fallback on any capture failure.
        console.warn("[ProfileTab] avatar icon capture failed:", e);
      }
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [avatarUrl, avatarLoaded]);

  return (
    <>
      <NativeTabs
        // Liquid Glass comes from the native bar itself; keep the background
        // transparent (don't set an opaque backgroundColor) so the material shows.
        tintColor="#8B5CF6"
        minimizeBehavior="onScrollDown"
      >
        <NativeTabs.Trigger name="match">
          <NativeTabs.Trigger.Icon sf={{ default: "bolt", selected: "bolt.fill" }} />
          <NativeTabs.Trigger.Label>Match</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Icon sf={{ default: "globe", selected: "globe.fill" }} />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="memes">
          <NativeTabs.Trigger.Icon sf={{ default: "face.smiling", selected: "face.smiling.fill" }} />
          <NativeTabs.Trigger.Label>Nudges</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="chat">
          <NativeTabs.Trigger.Icon
            sf={{ default: "ellipsis.bubble", selected: "ellipsis.bubble.fill" }}
          />
          <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
          {badge ? <NativeTabs.Trigger.Badge>{badge}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          {iconSource ? (
            <NativeTabs.Trigger.Icon src={iconSource} renderingMode="original" />
          ) : (
            <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} />
          )}
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {/* Off-screen avatar → PNG source for the native Profile tab icon.
          Positioned out of view and non-interactive; never shown directly. */}
      {avatarUrl ? (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <View ref={captureViewRef} collapsable={false} style={styles.avatarRing}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onLoad={() => setAvatarLoaded(true)}
            />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -9999,
    top: -9999,
    width: AVATAR_ICON_SIZE,
    height: AVATAR_ICON_SIZE,
  },
  avatarRing: {
    width: AVATAR_ICON_SIZE,
    height: AVATAR_ICON_SIZE,
    borderRadius: AVATAR_ICON_SIZE / 2,
    borderWidth: AVATAR_BORDER,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: AVATAR_ICON_SIZE - AVATAR_BORDER * 2,
    height: AVATAR_ICON_SIZE - AVATAR_BORDER * 2,
    borderRadius: (AVATAR_ICON_SIZE - AVATAR_BORDER * 2) / 2,
  },
});
