import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Generic "prominent disclosure" modal shown in-app immediately before an
 * OS runtime permission prompt for a sensitive permission (location,
 * camera, microphone, photo library, notifications). Google Play and the
 * App Store both require this to be a distinct, developer-controlled step
 * the user affirmatively accepts or declines -- the permission-rationale
 * string shown inside the OS's own dialog does not satisfy this by itself.
 *
 * Content per permission type lives in constants/permissionDisclosures.js;
 * this component is rendered by PermissionDisclosureContext.
 */
export default function PermissionDisclosureModal({ visible, config, onAllow, onDeny }) {
  const { theme } = useTheme();

  if (!config) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDeny}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={config.icon} size={32} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>{config.title}</Text>

          <Text style={[styles.body, { color: theme.textSecondary }]}>{config.body}</Text>

          <View style={styles.pointsBox}>
            {config.points.map((point, index) => (
              <View style={styles.point} key={index}>
                <Ionicons name={point.icon} size={16} color={theme.primary} />
                <Text style={[styles.pointText, { color: theme.textSecondary }]}>{point.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.allowButton, { backgroundColor: theme.primary }]}
            onPress={onAllow}
            activeOpacity={0.85}
          >
            <Text style={styles.allowButtonText}>{config.allowLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.denyButton, { borderColor: theme.border }]}
            onPress={onDeny}
            activeOpacity={0.85}
          >
            <Text style={[styles.denyButtonText, { color: theme.textSecondary }]}>{config.denyLabel}</Text>
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
