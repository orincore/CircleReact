import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const HelpRoleToggle = ({ selectedRole, onRoleChange }) => {
  const { theme, isDarkMode } = useTheme();

  const roles = [
    {
      id: 'giver',
      label: 'Beacon',
      icon: 'hand-left-outline',
      gradient: ['#6D28D9', '#5B21B6'],
      color: '#8B5CF6',
    },
    {
      id: 'receiver',
      label: 'Voyager',
      icon: 'compass-outline',
      gradient: ['#DB2777', '#BE185D'],
      color: '#F472B6',
    },
    {
      id: 'off',
      label: 'Off',
      icon: 'close-circle-outline',
      gradient: isDarkMode ? ['#27272A', '#18181B'] : ['#D4D4D8', '#A1A1AA'],
      color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    },
  ];

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : theme.surface,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : theme.border,
      },
    ]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>HARMONY</Text>
        {selectedRole !== 'off' && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.pillRow}>
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={styles.pillWrap}
              onPress={() => onRoleChange(role.id)}
              activeOpacity={0.78}
            >
              {isSelected ? (
                <LinearGradient
                  colors={role.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pillGrad}
                >
                  <Ionicons name={role.icon} size={15} color="#FFFFFF" />
                  <Text style={styles.pillLabelOn}>{role.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[
                  styles.pillOff,
                  { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.border },
                ]}>
                  <Ionicons name={role.icon} size={15} color={role.color} />
                  <Text style={[styles.pillLabelOff, { color: theme.textSecondary }]}>
                    {role.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#8B5CF6',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    gap: 5,
  },
  pillOff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
  },
  pillLabelOn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillLabelOff: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default HelpRoleToggle;
