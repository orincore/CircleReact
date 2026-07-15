import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/src/hooks/useSocket";
import { watchPartyApi } from "@/src/api/watchParty";

// Global "Scroll Together" (watch party) state -- mirrors JamSessionContext's
// pattern (mounted once at app/secure/_layout.jsx so a party survives
// navigating around, not just while the memes screen happens to be mounted).
const WatchPartyContext = createContext(null);

export function WatchPartyProvider({ children }) {
  const { token, user } = useAuth();
  const socket = useSocket();
  const myUserId = user?.id ? String(user.id) : null;

  const [session, setSession] = useState(null); // { id, host_id, status, meme_ids, current_index }
  const [participants, setParticipants] = useState([]);
  const [reactions, setReactions] = useState([]); // ephemeral floating reactions
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const isHost = !!(session && myUserId && String(session.host_id) === myUserId);

  const belongsToThisParty = useCallback((sessionId) => {
    return sessionRef.current && sessionRef.current.id === sessionId;
  }, []);

  const refreshParticipants = useCallback(async (sessionId) => {
    if (!token) return;
    try {
      const { session: s, participants: p } = await watchPartyApi.getSession(sessionId, token);
      if (!belongsToThisParty(sessionId)) return;
      if (s) setSession(s);
      setParticipants(Array.isArray(p) ? p : []);
    } catch (error) {
      console.error("[watch-party] Failed to refresh participants:", error);
    }
  }, [token, belongsToThisParty]);

  const joinRoom = useCallback((sessionId) => {
    if (!socket || !sessionId) return;
    socket.emit("watch-party:join_room", { sessionId });
  }, [socket]);

  const leaveRoom = useCallback((sessionId) => {
    if (!socket || !sessionId) return;
    socket.emit("watch-party:leave_room", { sessionId });
  }, [socket]);

  const startParty = useCallback(async (memeIds) => {
    if (!token || !Array.isArray(memeIds) || memeIds.length === 0) return null;
    try {
      const { session: s } = await watchPartyApi.start(memeIds, token);
      setSession(s);
      setParticipants([]);
      joinRoom(s.id);
      refreshParticipants(s.id);
      return s;
    } catch (error) {
      console.error("[watch-party] Failed to start:", error);
      Alert.alert("Error", "Failed to start watch party.");
      return null;
    }
  }, [token, joinRoom, refreshParticipants]);

  const joinParty = useCallback(async (sessionId) => {
    if (!token || !sessionId) return null;
    try {
      const { session: s, participants: p } = await watchPartyApi.join(sessionId, token);
      setSession(s);
      setParticipants(Array.isArray(p) ? p : []);
      joinRoom(sessionId);
      return s;
    } catch (error) {
      console.error("[watch-party] Failed to join:", error);
      Alert.alert("Error", "This watch party is no longer available.");
      return null;
    }
  }, [token, joinRoom]);

  const leaveParty = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    leaveRoom(current.id);
    setSession(null);
    setParticipants([]);
    setReactions([]);
    try {
      await watchPartyApi.leave(current.id, token);
    } catch (error) {
      console.error("[watch-party] Failed to leave:", error);
    }
  }, [token, leaveRoom]);

  const endParty = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await watchPartyApi.end(current.id, token);
    } catch (error) {
      console.error("[watch-party] Failed to end:", error);
    }
  }, [token]);

  const extendParty = useCallback(async (memeIds) => {
    const current = sessionRef.current;
    if (!current || !memeIds?.length) return;
    try {
      const { session: s } = await watchPartyApi.extend(current.id, memeIds, token);
      if (s && belongsToThisParty(s.id)) setSession(s);
    } catch (error) {
      console.error("[watch-party] Failed to extend:", error);
    }
  }, [token, belongsToThisParty]);

  const advance = useCallback(async (index) => {
    const current = sessionRef.current;
    if (!current) return;
    // Optimistic local update -- the host is the one driving this, no need
    // to wait on the broadcast to see their own scroll reflected.
    setSession((prev) => (prev && prev.id === current.id ? { ...prev, current_index: index } : prev));
    try {
      await watchPartyApi.advance(current.id, index, token);
    } catch (error) {
      console.error("[watch-party] Failed to advance:", error);
    }
  }, [token]);

  const sendReaction = useCallback(async (emoji) => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await watchPartyApi.react(current.id, emoji, token);
    } catch (error) {
      console.error("[watch-party] Failed to send reaction:", error);
    }
  }, [token]);

  const invite = useCallback(async (userIds) => {
    const current = sessionRef.current;
    if (!current || !userIds?.length) return;
    try {
      await watchPartyApi.invite(current.id, userIds, token);
    } catch (error) {
      console.error("[watch-party] Failed to invite:", error);
      Alert.alert("Error", "Failed to send invites.");
    }
  }, [token]);

  // Resume an active party this user is already hosting (e.g. app relaunch).
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { session: s } = await watchPartyApi.getActive(token);
        if (s) {
          setSession(s);
          joinRoom(s.id);
          refreshParticipants(s.id);
        }
      } catch (error) {
        console.error("[watch-party] Failed to resume active party:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Socket event wiring.
  useEffect(() => {
    if (!socket) return;

    const onAdvance = ({ sessionId, currentIndex }) => {
      if (!belongsToThisParty(sessionId)) return;
      setSession((prev) => (prev ? { ...prev, current_index: currentIndex } : prev));
    };

    const onParticipantJoined = ({ sessionId }) => {
      if (!belongsToThisParty(sessionId)) return;
      refreshParticipants(sessionId);
    };

    const onParticipantLeft = ({ sessionId }) => {
      if (!belongsToThisParty(sessionId)) return;
      refreshParticipants(sessionId);
    };

    const onEnded = ({ sessionId }) => {
      if (!belongsToThisParty(sessionId)) return;
      setSession(null);
      setParticipants([]);
      setReactions([]);
    };

    const onReaction = ({ sessionId, userId, emoji }) => {
      if (!belongsToThisParty(sessionId)) return;
      const id = `${userId}-${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, userId, emoji }]);
      // Ephemeral -- fade out and drop after ~2.5s, matches the "quick UI"
      // reaction overlay intent (not a persisted chat-style log).
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    };

    const onInvite = ({ sessionId, hostId }) => {
      Alert.alert(
        "Scroll Together",
        "A friend invited you to watch nudges together.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Join", onPress: () => joinParty(sessionId) },
        ]
      );
    };

    socket.on("watch-party:advance", onAdvance);
    socket.on("watch-party:participant_joined", onParticipantJoined);
    socket.on("watch-party:participant_left", onParticipantLeft);
    socket.on("watch-party:ended", onEnded);
    socket.on("watch-party:reaction", onReaction);
    socket.on("watch-party:invite", onInvite);

    return () => {
      socket.off("watch-party:advance", onAdvance);
      socket.off("watch-party:participant_joined", onParticipantJoined);
      socket.off("watch-party:participant_left", onParticipantLeft);
      socket.off("watch-party:ended", onEnded);
      socket.off("watch-party:reaction", onReaction);
      socket.off("watch-party:invite", onInvite);
    };
  }, [socket, belongsToThisParty, refreshParticipants, joinParty]);

  const value = {
    session,
    participants,
    reactions,
    isHost,
    startParty,
    joinParty,
    leaveParty,
    endParty,
    extendParty,
    advance,
    sendReaction,
    invite,
  };

  return <WatchPartyContext.Provider value={value}>{children}</WatchPartyContext.Provider>;
}

export function useWatchParty() {
  const ctx = useContext(WatchPartyContext);
  if (!ctx) throw new Error("useWatchParty must be used within a WatchPartyProvider");
  return ctx;
}
