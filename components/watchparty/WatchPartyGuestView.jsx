import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchParty } from "@/contexts/WatchPartyContext";
import { feedApi } from "@/src/api/feed";
import MemeCard from "@/components/MemeCard";
import WatchPartyBar from "@/components/watchparty/WatchPartyBar";

// A guest doesn't scroll their own personalized feed during a party -- the
// host drives the position, so this just fetches whatever meme is currently
// "up" by id (per session.current_index into session.meme_ids) and shows it
// full-screen, exactly like the host's own card at that position.
export default function WatchPartyGuestView({ height, width }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { session } = useWatchParty();
  const [meme, setMeme] = useState(null);
  const cache = useRef(new Map());

  const currentMemeId = session?.meme_ids?.[session.current_index];

  useEffect(() => {
    if (!currentMemeId) return;
    const cached = cache.current.get(currentMemeId);
    if (cached) {
      setMeme(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { meme: m } = await feedApi.getMeme(currentMemeId, token);
        if (cancelled || !m) return;
        cache.current.set(currentMemeId, m);
        setMeme(m);
      } catch (error) {
        console.error("[watch-party] Failed to load current meme:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [currentMemeId, token]);

  if (!meme || !height || !width) {
    return <View style={[styles.fill, { backgroundColor: "#000" }]} />;
  }

  return (
    <View style={styles.fill}>
      <MemeCard
        item={meme}
        isFocused
        height={height}
        width={width}
        bottomInset={insets.bottom}
        onLike={() => {}}
        onOpenComments={() => {}}
        onShare={() => {}}
        onCompose={() => {}}
      />
      <WatchPartyBar topOffset={insets.top + 8} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
