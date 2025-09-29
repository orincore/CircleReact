import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, TextInput, TouchableOpacity, Text, ScrollView } from "react-native";

export default function LocationMapWeb({ region, nearby, style, onUserPress, highlightedUserId, onRegionChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const searchMarkerRef = useRef(null);
  const [viewport, setViewport] = useState(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 375, height: 667 };
  });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fallback dummy data if none provided
  const effectiveNearby = React.useMemo(() => {
    if (nearby && nearby.length > 0) return nearby;
    const baseLat = region?.latitude ?? 12.9716;
    const baseLon = region?.longitude ?? 77.5946;
    const make = (id, name, dLat, dLon, age, gender, compatibility, photoUrl) => ({
      id,
      name,
      compatibility,
      latitude: baseLat + dLat,
      longitude: baseLon + dLon,
      age,
      gender,
      photoUrl,
    });
    return [
      make(
        "u1",
        "Aarav",
        0.008,
        0.006,
        27,
        "Male",
        "92% match",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
      ),
      make(
        "u2",
        "Ishita",
        -0.006,
        0.011,
        25,
        "Female",
        "88% match",
        "https://images.unsplash.com/photo-1544005313-3b28f0b3e3b1?q=80&w=600&auto=format&fit=crop",
      ),
      make(
        "u3",
        "Rahul",
        0.012,
        -0.007,
        29,
        "Male",
        "85% match",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
      ),
      make(
        "u4",
        "Sneha",
        -0.01,
        -0.005,
        26,
        "Female",
        "90% match",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
      ),
      make(
        "u5",
        "Vikram",
        0.004,
        -0.012,
        31,
        "Male",
        "80% match",
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=600&auto=format&fit=crop",
      ),
    ];
  }, [nearby, region?.latitude, region?.longitude]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const dynamicHeight = React.useMemo(() => {
    if (Platform.OS !== "web") {
      return 680;
    }

    const { width, height } = viewport;

    // Portrait mode (mobile-like): use smaller, fixed height to fit in parent container
    if (width < 768) {
      return 280; // Fixed height for portrait mode to fit in 300px parent container
    }

    // Landscape mode: use dynamic height based on viewport
    if (width < 1280) {
      return Math.min(980, Math.max(700, Math.floor(height * 0.82)));
    }

    return Math.min(1100, Math.max(760, Math.floor(height * 0.86)));
  }, [viewport]);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (Platform.OS !== "web") return; // limit to web for now
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
        const res = await fetch(url, { signal: controller.signal, headers: { "Accept-Language": "en" } });
        const results = await res.json();
        if (Array.isArray(results)) {
          setSuggestions(results.map((r) => ({ display_name: r.display_name, lat: r.lat, lon: r.lon })));
          setShowSuggestions(true);
        }
      } catch (_) {
        // ignore
      }
    }, 300);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  // Build popup HTML function (moved outside to be reusable)
  const buildNearbyPopupHTML = (m) => {
    const safeName = m.name ?? "User";
    const age = typeof m.age === "number" ? m.age : undefined;
    const gender = m.gender || "";
    const compat = m.compatibility || "";
    const subtitle = [age ? `${age}` : null, gender || null].filter(Boolean).join(" · ");
    const imgUrl = m.photoUrl || "https://via.placeholder.com/320x180.png?text=Profile";
    const chatId = `chat-${m.id}`;
    const chatHref = `/secure/chat/${encodeURIComponent(m.id)}`;
    return `
      <div style="width: 300px; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#0F172A;">
        <div style="position: relative; border-radius: 14px; overflow: hidden; background:#fff; box-shadow: 0 10px 24px rgba(0,0,0,0.18);">
          <div style="position: relative; height: 150px;">
            <img src="${imgUrl}" alt="${safeName}" style="width: 100%; height: 100%; object-fit: cover; filter: blur(1px); transform: scale(1.03);" />
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%);"></div>
            ${compat ? `<div style='position: absolute; top: 10px; left: 10px; display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background: rgba(255,255,255,0.9); font-size:12px; font-weight:700; color:#065F46;'><span style='display:inline-block; width:8px; height:8px; border-radius:50%; background:#22C55E;'></span><span>${compat}</span></div>` : ''}
          </div>
          <div style="padding:14px 14px 12px 14px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width: 52px; height: 52px; border-radius: 14px; overflow:hidden; border: 2px solid rgba(0,0,0,0.06); box-shadow:0 2px 6px rgba(0,0,0,0.08); background:#fff;">
                <img src="${imgUrl}" alt="${safeName}" style="width:100%; height:100%; object-fit: cover;" />
              </div>
              <div style="flex:1; min-width:0;">
                <div style="color:#0F172A; font-weight:800; line-height:1.25; font-size:17px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</div>
                ${subtitle ? `<div style='color:#475569; font-size:13px;'>${subtitle}</div>` : ""}
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:12px;">
              <a id="${chatId}" href="${chatHref}" onclick="event.preventDefault(); window.__circleGoToChat && window.__circleGoToChat('${m.id}')" style="flex:0 0 auto; display:inline-block; text-decoration:none; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%); color:#fff; border:none; border-radius:10px; padding:10px 14px; font-weight:800; cursor:pointer; box-shadow: 0 6px 12px rgba(79,70,229,0.35);">Chat</a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Initialize map only once
  useEffect(() => {
    let map;
    let L;

    (async () => {
      const leafletCssUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

      if (typeof document !== "undefined") {
        const existingLink = document.querySelector(`link[rel="stylesheet"][href="${leafletCssUrl}"]`);
        if (!existingLink) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = leafletCssUrl;
          document.head.appendChild(link);
        }

        // Inject custom popup CSS to improve visibility of our rich card
        const styleId = "circle-leaflet-popup-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = `
            .leaflet-container .leaflet-popup-content {
              margin: 0; /* remove default margin */
              overflow: visible; /* allow card shadows to render */
            }
            .leaflet-container .leaflet-popup-content-wrapper {
              padding: 0; /* our card handles spacing */
              background: transparent; /* let our card background show */
              box-shadow: none; /* avoid double shadow */
              border-radius: 0; /* our card has its own radius */
            }
            .leaflet-container .leaflet-popup-tip {
              background: #ffffff; /* subtle tip; can be transparent if desired */
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            }
            .leaflet-container .circle-nearby-popup { z-index: 5000; }
          `;
          document.head.appendChild(style);
        }

        // Expose a robust navigation helper for popup anchors
         
        window.__circleGoToChat = async (userId) => {
          const url = `/secure/chat/${encodeURIComponent(userId)}`;
          try {
            // Try expo-router first for SPA nav
            const mod = await import("expo-router");
            if (mod?.router?.push) {
              mod.router.push(url);
              return;
            }
          } catch {}
          if (typeof window !== "undefined") window.location.assign(url);
        };
      }

      // Dynamically import Leaflet only on client
      const leaflet = await import("leaflet");
      L = leaflet.default ?? leaflet;
      LRef.current = L;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const userMarkerSvg = `
        <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="userGradient" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#4F46E5" />
              <stop offset="100%" stop-color="#2563EB" />
            </linearGradient>
            <filter id="userShadow" x="0" y="0" width="36" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(37, 99, 235, 0.35)" />
            </filter>
          </defs>
          <g filter="url(#userShadow)">
            <path d="M18 46s13-12 13-22.5C31 9.729 25.075 4 18 4S5 9.729 5 23.5C5 34 18 46 18 46z" fill="url(#userGradient)" />
            <circle cx="18" cy="20" r="6" fill="#EEF2FF" />
          </g>
        </svg>
      `;

      const userIcon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userMarkerSvg)}`,
        iconSize: [36, 48],
        iconAnchor: [18, 46],
        popupAnchor: [0, -38],
      });

      const createNearbyMarkerSvg = (isHighlighted = false) => `
        <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nearbyGradient${isHighlighted ? 'Highlighted' : ''}" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${isHighlighted ? '#8B5CF6' : '#22C55E'}" />
              <stop offset="100%" stop-color="${isHighlighted ? '#7C3AED' : '#16A34A'}" />
            </linearGradient>
            <filter id="nearbyShadow${isHighlighted ? 'Highlighted' : ''}" x="0" y="0" width="32" height="44" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="${isHighlighted ? 'rgba(139, 92, 246, 0.5)' : 'rgba(22, 163, 74, 0.35)'}" />
            </filter>
          </defs>
          <g filter="url(#nearbyShadow${isHighlighted ? 'Highlighted' : ''})">
            <path d="M16 42s12-11 12-20.75C28 9.389 22.627 4 16 4S4 9.389 4 21.25C4 31 16 42 16 42z" fill="url(#nearbyGradient${isHighlighted ? 'Highlighted' : ''})" />
            <circle cx="16" cy="18" r="5" fill="${isHighlighted ? '#F5F3FF' : '#ECFDF5'}" />
          </g>
        </svg>
      `;

      const createNearbyIcon = (isHighlighted = false) => L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createNearbyMarkerSvg(isHighlighted))}`,
        iconSize: isHighlighted ? [36, 48] : [32, 44],
        iconAnchor: isHighlighted ? [18, 46] : [16, 42],
        popupAnchor: [0, isHighlighted ? -38 : -34],
      });

      // Save icons on ref for reuse in search
      LRef.current.__icons = { userIcon, createNearbyIcon };
      LRef.current.createNearbyIcon = createNearbyIcon;

      if (!containerRef.current) {
        console.warn('Map container not available');
        return;
      }

      const center = [region.latitude, region.longitude];
      
      try {
        map = L.map(containerRef.current).setView(center, 13);
      } catch (error) {
        console.error('Error initializing map:', error);
        return;
      }

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Add region change listener
      if (onRegionChange) {
        map.on('moveend', () => {
          const center = map.getCenter();
          const bounds = map.getBounds();
          const latDelta = bounds.getNorth() - bounds.getSouth();
          const lngDelta = bounds.getEast() - bounds.getWest();
          
          onRegionChange({
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          });
        });
      }

      // You marker
      L.marker(center, { icon: userIcon, title: "Your location" }).addTo(map).bindPopup("You are here");

      mapRef.current = map;
      
      // Initialize empty markers map
      if (mapRef.current) {
        mapRef.current.__nearbyMarkers = new Map();
      }
    })();

    return () => {
      try {
        if (mapRef.current) {
          // Clean up markers first
          if (mapRef.current.__nearbyMarkers) {
            mapRef.current.__nearbyMarkers.clear();
            mapRef.current.__nearbyMarkers = null;
          }
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (error) {
        console.warn('Error cleaning up map:', error);
      }
    };
  }, [region.latitude, region.longitude]); // Only recreate map when initial region changes

  // Update markers when nearby users change (without recreating map)
  useEffect(() => {
    if (!mapRef.current || !LRef.current || !effectiveNearby) return;
    
    const map = mapRef.current;
    const L = LRef.current;
    const createNearbyIcon = L.createNearbyIcon;
    
    if (!createNearbyIcon) return;
    
    try {
      // Clear existing markers
      if (map.__nearbyMarkers) {
        map.__nearbyMarkers.forEach(marker => {
          map.removeLayer(marker);
        });
        map.__nearbyMarkers.clear();
      } else {
        map.__nearbyMarkers = new Map();
      }
      
      // Add new markers
      effectiveNearby.forEach((m) => {
        const isHighlighted = highlightedUserId === m.id;
        const marker = L.marker([m.latitude, m.longitude], { 
          icon: createNearbyIcon(isHighlighted), 
          title: m.name 
        }).addTo(map);
        
        marker.bindPopup(buildNearbyPopupHTML(m), { 
          className: "circle-nearby-popup", 
          maxWidth: 360, 
          closeButton: true, 
          autoPan: true, 
          keepInView: true, 
          autoPanPadding: [24, 24] 
        });
        
        marker.on('click', () => {
          if (onUserPress) {
            onUserPress(m);
          }
        });
        
        map.__nearbyMarkers.set(m.id, marker);
      });
    } catch (error) {
      console.warn('Error updating markers:', error);
    }
  }, [effectiveNearby, highlightedUserId, onUserPress]);

  // Handle highlighting updates
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.__nearbyMarkers || !LRef.current) return;
    
    const markers = mapRef.current.__nearbyMarkers;
    const L = LRef.current;
    const createNearbyIcon = L.createNearbyIcon;
    
    if (!createNearbyIcon || !markers || markers.size === 0) return;
    
    try {
      // Update all markers based on highlighting
      markers.forEach((marker, userId) => {
        if (marker && marker.setIcon) {
          const isHighlighted = highlightedUserId === userId;
          marker.setIcon(createNearbyIcon(isHighlighted));
        }
      });
    } catch (error) {
      console.warn('Error updating marker highlighting:', error);
    }
  }, [highlightedUserId]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    if (!mapRef.current || !LRef.current) return;
    try {
      setSearching(true);
      setShowSuggestions(false);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim(),
      )}&limit=1`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
      });
      const results = await res.json();
      if (Array.isArray(results) && results.length) {
        const first = results[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        const L = LRef.current;
        const map = mapRef.current;

        map.setView([lat, lon], 13, { animate: true });

        // Create a distinct icon for search result (purple)
        const searchMarkerSvg = `
          <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="searchGradient" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#8B5CF6" />
                <stop offset="100%" stop-color="#7C3AED" />
              </linearGradient>
              <filter id="searchShadow" x="0" y="0" width="32" height="44" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(124, 58, 237, 0.35)" />
              </filter>
            </defs>
            <g filter="url(#searchShadow)">
              <path d="M16 42s12-11 12-20.75C28 9.389 22.627 4 16 4S4 9.389 4 21.25C4 31 16 42 16 42z" fill="url(#searchGradient)" />
              <circle cx="16" cy="18" r="5" fill="#F5F3FF" />
            </g>
          </svg>
        `;
        const searchIcon = L.icon({
          iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(searchMarkerSvg)}`,
          iconSize: [32, 44],
          iconAnchor: [16, 42],
          popupAnchor: [0, -34],
        });

        if (searchMarkerRef.current) {
          try { searchMarkerRef.current.remove(); } catch {}
        }
        searchMarkerRef.current = L.marker([lat, lon], { icon: searchIcon, title: first.display_name })
          .addTo(map)
          .bindPopup(first.display_name)
          .openPopup();
      }
    } catch (e) {
      // Silent fail; in production, show toast
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.display_name);
    setShowSuggestions(false);
    if (!mapRef.current || !LRef.current) return;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const L = LRef.current;
    const map = mapRef.current;

    map.setView([lat, lon], 13, { animate: true });

    const searchMarkerSvg = `
      <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="searchGradient" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#8B5CF6" />
            <stop offset="100%" stop-color="#7C3AED" />
          </linearGradient>
          <filter id="searchShadow" x="0" y="0" width="32" height="44" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(124, 58, 237, 0.35)" />
          </filter>
        </defs>
        <g filter="url(#searchShadow)">
          <path d="M16 42s12-11 12-20.75C28 9.389 22.627 4 16 4S4 9.389 4 21.25C4 31 16 42 16 42z" fill="url(#searchGradient)" />
          <circle cx="16" cy="18" r="5" fill="#F5F3FF" />
        </g>
      </svg>
    `;
    const searchIcon = L.icon({
      iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(searchMarkerSvg)}`,
      iconSize: [32, 44],
      iconAnchor: [16, 42],
      popupAnchor: [0, -34],
    });

    if (searchMarkerRef.current) {
      try { searchMarkerRef.current.remove(); } catch {}
    }
    searchMarkerRef.current = L.marker([lat, lon], { icon: searchIcon, title: item.display_name })
      .addTo(map)
      .bindPopup(item.display_name)
      .openPopup();
  };

  return (
    <View style={[styles.wrapper, { height: dynamicHeight }, style]}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: "100%", position: "relative", zIndex: 0 }}
      />
      {/* Overlay search bar (web + native) */}
      <View style={styles.searchBarContainer} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or location"
            placeholderTextColor="#8A8A8A"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchBtn} disabled={searching}>
            <Text style={styles.searchBtnText}>{searching ? "..." : "Search"}</Text>
          </TouchableOpacity>
        </View>
        {showSuggestions && suggestions.length > 0 ? (
          <View style={styles.suggestionsWrapper}>
            <ScrollView style={styles.suggestionsScroll}>
              {suggestions.map((s, idx) => (
                <TouchableOpacity key={`${s.lat}-${s.lon}-${idx}`} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(s)}>
                  <Text numberOfLines={2} style={styles.suggestionText}>{s.display_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    minHeight: 420,
    position: "relative",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  searchBarContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5000,
    alignSelf: "stretch",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    ...(Platform.OS === "web" ? { boxShadow: "0 6px 16px rgba(0,0,0,0.18)" } : {}),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F1147",
    paddingVertical: 8,
  },
  searchBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  suggestionsWrapper: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 6000,
    ...(Platform.OS === "web" ? { boxShadow: "0 8px 18px rgba(0,0,0,0.15)" } : {}),
  },
  suggestionsScroll: {
    maxHeight: 240,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
  },
  suggestionText: {
    color: "#1F1147",
    fontSize: 14,
  },
});
