import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Toggle component for selecting Giver/Receiver/Off mode
 * Matches the modern Circle app theme
 */
const HelpRoleToggle = ({ selectedRole, onRoleChange }) => {
  const { theme, isDarkMode } = useTheme();

  const roles = [
    { 
      id: 'giver', 
      label: 'Giver', 
      icon: 'hand-left',
      description: 'Help others',
      gradient: ['#7C2B86', '#5D5FEF'],
      color: '#7C2B86'
    },
    { 
      id: 'receiver', 
      label: 'Receiver', 
      icon: 'hand-right',
      description: 'Get help',
      gradient: ['#FF6FB5', '#FF8E53'],
      color: '#FF6FB5'
    },
    { 
      id: 'off', 
      label: 'Off', 
      icon: 'close-circle',
      description: 'Disabled',
      gradient: isDarkMode ? ['#2A2A2A', '#1A1A1A'] : ['#E0E0E0', '#BDBDBD'],
      color: theme.textSecondary
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-circle" size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Help Connect
          </Text>
        </View>
        {selectedRole !== 'off' && (
          <View style={[styles.activeBadge, { backgroundColor: theme.primary + '20' }]}>
            <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.activeText, { color: theme.primary }]}>Active</Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Choose how you want to connect with others
      </Text>

      <View style={styles.toggleContainer}>
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={styles.roleButtonWrapper}
              onPress={() => onRoleChange(role.id)}
              activeOpacity={0.8}
            >
              {isSelected ? (
                <LinearGradient
                  colors={role.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.roleButton}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={role.icon}
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.roleLabelSelected}>
                    {role.label}
                  </Text>
                  <Text style={styles.roleDescriptionSelected}>
                    {role.description}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.roleButton, { 
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border
                }]}>
                  <View style={[styles.iconContainer, { 
                    backgroundColor: role.color + '20' 
                  }]}>
                    <Ionicons
                      name={role.icon}
                      size={28}
                      color={role.color}
                    />
                  </View>
                  <Text style={[styles.roleLabel, { color: theme.textPrimary }]}>
                    {role.label}
                  </Text>
                  <Text style={[styles.roleDescription, { color: theme.textSecondary }]}>
                    {role.description}
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
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButtonWrapper: {
    flex: 1,
  },
  roleButton: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  roleLabelSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  roleDescriptionSelected: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});

export default HelpRoleToggle;
