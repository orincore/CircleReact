import React, { useEffect } from "react";
import { VideoView } from "expo-video";
import useSelfStoppingVideoPlayer from "@/src/hooks/useSelfStoppingVideoPlayer";

/**
 * Thin wrapper around expo-video that mirrors the subset of the old expo-av
 * `<Video>` API the chat media viewer relied on (uri source, native controls,
 * contain fit, play/pause driven by which page is visible).
 *
 * expo-av was removed in Expo SDK 56 (its legacy EX* Objective-C module API no
 * longer exists in expo-modules-core), so playback now goes through expo-video.
 * `useVideoPlayer` is a hook, so callers render this component (e.g. inside a
 * FlatList `renderItem`) instead of `<Video>` directly. Pass a fresh `key={uri}`
 * when the source can change so the player re-initialises with the new URL.
 */
export default function ChatVideoPlayer({ uri, style, autoPlay = false }) {
  // Self-stopping wrapper (not raw useVideoPlayer): guarantees the player is
  // muted/paused/unloaded before release on unmount, so a video that's
  // playing when the viewer closes can't keep its audio going. See the
  // hook's comments for why the raw hook can leak a playing player.
  const player = useSelfStoppingVideoPlayer(uri, (p) => {
    p.loop = false;
    if (autoPlay) {
      p.play();
    }
  });

  // The visible page in the media viewer changes as the user swipes; keep the
  // player's play/pause state in sync with that.
  useEffect(() => {
    if (!player) return;
    if (autoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [autoPlay, player]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}
