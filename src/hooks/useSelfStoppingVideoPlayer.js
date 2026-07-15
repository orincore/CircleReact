import { useEffect, useRef } from 'react';
import { useVideoPlayer } from 'expo-video';

/**
 * Drop-in replacement for expo-video's useVideoPlayer that guarantees the
 * player is actually SILENCED before it's released on unmount.
 *
 * Why this exists: useVideoPlayer releases its native player in an internal
 * useEffect cleanup. React runs unmount cleanups in *declaration order*, and
 * useVideoPlayer is necessarily called before any effect in the consuming
 * component -- so by the time a consumer's own cleanup runs, the player is
 * already released and every property set / method call on it throws
 * (usually swallowed by a defensive try/catch, making the "stop on unmount"
 * code a silent no-op).
 *
 * That mattered because release() itself does NOT stop playback -- it only
 * detaches the JS reference. The native player keeps playing until the
 * native object is deallocated, which can be delayed indefinitely (pending
 * async work, GC timing). A card that unmounts while playing -- e.g. a
 * FlashList cell recycled for a different item in the same commit that moved
 * focus, so it never re-rendered with isFocused=false -- leaked a playing,
 * looping player that nothing in the app held a reference to anymore. Its
 * audio kept looping over other videos and survived leaving the tab
 * entirely, because no code path could ever reach it again.
 *
 * The fix is ordering: this hook declares its stop-effect BEFORE calling
 * useVideoPlayer, so on unmount the stop cleanup runs FIRST, while the
 * player is still alive. It mutes (synchronous native property -- lands
 * immediately even if the async play/pause queue is backed up), pauses, and
 * unloads the source via replace(null) so a loop=true player has literally
 * nothing left to loop. Only then does useVideoPlayer's own cleanup release
 * the (now silent, empty) player.
 *
 * Constraint: like the raw hook when used in recycled lists, the source must
 * be stable for the lifetime of the component instance -- key the consuming
 * component by the source URI so a source change is a remount, not a prop
 * change (all current consumers already do this).
 */
export default function useSelfStoppingVideoPlayer(source, setup) {
  const playerRef = useRef(null);

  useEffect(() => {
    return () => {
      const player = playerRef.current;
      playerRef.current = null;
      if (!player) return;
      // Each call individually guarded: if any one throws (e.g. the player
      // was somehow already released), the remaining stop attempts still run.
      try { player.muted = true; } catch {}
      try { player.pause(); } catch {}
      // Second arg silences the "replace loads synchronously on iOS" warning
      // -- irrelevant here, a null source loads nothing, it only clears the
      // current item.
      try { player.replace(null, true); } catch {}
    };
  }, []);

  const player = useVideoPlayer(source, setup);
  playerRef.current = player;
  return player;
}
