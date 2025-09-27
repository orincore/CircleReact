import React from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

export default function LocationMap({ region, nearby, style }) {
  const router = useRouter();
  const openChat = (id) => {
    try {
      router.push(`/secure/chat/${encodeURIComponent(id)}`);
    } catch (_e) {
      console.log("Navigate to chat with", id);
    }
  };

  const renderCallout = (m) => {
    const img = m.photoUrl || "https://via.placeholder.com/320x180.png?text=Profile";
    return (
      <View style={styles.calloutCard}>
        <View style={styles.calloutHeader}>
          <Image source={{ uri: img }} style={styles.calloutHeaderImage} resizeMode="cover" blurRadius={2} />
          <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.35)"]} style={styles.calloutHeaderOverlay} />
          {!!m.compatibility && (
            <View style={styles.compatPill}>
              <View style={styles.compatDot} />
              <Text style={styles.compatText}>{m.compatibility}</Text>
            </View>
          )}
        </View>

        <View style={styles.calloutBody}>
          <View style={styles.row}>
            <Image source={{ uri: img }} style={styles.avatar} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.name}>
                {m.name}
              </Text>
              <Text style={styles.meta}>
                {[m.age ? String(m.age) : undefined, m.gender].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => openChat(m.id)} activeOpacity={0.9} style={styles.chatBtn}>
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <MapView style={[styles.map, style]} initialRegion={region} region={region}>
      <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="You" description="You're here" pinColor="#2563EB" />
      {nearby.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          pinColor="#16A34A"
          onCalloutPress={() => openChat(m.id)}
        >
          <Callout tooltip>
            {renderCallout(m)}
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 520,
  },
  calloutCard: {
    width: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  calloutHeader: {
    height: 150,
    position: "relative",
  },
  calloutHeaderImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 300,
    height: 150,
  },
  calloutHeaderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  compatPill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  compatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  calloutBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  meta: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  actions: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  chatBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  chatBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
