import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { announcementsAdminApi } from '@/src/api/announcementsAdmin';
import { API_BASE_URL } from '@/src/api/config';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';

export default function AdminAnnouncements() {
  const router = useRouter();
  const [token, setToken] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState({});
  const [deleting, setDeleting] = useState({});
  const [listRefreshing, setListRefreshing] = useState(false);

  const [announcements, setAnnouncements] = useState([]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [buttons, setButtons] = useState([{ label: '', url: '' }]);
  const [priority, setPriority] = useState('0');
  const [startsAt, setStartsAt] = useState(''); // IST local input string: YYYY-MM-DDTHH:mm
  const [endsAt, setEndsAt] = useState('');     // IST local input string
  const [isActive, setIsActive] = useState(true);
  const [sendPushOnPublish, setSendPushOnPublish] = useState(false);
  const [postNow, setPostNow] = useState(false);
  const [placements, setPlacements] = useState({ global: true, match: true, explore: true });
  const [editingId, setEditingId] = useState(null);

  const selectedPlacements = useMemo(() =>
    Object.entries(placements).filter(([, v]) => v).map(([k]) => k),
  [placements]);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await announcementsAdminApi.list(token, { limit: 100 });
      setAnnouncements(Array.isArray(resp.announcements) ? resp.announcements : []);
    } catch (e) {
      // show inline error text via state if needed
    } finally {
      setLoading(false);
    }
  };

  // ==== IST helpers (UTC+05:30) ====
  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
  const toISTLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istMs = utcMs + 330 * 60000; // +05:30
    const ist = new Date(istMs);
    const y = ist.getUTCFullYear();
    const m = pad2(ist.getUTCMonth() + 1);
    const day = pad2(ist.getUTCDate());
    const hh = pad2(ist.getUTCHours());
    const mm = pad2(ist.getUTCMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };
  const fromISTToISO = (istLocal) => {
    if (!istLocal) return undefined;
    // istLocal like 'YYYY-MM-DDTHH:mm'
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(istLocal);
    if (!m) return undefined;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const h = parseInt(m[4], 10);
    const mi = parseInt(m[5], 10);
    const istUtcMs = Date.UTC(y, mo, d, h, mi, 0);
    const utcMs = istUtcMs - 330 * 60000; // subtract 5h30m to get UTC
    return new Date(utcMs).toISOString();
  };

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('authToken');
        setToken(t);
      } catch {}
      load();
    })();
  }, [/* run once on mount; load() internally checks token */]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setImageUrl('');
    setLinkUrl('');
    setButtons([{ label: '', url: '' }]);
    setPriority('0');
    setStartsAt('');
    setEndsAt('');
    setIsActive(true);
    setSendPushOnPublish(false);
    setPostNow(false);
    setPlacements({ global: true, match: true, explore: true });
    setEditingId(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!token) return;
    if (!message.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Message is required');
      } else {
        // Alert.alert fallback guideline: ensure web works
        // Using inline or native alert conditionally handled above
      }
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim() || undefined,
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        placements: selectedPlacements.length ? selectedPlacements : undefined,
        buttons: (buttons || [])
          .filter(b => (b.label && b.label.trim()) || (b.url && b.url.trim()))
          .map(b => ({ label: b.label?.trim() || 'Open', url: b.url?.trim() || '/' })),
        priority: Number.isFinite(parseInt(priority)) ? parseInt(priority) : 0,
        startsAt: postNow ? undefined : fromISTToISO(startsAt.trim()),
        endsAt: postNow ? undefined : fromISTToISO(endsAt.trim()),
        isActive,
        sendPushOnPublish,
      };
      let id = editingId;
      if (editingId) {
        await announcementsAdminApi.update(editingId, payload, token);
      } else {
        const resp = await announcementsAdminApi.create(payload, token);
        id = resp?.announcement?.id || id;
      }
      if (postNow && id) {
        await announcementsAdminApi.publish(id, !!sendPushOnPublish, token);
      }
      resetForm();
      await load();
      if (Platform.OS === 'web') {
        window.alert(editingId ? 'Announcement updated' : 'Announcement created');
      }
    } catch (e) {
      if (Platform.OS === 'web') window.alert(editingId ? 'Failed to update announcement' : 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (a) => {
    try {
      setEditingId(a.id);
      setTitle(a.title || '');
      setMessage(a.message || '');
      setImageUrl(a.image_url || a.imageUrl || '');
      setLinkUrl(a.link_url || a.linkUrl || '');
      const b = Array.isArray(a.buttons) ? a.buttons : [];
      setButtons(b.length ? b.map(x => ({ label: x.label || '', url: x.url || '' })) : [{ label: '', url: '' }]);
      setPriority(String(a.priority ?? 0));
      setStartsAt(toISTLocalInput(a.starts_at || a.startsAt));
      setEndsAt(toISTLocalInput(a.ends_at || a.endsAt));
      setIsActive(!!(a.is_active ?? a.isActive ?? true));
      setSendPushOnPublish(!!(a.send_push_on_publish ?? a.sendPushOnPublish ?? false));
      const arr = Array.isArray(a.placements) ? a.placements : [];
      setPlacements({
        global: arr.includes('global') || arr.length === 0,
        match: arr.includes('match'),
        explore: arr.includes('explore'),
      });
      if (Platform.OS === 'web') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {}
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handlePublish = async (id) => {
    if (!token) return;
    try {
      setPublishing((p) => ({ ...p, [id]: true }));
      await announcementsAdminApi.publish(id, true, token);
      await load();
      if (Platform.OS === 'web') window.alert('Published and push enqueued');
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Failed to publish');
    } finally {
      setPublishing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!token) return;
    try {
      if (Platform.OS === 'web') {
        const ok = window.confirm('Delete announcement?');
        if (!ok) return;
      }
      setDeleting((d) => ({ ...d, [id]: true }));
      await announcementsAdminApi.delete(id, token);
      await load();
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Failed to delete');
    } finally {
      setDeleting((d) => ({ ...d, [id]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1F1147", "#2D1B69", "#1F1147"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name="megaphone" size={22} color="#FFD6F2" /></View>
            <Text style={styles.headerTitle}>Admin · Announcements</Text>
          </View>

          {/* Create Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Announcement</Text>
            <View style={styles.row}><Text style={styles.label}>Title</Text><TextInput value={title} onChangeText={setTitle} placeholder="Optional" placeholderTextColor="#aaa" style={styles.input} /></View>
            <View style={styles.row}><Text style={styles.label}>Message *</Text><TextInput value={message} onChangeText={setMessage} placeholder="Your text..." placeholderTextColor="#aaa" style={[styles.input, styles.inputMultiline]} multiline /></View>
            <View style={styles.row}>
              <Text style={styles.label}>Banner Image</Text>
              <View style={styles.rowInline}>
                <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor="#aaa" style={[styles.input, { flex: 1 }]} />
                <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                  try {
                    if (Platform.OS === 'web') {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async () => {
                        try {
                          const file = input.files && input.files[0];
                          if (!file) return;
                          const form = new FormData();
                          form.append('file', file);
                          form.append('type', 'image');
                          const authHeader = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
                          const res = await fetch(`${API_BASE_URL}/api/upload/media`, {
                            method: 'POST',
                            headers: authHeader ? { 'Authorization': authHeader } : {},
                            body: form,
                          });
                          if (res.status === 401) {
                            if (window?.alert) window.alert('Unauthorized. Please ensure you are logged in and using the correct environment.');
                            return;
                          }
                          const json = await res.json();
                          if (json?.url) setImageUrl(json.url);
                          else if (window?.alert) window.alert('Upload failed');
                        } catch (e) {
                          if (window?.alert) window.alert('Upload failed');
                        }
                      };
                      input.click();
                    } else {
                      if (Platform.OS !== 'web') {
                        // Keep URL entry for native for now. To support native picker, integrate expo-image-picker later.
                        if (Platform.OS === 'ios' || Platform.OS === 'android') {
                          // Minimal notice
                        }
                      }
                    }
                  } catch {}
                }}>
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
                {!token && (
                  <Text style={{ color: '#fff', opacity: 0.7, fontSize: 12 }}>
                    Login required to upload (or paste an image URL)
                  </Text>
                )}
              </View>
            </View>

            {/* Optional deep link (kept for legacy) */}
            <View style={styles.row}><Text style={styles.label}>Link URL (optional)</Text><TextInput value={linkUrl} onChangeText={setLinkUrl} placeholder="/features or https://..." placeholderTextColor="#aaa" style={styles.input} /></View>

            {/* Buttons */}
            <View style={styles.row}>
              <Text style={styles.label}>Buttons</Text>
              {buttons.map((b, idx) => (
                <View key={idx} style={styles.rowInline}>
                  <TextInput
                    value={b.label}
                    onChangeText={(t) => setButtons(prev => prev.map((x, i) => i === idx ? { ...x, label: t } : x))}
                    placeholder="Label (e.g., Learn more)"
                    placeholderTextColor="#aaa"
                    style={[styles.input, { flex: 1 }]} />
                  <TextInput
                    value={b.url}
                    onChangeText={(t) => setButtons(prev => prev.map((x, i) => i === idx ? { ...x, url: t } : x))}
                    placeholder="/path or https://..."
                    placeholderTextColor="#aaa"
                    style={[styles.input, { flex: 1 }]} />
                </View>
              ))}
              <View style={styles.rowInline}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.publishBtn]}
                  onPress={() => setButtons(prev => (prev.length < 2 ? [...prev, { label: '', url: '' }] : prev))}
                >
                  <Text style={styles.smallBtnText}>Add Button</Text>
                </TouchableOpacity>
                {buttons.length > 1 && (
                  <TouchableOpacity
                    style={[styles.smallBtn, styles.deleteBtn]}
                    onPress={() => setButtons(prev => prev.slice(0, -1))}
                  >
                    <Text style={styles.smallBtnText}>Remove Last</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.rowInline}>
              <Text style={styles.label}>Placements</Text>
              <View style={styles.placements}>
                {['global','match','explore'].map((p) => (
                  <View key={p} style={styles.placementItem}>
                    <Switch value={!!placements[p]} onValueChange={(v) => setPlacements(prev => ({ ...prev, [p]: v }))} />
                    <Text style={styles.placementText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.rowInline}>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Priority</Text>
                <TextInput value={priority} onChangeText={setPriority} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Active</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Push on Publish</Text>
                <Switch value={sendPushOnPublish} onValueChange={setSendPushOnPublish} />
              </View>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Post Immediately</Text>
                <Switch value={postNow} onValueChange={setPostNow} />
              </View>
            </View>

            <View style={[styles.rowInline, postNow && { opacity: 0.5 }] }>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Starts At</Text>
                {Platform.OS === 'web' ? (
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{
                    padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff'
                  }} />
                ) : (
                  <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="YYYY-MM-DDTHH:mm (IST)" placeholderTextColor="#aaa" style={styles.input} />
                )}
              </View>
              <View style={styles.inlineItem}>
                <Text style={styles.label}>Ends At</Text>
                {Platform.OS === 'web' ? (
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{
                    padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff'
                  }} />
                ) : (
                  <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="YYYY-MM-DDTHH:mm (IST)" placeholderTextColor="#aaa" style={styles.input} />
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateOrUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#1F1147" /> : (
                  <>
                    <Text style={styles.submitBtnText}>{editingId ? 'Save Changes' : 'Create'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#1F1147" />
                  </>
                )}
              </TouchableOpacity>
              {editingId && (
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]} onPress={handleCancelEdit}>
                  <Text style={[styles.submitBtnText, { color: '#FFFFFF' }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Existing Announcements</Text>
            {loading ? (
              <View style={styles.centerRow}><ActivityIndicator color="#FFE8FF" /><Text style={styles.loadingText}> Loading...</Text></View>
            ) : (
              <View style={{ gap: 12 }}>
                {announcements.length === 0 && (
                  <Text style={styles.emptyText}>No announcements</Text>
                )}
                {announcements.map(a => (
                  <View key={a.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{a.title || 'Untitled'}</Text>
                      <Text style={styles.itemMsg} numberOfLines={2}>{a.message}</Text>
                      <Text style={styles.meta}>Active: {String(a.is_active)} · Priority: {a.priority ?? 0} · Placements: {(a.placements || []).join(', ') || 'all'}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity style={[styles.smallBtn, styles.editBtn]} onPress={() => handleStartEdit(a)}>
                        <Text style={styles.smallBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, styles.publishBtn]} onPress={() => handlePublish(a.id)} disabled={!!publishing[a.id]}>
                        {publishing[a.id] ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.smallBtnText}>Publish</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, styles.deleteBtn]} onPress={() => handleDelete(a.id)} disabled={!!deleting[a.id]}>
                        {deleting[a.id] ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.smallBtnText}>Delete</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F1147' },
  gradient: { flex: 1 },
  content: { padding: 16, paddingBottom: 80, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,214,242,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,214,242,0.3)' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { color: '#FFE8FF', fontWeight: '800', fontSize: 16, marginBottom: 6 },
  row: { gap: 6 },
  rowInline: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  inlineItem: { flex: 1, minWidth: 140, gap: 6 },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#FFFFFF' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  placements: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  placementItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  placementText: { color: '#FFFFFF' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFD6F2', paddingVertical: 12, borderRadius: 10 },
  submitBtnText: { color: '#1F1147', fontWeight: '800' },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#FFE8FF' },
  emptyText: { color: 'rgba(255,255,255,0.7)' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  itemTitle: { color: '#FFFFFF', fontWeight: '800' },
  itemMsg: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  meta: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  publishBtn: { backgroundColor: '#7C2B86' },
  deleteBtn: { backgroundColor: '#EF4444' },
  uploadBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFD6F2', borderRadius: 10 },
  uploadBtnText: { color: '#1F1147', fontWeight: '800' },
});
