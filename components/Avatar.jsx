import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const Avatar = ({ 
  user, 
  size = 48, 
  onPress, 
  showOnlineStatus = false,
  style = {},
  disabled = false 
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (disabled) return;
    
    if (onPress) {
      onPress(user);
    } else if (user?.id) {
      // Default behavior: navigate to user profile page
      router.push(`/secure/user-profile/${user.id}`);
    }
  };

  const getInitials = (user) => {
    if (!user) return '?';
    
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (user.name) {
      const names = user.name.split(' ');
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase()
        : names[0].charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const avatarUrl = user?.profile_photo_url || user?.avatar || user?.photoUrl;
  const initials = getInitials(user);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[styles.container, style]}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View style={[styles.avatarContainer, avatarStyle]}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, avatarStyle]}
            />
          ) : (
            <View style={[styles.placeholder, avatarStyle]}>
              <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
                {initials}
              </Text>
            </View>
          )}
          
          {showOnlineStatus && (
            <View style={[
              styles.onlineIndicator,
              {
                width: size * 0.25,
                height: size * 0.25,
                borderRadius: size * 0.125,
                right: size * 0.05,
                bottom: size * 0.05,
              }
            ]} />
          )}
        </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default Avatar;
