import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import WavyBackground from '@/components/WavyBackground';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_BUTTON_COLOR = '#8B5CF6';
const SECONDARY_BORDER_COLOR = '#7C2B86';

export default function LandingPage({ onSignUp, onLogIn }) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WavyBackground />
      <View
        style={[
          styles.content,
          isLargeScreen && styles.contentLarge,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/logo/circle-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: theme.textSecondary }]}>An App by ORINCORE</Text>
        </View>

        {/* flex:1 so the illustration always shrinks to fit whatever space
            is left between the brand row and the buttons, instead of a fixed
            size that could overflow a short screen and push the buttons out
            of view. */}
        <View style={styles.illustrationWrap}>
          <Image
            source={require('@/assets/illustration/dating-cuate.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButtonWrap, { backgroundColor: PRIMARY_BUTTON_COLOR }]}
            onPress={onSignUp}
            activeOpacity={0.85}
          >
            <View style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                borderColor: SECONDARY_BORDER_COLOR,
                backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
              },
            ]}
            onPress={onLogIn}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: SECONDARY_BORDER_COLOR }]}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  contentLarge: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 48,
    height: 48,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  illustrationWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
    maxWidth: 700,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  primaryButtonWrap: {
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
