import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { sessionsApi } from "@/src/api/sessions";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DEVICE_ICON_BY_TYPE = {
  ios: "logo-apple",
  android: "logo-android",
  web: "globe-outline",
};

function deviceIconFor(deviceType) {
  return DEVICE_ICON_BY_TYPE[deviceType] || "hardware-chip-outline";
}

// The backend returns Postgres's default timestamptz text form, e.g.
// "2026-07-09 12:39:28.289+00" -- a space instead of "T" and a bare 2-digit
// offset instead of "+00:00"/"Z". That's not valid ISO-8601, and while
// lenient engines (V8 in a browser) parse it fine, React Native's Hermes
// engine does not and silently returns an Invalid Date -- which is why this
// was showing "Active Unknown" for everyone. Normalize before parsing.
function toParseableDate(pgTimestamp) {
  if (!pgTimestamp) return null;
  let s = pgTimestamp.replace(' ', 'T');
  s = s.replace(/([+-]\d{2})$/, '$1:00'); // "+00" -> "+00:00" (leave "+00:00"/"Z" alone, they don't match)
  return new Date(s);
}

function formatRelativeTime(pgTimestamp) {
  const then = toParseableDate(pgTimestamp);
  if (!then || Number.isNaN(then.getTime())) return "Unknown";
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

function locationLabelFor(session) {
  if (session.locationCity && session.locationCountry) return `${session.locationCity}, ${session.locationCountry}`;
  if (session.locationCity) return session.locationCity;
  if (session.locationCountry) return session.locationCountry;
  return "Location unknown";
}

/**
 * Self-contained "Active Sessions" section for the Settings screen -- lists
 * every device currently logged into this account (from auth_sessions, see
 * backend src/server/routes/sessions.routes.ts) and lets the user remotely
 * log out any device other than the one they're using right now.
 */
export default function ActiveSessionsSection() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminatingId, setTerminatingId] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await sessionsApi.getSessions(token);
      setSessions(res?.sessions || []);
    } catch (e) {
      console.error("Failed to load active sessions:", e);
      setError("Unable to load your active sessions right now.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const doTerminate = useCallback(async (session) => {
    setTerminatingId(session.id);
    try {
      await sessionsApi.terminateSession(session.id, token);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (e) {
      console.error("Failed to terminate session:", e);
      const message = "Failed to log out that device. Please try again.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setTerminatingId(null);
    }
  }, [token]);

  const handleTerminate = useCallback((session) => {
    const label = session.deviceName || "this device";
    const confirmMessage = `Log out ${label}?\n\nThis device will be signed out and stop receiving notifications.`;

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) doTerminate(session);
      return;
    }

    Alert.alert(
      "Log Out Device",
      confirmMessage,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => doTerminate(session) },
      ]
    );
  }, [doTerminate]);

  const cardStyle = !isDarkMode ? styles.cardLight : null;

  return (
    <View style={[styles.sectionCard, cardStyle]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="phone-portrait" size={20} color="#FFD6F2" />
        <Text style={styles.sectionTitle}>Active Sessions</Text>
      </View>
      <Text style={styles.sectionDescription}>
        Devices currently logged into your account. Log out any device you don't recognize.
      </Text>

      {loading ? (
        <ActivityIndicator color="#FFD6F2" style={{ marginVertical: 12 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : sessions.length === 0 ? (
        <Text style={styles.emptyText}>No active sessions found.</Text>
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => (
            <View key={session.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={deviceIconFor(session.deviceType)} size={20} color="#FFE8FF" />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.nameRow}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                      {session.deviceName || "Unknown device"}
                    </Text>
                    {session.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>This device</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.metaText}>
                    {locationLabelFor(session)} · Active {formatRelativeTime(session.lastActiveAt)}
                  </Text>
                </View>
              </View>

              {!session.isCurrent && (
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => handleTerminate(session)}
                  disabled={terminatingId === session.id}
                >
                  {terminatingId === session.id ? (
                    <ActivityIndicator size="small" color="#FF4D67" />
                  ) : (
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
          {sessions.length === 1 && sessions[0].isCurrent && (
            <Text style={styles.singleSessionNote}>
              This is your only active session -- no other devices to log out.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.25)",
  },
  cardLight: {
    backgroundColor: "#C4B5FD",
    borderColor: "#A855F7",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFE8FF",
  },
  sectionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.72)",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  singleSessionNote: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.55)",
    fontStyle: "italic",
    marginTop: 2,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 214, 242, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.15)",
    padding: 14,
    gap: 10,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 214, 242, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFE8FF",
  },
  currentBadge: {
    backgroundColor: "rgba(124, 43, 134, 0.6)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFD6F2",
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "rgba(255, 77, 103, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 103, 0.3)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF4D67",
  },
});
