import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Google Play's User Data policy requires a "prominent disclosure" shown
 * in-app, before the OS runtime permission prompt, whenever an app requests
 * ACCESS_BACKGROUND_LOCATION -- the permission-rationale string passed to the
 * expo-location config plugin (shown *inside* the OS's own dialog) doesn't
 * satisfy this; it has to be a distinct, developer-controlled disclosure
 * step the user affirmatively acknowledges. This is that step, shown from
 * the location-tracking toggle in Settings (the only place that requests
 * background location for the first time -- resuming an already-granted
 * permission on login doesn't re-trigger the OS prompt, so it doesn't need
 * this).
 */
export default function BackgroundLocationDisclosureModal({ visible, onAllow, onDeny }) {
  const { theme, isDarkMode } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDeny}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="location" size={32} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>Background Location Access</Text>

          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Circle collects your precise location — including while the app is closed or not in
            use — to find nearby matches and let you know when another Circle member is close by.
          </Text>

          <View style={styles.pointsBox}>
            <View style={styles.point}>
              <Ionicons name="navigate-outline" size={16} color={theme.primary} />
              <Text style={[styles.pointText, { color: theme.textSecondary }]}>
                Used to power nearby-match suggestions and proximity notifications
              </Text>
            </View>
            <View style={styles.point}>
              <Ionicons name="time-outline" size={16} color={theme.primary} />
              <Text style={[styles.pointText, { color: theme.textSecondary }]}>
                Checked periodically in the background, roughly every 15–30 minutes
              </Text>
            </View>
            <View style={styles.point}>
              <Ionicons name="toggle-outline" size={16} color={theme.primary} />
              <Text style={[styles.pointText, { color: theme.textSecondary }]}>
                Off by default — you can turn it off anytime here in Settings
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.allowButton, { backgroundColor: theme.primary }]}
            onPress={onAllow}
            activeOpacity={0.85}
          >
            <Text style={styles.allowButtonText}>Allow Background Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.denyButton, { borderColor: theme.border }]}
            onPress={onDeny}
            activeOpacity={0.85}
          >
            <Text style={[styles.denyButtonText, { color: theme.textSecondary }]}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  pointsBox: {
    width: '100%',
    gap: 10,
    marginBottom: 22,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButton: {
    marginBottom: 10,
  },
  allowButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  denyButton: {
    borderWidth: 1,
  },
  denyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
