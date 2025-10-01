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
            /* High contrast dark theme map container */
            .leaflet-container {
              background: #0f172a;
            }
            
            /* Improve road and label visibility */
            .leaflet-tile-pane {
              filter: contrast(1.1) brightness(1.05);
            }
            
            /* Popup styling */
            .leaflet-container .leaflet-popup-content {
              margin: 0;
              overflow: visible;
            }
            .leaflet-container .leaflet-popup-content-wrapper {
              padding: 0;
              background: transparent;
              box-shadow: none;
              border-radius: 0;
            }
            .leaflet-container .leaflet-popup-tip {
              background: #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            }
            .leaflet-container .circle-nearby-popup { 
              z-index: 5000; 
            }
            
            /* Marker animations */
            .marker-highlighted {
              animation: pulse-glow 2s ease-in-out infinite;
            }
            
            .marker-user-location {
              animation: pulse-user 3s ease-in-out infinite;
            }
            
            @keyframes pulse-glow {
              0%, 100% { 
                filter: drop-shadow(0 0 8px rgba(255, 111, 181, 0.6)) drop-shadow(0 0 16px rgba(161, 106, 232, 0.4));
                transform: scale(1);
              }
              50% { 
                filter: drop-shadow(0 0 12px rgba(255, 111, 181, 0.8)) drop-shadow(0 0 24px rgba(161, 106, 232, 0.6));
                transform: scale(1.05);
              }
            }
            
            @keyframes pulse-user {
              0%, 100% { 
                filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.5));
              }
              50% { 
                filter: drop-shadow(0 0 12px rgba(37, 99, 235, 0.7));
              }
            }
            
            /* Map controls - high contrast */
            .leaflet-control-zoom a {
              background-color: rgba(15, 23, 42, 0.95) !important;
              color: #ffffff !important;
              border: 2px solid rgba(255, 255, 255, 0.3) !important;
              font-weight: bold !important;
            }
            
            .leaflet-control-zoom a:hover {
              background-color: rgba(124, 43, 134, 0.95) !important;
              border-color: rgba(255, 111, 181, 0.6) !important;
            }
            
            .leaflet-bar {
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
              border: 2px solid rgba(255, 255, 255, 0.2) !important;
            }
            
            /* Improve attribution contrast */
            .leaflet-control-attribution {
              background-color: rgba(15, 23, 42, 0.8) !important;
              color: rgba(255, 255, 255, 0.7) !important;
              border: 1px solid rgba(255, 255, 255, 0.2) !important;
            }
            
            .leaflet-control-attribution a {
              color: #A16AE8 !important;
            }
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

      // User location marker - modern pin design with strong contrast
      const userMarkerSvg = `
        <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="userShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
            </filter>
          </defs>
          <g filter="url(#userShadow)">
            <!-- Outer glow ring -->
            <circle cx="22" cy="22" r="16" fill="#3B82F6" opacity="0.3"/>
            <!-- Pin body -->
            <path d="M22 52C22 52 38 36 38 22C38 11.5066 29.9411 3 22 3C14.0589 3 6 11.5066 6 22C6 36 22 52 22 52Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
            <!-- Inner white circle -->
            <circle cx="22" cy="22" r="10" fill="#FFFFFF"/>
            <!-- Inner blue dot -->
            <circle cx="22" cy="22" r="6" fill="#3B82F6"/>
          </g>
        </svg>
      `;

      const userIcon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userMarkerSvg)}`,
        iconSize: [44, 56],
        iconAnchor: [22, 52],
        popupAnchor: [0, -44],
        className: 'marker-user-location'
      });

      // Nearby user markers - modern pin design with high contrast
      const createNearbyMarkerSvg = (isHighlighted = false) => {
        const size = isHighlighted ? 48 : 40;
        const height = isHighlighted ? 60 : 52;
        const cx = size / 2;
        const cy = cx;
        
        return `
        <svg width="${size}" height="${height}" viewBox="0 0 ${size} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pinGradient${isHighlighted ? 'H' : 'N'}" x1="${cx}" y1="0" x2="${cx}" y2="${cy * 2}" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${isHighlighted ? '#FF6FB5' : '#A16AE8'}" />
              <stop offset="100%" stop-color="${isHighlighted ? '#C026D3' : '#7C3AED'}" />
            </linearGradient>
            <filter id="pinShadow${isHighlighted ? 'H' : 'N'}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="${isHighlighted ? 6 : 4}" stdDeviation="${isHighlighted ? 5 : 3}" flood-color="#000000" flood-opacity="0.4"/>
            </filter>
          </defs>
          <g filter="url(#pinShadow${isHighlighted ? 'H' : 'N'})">
            ${isHighlighted ? `<circle cx="${cx}" cy="${cy}" r="${cx - 4}" fill="#FF6FB5" opacity="0.25"/>` : ''}
            <!-- Pin body with white stroke for contrast -->
            <path d="M${cx} ${height - 4}C${cx} ${height - 4} ${size - 4} ${cy + 10} ${size - 4} ${cy}C${size - 4} ${cy * 0.45} ${cx + (cx * 0.45)} 4 ${cx} 4C${cx - (cx * 0.45)} 4 4 ${cy * 0.45} 4 ${cy}C4 ${cy + 10} ${cx} ${height - 4} ${cx} ${height - 4}Z" 
                  fill="url(#pinGradient${isHighlighted ? 'H' : 'N'})" 
                  stroke="#FFFFFF" 
                  stroke-width="${isHighlighted ? 3 : 2.5}"/>
            <!-- Inner white circle -->
            <circle cx="${cx}" cy="${cy}" r="${isHighlighted ? 11 : 9}" fill="#FFFFFF"/>
            <!-- Inner colored dot -->
            <circle cx="${cx}" cy="${cy}" r="${isHighlighted ? 7 : 5}" fill="${isHighlighted ? '#FF6FB5' : '#A16AE8'}"/>
            ${isHighlighted ? `
            <!-- Animated ring for highlighted pins -->
            <circle cx="${cx}" cy="${cy}" r="${cx - 6}" fill="none" stroke="#FF6FB5" stroke-width="2" opacity="0.6">
              <animate attributeName="r" values="${cx - 8};${cx - 4};${cx - 8}" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
            </circle>
            ` : ''}
          </g>
        </svg>
      `;
      };

      const createNearbyIcon = (isHighlighted = false) => L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createNearbyMarkerSvg(isHighlighted))}`,
        iconSize: isHighlighted ? [48, 60] : [40, 52],
        iconAnchor: isHighlighted ? [24, 56] : [20, 48],
        popupAnchor: [0, isHighlighted ? -48 : -40],
        className: isHighlighted ? 'marker-highlighted' : 'marker-normal'
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

      // High contrast dark theme map tiles for better visibility
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      
      // Add labels layer on top for better readability
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'shadowPane'
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
    setQuery('');
    setShowSuggestions(false);
    if (!mapRef.current || !LRef.current) return;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const L = LRef.current;
    const map = mapRef.current;

    map.setView([lat, lon], 13, { animate: true });

    // Search result marker - modern pin design with distinct color
    const searchMarkerSvg = `
      <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="searchGradient" x1="22" y1="0" x2="22" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <filter id="searchShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
          </filter>
        </defs>
        <g filter="url(#searchShadow)">
          <!-- Outer glow ring -->
          <circle cx="22" cy="22" r="16" fill="#10B981" opacity="0.3"/>
          <!-- Pin body with white stroke -->
          <path d="M22 52C22 52 38 36 38 22C38 11.5066 29.9411 3 22 3C14.0589 3 6 11.5066 6 22C6 36 22 52 22 52Z" 
                fill="url(#searchGradient)" 
                stroke="#FFFFFF" 
                stroke-width="3"/>
          <!-- Inner white circle -->
          <circle cx="22" cy="22" r="10" fill="#FFFFFF"/>
          <!-- Search icon -->
          <circle cx="22" cy="21" r="5" fill="none" stroke="#10B981" stroke-width="2"/>
          <line x1="25.5" y1="24.5" x2="28" y2="27" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>
    `;
    const searchIcon = L.icon({
      iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(searchMarkerSvg)}`,
      iconSize: [44, 56],
      iconAnchor: [22, 52],
      popupAnchor: [0, -44],
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
