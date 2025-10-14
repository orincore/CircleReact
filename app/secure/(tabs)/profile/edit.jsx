import { combinePhoneNumber, COUNTRIES, DEFAULT_COUNTRY, parsePhoneNumber } from '@/constants/countries';
import { INTEREST_CATEGORIES, NEED_OPTIONS, searchInterests } from "@/constants/interests";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePictureService } from '@/src/services/profilePictureService';
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GENDER_OPTIONS = ["female", "male", "non-binary", "prefer not to say"];
const AGE_OPTIONS = Array.from({ length: 120 - 13 + 1 }, (_, i) => String(13 + i));

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, updateProfile, token } = useAuth();

  const initial = useMemo(() => {
    const parsed = parsePhoneNumber(user?.phoneNumber);
    return {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      age: typeof user?.age === "number" ? String(user.age) : "",
      gender: user?.gender || "",
      phoneNumber: user?.phoneNumber || "",
      about: user?.about || "",
      interests: new Set(Array.isArray(user?.interests) ? user.interests : []),
      needs: new Set(Array.isArray(user?.needs) ? user.needs : []),
      profilePhotoUrl: user?.profilePhotoUrl || "",
      instagram: user?.instagramUsername || "",
    };
  }, [user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [ageQuery, setAgeQuery] = useState("");
  const [genderQuery, setGenderQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [interestSearch, setInterestSearch] = useState("");
  const [needSearch, setNeedSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set(['creative', 'tech', 'fitness']));

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      
      const parsed = parsePhoneNumber(user?.phoneNumber);
      setSelectedCountry(parsed.country);
      setPhoneNumberInput(parsed.number);
      
      setForm({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        age: typeof user?.age === "number" ? String(user.age) : "",
        gender: user?.gender || "",
        phoneNumber: user?.phoneNumber || "",
        about: user?.about || "",
        interests: new Set(Array.isArray(user?.interests) ? user.interests : []),
        needs: new Set(Array.isArray(user?.needs) ? user.needs : []),
        profilePhotoUrl: user?.profilePhotoUrl || "",
        instagram: user?.instagramUsername || "",
      });
    }
  }, [user]);

  const parseList = (text) => text.split(",").map(s => s.trim()).filter(Boolean);

  const filteredCategories = useMemo(() => {
    if (interestSearch) {
      // When searching, group results by category
      const results = searchInterests(interestSearch);
      const grouped = {};
      results.forEach(item => {
        if (!grouped[item.categoryId]) {
          const cat = INTEREST_CATEGORIES.find(c => c.id === item.categoryId);
          grouped[item.categoryId] = {
            ...cat,
            interests: []
          };
        }
        grouped[item.categoryId].interests.push(item.value);
      });
      return Object.values(grouped);
    }
    // Show all categories
    return INTEREST_CATEGORIES;
  }, [interestSearch]);

  const filteredNeeds = useMemo(() => {
    if (!needSearch) return NEED_OPTIONS;
    return NEED_OPTIONS.filter(need => 
      need.label.toLowerCase().includes(needSearch.toLowerCase()) ||
      need.description.toLowerCase().includes(needSearch.toLowerCase())
    );
  }, [needSearch]);
  const filteredCountries = useMemo(() => COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countryQuery.toLowerCase()) || 
    c.dialCode.includes(countryQuery) ||
    c.code.toLowerCase().includes(countryQuery.toLowerCase())
  ), [countryQuery]);

  const toggleInterest = (interest) => {
    const newInterests = new Set(form.interests);
    if (newInterests.has(interest)) {
      newInterests.delete(interest);
    } else {
      newInterests.add(interest);
    }
    setField("interests", newInterests);
  };

  const toggleNeed = (need) => {
    const newNeeds = new Set(form.needs);
    if (newNeeds.has(need)) {
      newNeeds.delete(need);
    } else {
      newNeeds.add(need);
    }
    setField("needs", newNeeds);
  };

  const toggleCategory = (categoryId) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    setExpandedCategories(next);
  };

  const renderChip = (label, selected, onPress, type = 'interest') => (
    <TouchableOpacity key={label} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color="#7C2B86" />}
    </TouchableOpacity>
  );

  const filteredAges = useMemo(() => AGE_OPTIONS.filter((a) => a.includes(ageQuery.trim())), [ageQuery]);
  const filteredGenders = useMemo(() => GENDER_OPTIONS.filter((g) => g.toLowerCase().includes(genderQuery.toLowerCase())), [genderQuery]);

  const formatTitleCase = (s) => {
    if (!s) return s;
    return s.split(' ').map(w => w.split('-').map(seg => seg ? seg[0].toUpperCase() + seg.slice(1) : seg).join('-')).join(' ');
  };

  const validateInstagramUsername = (username) => {
    if (!username) return true; // Empty is valid
    // Instagram username validation: alphanumeric, dots, underscores, 1-30 chars
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return instagramRegex.test(username);
  };

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, use HTML file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            // Create a blob URL for preview
            const blobUrl = URL.createObjectURL(file);
            setLocalPhotoUri(blobUrl);
          }
        };
        
        input.click();
      } else {
        // For mobile, use ImagePicker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          if (Platform.OS === 'web') {
            window.alert('Permission Required\n\nPlease grant photo library permissions.');
          } else {
            Alert.alert('Permission Required', 'Please grant photo library permissions.');
          }
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setLocalPhotoUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (Platform.OS === 'web') {
        window.alert('Error\n\nFailed to pick image.');
      } else {
        Alert.alert('Error', 'Failed to pick image.');
      }
    }
  };

  const uploadProfilePicture = async () => {
    if (!localPhotoUri) return null;
    
    try {
      setUploadingPhoto(true);
      const photoUrl = await ProfilePictureService.uploadProfilePicture(localPhotoUri, token);
      return photoUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      if (Platform.OS === 'web') {
        window.alert('Upload Failed\n\nFailed to upload profile picture.');
      } else {
        Alert.alert('Upload Failed', 'Failed to upload profile picture.');
      }
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Hide the bottom tab bar on this screen and restore on exit
  useEffect(() => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.setOptions?.({ tabBarStyle: { display: "none" } });
    }
    return () => {
      if (parent) {
        parent.setOptions?.({
          tabBarStyle: {
            backgroundColor: "rgba(22, 9, 45, 0.85)",
            borderTopWidth: 0,
            height: 72,
            paddingBottom: 12,
            paddingTop: 10,
          },
        });
      }
    };
  }, [navigation]);

  const onSave = async () => {
    try {
      setSaving(true);
      
      // Validate Instagram username
      if (form.instagram && !validateInstagramUsername(form.instagram)) {
        if (Platform.OS === 'web') {
          window.alert("Invalid Username\n\nPlease enter a valid Instagram username (letters, numbers, dots, underscores only)");
        } else {
          Alert.alert("Invalid Username", "Please enter a valid Instagram username (letters, numbers, dots, underscores only)");
        }
        setSaving(false);
        return;
      }
      
      // Validate phone number (must be exactly 10 digits)
      if (phoneNumberInput) {
        const cleanedNumber = phoneNumberInput.replace(/\D/g, ''); // Remove non-digits
        if (cleanedNumber.length !== 10) {
          if (Platform.OS === 'web') {
            window.alert("Invalid Phone Number\n\nPhone number must be exactly 10 digits");
          } else {
            Alert.alert("Invalid Phone Number", "Phone number must be exactly 10 digits");
          }
          setSaving(false);
          return;
        }
      }
      
      // Upload profile picture if changed
      let photoUrl = form.profilePhotoUrl;
      if (localPhotoUri) {
        const uploadedUrl = await uploadProfilePicture();
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }
      
      // Combine country code and phone number
      const fullPhoneNumber = phoneNumberInput ? combinePhoneNumber(selectedCountry.dialCode, phoneNumberInput.replace(/\D/g, '')) : undefined;
      
      const payload = {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        gender: form.gender.trim() || undefined,
        phoneNumber: fullPhoneNumber,
        about: form.about.trim() || null,
        profilePhotoUrl: photoUrl || undefined,
        instagramUsername: form.instagram.trim() || null,
      };

      // Validate about field length
      if (payload.about && payload.about.length > 500) {
        if (Platform.OS === 'web') {
          window.alert("Validation Error\n\nAbout section must be less than 500 characters");
        } else {
          Alert.alert("Validation Error", "About section must be less than 500 characters");
        }
        return;
      }

      const ageNum = Number(form.age);
      if (!Number.isNaN(ageNum) && ageNum > 0) payload.age = ageNum;
      if (form.interests.size > 0) payload.interests = Array.from(form.interests);
      if (form.needs.size > 0) payload.needs = Array.from(form.needs);


      await updateProfile(payload);
      if (Platform.OS === 'web') {
        window.alert("Profile\n\nProfile updated successfully");
      } else {
        Alert.alert("Profile", "Profile updated successfully");
      }
      router.back();
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert("Update failed\n\n" + (e?.message || "Please try again."));
      } else {
        Alert.alert("Update failed", e?.message || "Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1F1147", "#2D1B69", "#1F1147"]}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#FFE8FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Profile Picture</Text>
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoContainer}
                  onPress={pickImage}
                  disabled={uploadingPhoto}
                >
                  {localPhotoUri || form.profilePhotoUrl ? (
                    <Image 
                      source={{ uri: localPhotoUri || form.profilePhotoUrl }} 
                      style={styles.photo}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={48} color="rgba(124, 43, 134, 0.4)" />
                    </View>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={pickImage}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={18} color="#7C2B86" />
                  <Text style={styles.changePhotoText}>
                    {uploadingPhoto ? 'Uploading...' : (localPhotoUri || form.profilePhotoUrl) ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Basic Info</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={form.firstName}
                  onChangeText={v => setField("firstName", v)}
                  placeholder="Alex"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  value={form.lastName}
                  onChangeText={v => setField("lastName", v)}
                  placeholder="Parker"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.fieldRow, styles.col]}>
                  <Text style={styles.label}>Age</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowAgePicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, !form.age && styles.pickerPlaceholder]}>
                      {form.age || "Select age"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>
                <View style={[styles.fieldRow, styles.col]}>
                  <Text style={styles.label}>Gender</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowGenderPicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, !form.gender && styles.pickerPlaceholder]}>
                      {form.gender ? formatTitleCase(form.gender) : "Select gender"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.countrySelector}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
                    <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                  <TextInput
                    value={phoneNumberInput}
                    onChangeText={(text) => {
                      // Only allow digits and limit to 10 characters
                      const cleaned = text.replace(/\D/g, '');
                      if (cleaned.length <= 10) {
                        setPhoneNumberInput(cleaned);
                      }
                    }}
                    placeholder="9876543210"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                {phoneNumberInput && (
                  <View style={styles.phonePreview}>
                    <Ionicons 
                      name={phoneNumberInput.length === 10 ? "checkmark-circle" : "call"} 
                      size={14} 
                      color={phoneNumberInput.length === 10 ? "#10B981" : "#F59E0B"} 
                    />
                    <Text style={styles.phonePreviewText}>
                      {selectedCountry.dialCode} {phoneNumberInput}
                    </Text>
                    <Text style={[
                      styles.phoneCharCount, 
                      phoneNumberInput.length === 10 && styles.phoneCharCountValid
                    ]}>
                      {phoneNumberInput.length}/10
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>About you</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  value={form.about}
                  onChangeText={v => setField("about", v)}
                  placeholder="Tell others about yourself, your interests, and what you're looking for..."
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{form.about.length}/500</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Interests ({form.interests.size} selected)</Text>
                <View style={styles.searchWrapper}>
                  <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.6)" />
                  <TextInput
                    value={interestSearch}
                    onChangeText={setInterestSearch}
                    placeholder="Search interests..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.searchInput}
                  />
                </View>
                
                {/* Show all categories vertically - collapsible */}
                {filteredCategories.map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const selectedCount = category.interests.filter(i => form.interests.has(i)).length;
                  
                  return (
                    <View key={category.id} style={styles.categorySection}>
                      <TouchableOpacity 
                        style={styles.categoryHeader}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={category.icon} size={16} color="#7C2B86" />
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {selectedCount}/{category.interests.length}
                          </Text>
                        </View>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color="rgba(255, 255, 255, 0.6)" 
                        />
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <View style={styles.chipWrap}>
                          {category.interests.map((interest) => 
                            renderChip(interest, form.interests.has(interest), () => toggleInterest(interest), 'interest')
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>What are you looking for? ({form.needs.size} selected)</Text>
                <View style={styles.searchWrapper}>
                  <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.6)" />
                  <TextInput
                    value={needSearch}
                    onChangeText={setNeedSearch}
                    placeholder="Search needs..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.searchInput}
                  />
                </View>
                <View style={styles.needsWrap}>
                  {filteredNeeds.map((need) => (
                    <TouchableOpacity 
                      key={need.id} 
                      onPress={() => toggleNeed(need.label)} 
                      style={[styles.needCard, form.needs.has(need.label) && styles.needCardSelected]}
                    >
                      <Ionicons name={need.icon} size={18} color={form.needs.has(need.label) ? "#7C2B86" : "rgba(255, 255, 255, 0.6)"} />
                      <View style={styles.needCardContent}>
                        <Text style={[styles.needCardLabel, form.needs.has(need.label) && styles.needCardLabelSelected]}>{need.label}</Text>
                        <Text style={styles.needCardDescription}>{need.description}</Text>
                      </View>
                      {form.needs.has(need.label) && <Ionicons name="checkmark-circle" size={20} color="#7C2B86" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              <View style={styles.fieldRow}>
                <View style={styles.labelWithIcon}>
                  <Ionicons name="logo-instagram" size={16} color="#E4405F" />
                  <Text style={styles.label}>Instagram Username</Text>
                </View>
                <View style={styles.instagramInputWrapper}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    value={form.instagram}
                    onChangeText={v => setField("instagram", v.replace('@', ''))}
                    placeholder="yourusername"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.instagramInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              {form.instagram && (
                <View style={styles.instagramPreview}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.instagramPreviewText}>@{form.instagram}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              disabled={saving || uploadingPhoto}
              style={[styles.saveBtn, (saving || uploadingPhoto) && { opacity: 0.7 }]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : uploadingPhoto ? "Uploading..." : "Save changes"}
              </Text>
              {!saving && !uploadingPhoto && (
                <Ionicons name="checkmark-circle" size={20} color="#7C2B86" />
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Age Picker Modal */}
      <Modal transparent visible={showAgePicker} animationType="slide" onRequestClose={() => setShowAgePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAgePicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select your age 🎂</Text>
              <TouchableOpacity onPress={() => setShowAgePicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput
                value={ageQuery}
                onChangeText={setAgeQuery}
                placeholder="Search age"
                style={styles.searchInput}
                placeholderTextColor="#8880B6"
                keyboardType="numeric"
              />
            </View>
            <FlatList
              data={filteredAges}
              keyExtractor={(i) => i}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setField("age", item);
                    setShowAgePicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                  {form.age === item && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal transparent visible={showGenderPicker} animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How do you identify? 💫</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput
                value={genderQuery}
                onChangeText={setGenderQuery}
                placeholder="Search gender"
                style={styles.searchInput}
                placeholderTextColor="#8880B6"
              />
            </View>
            <FlatList
              data={filteredGenders}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setField("gender", item);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{formatTitleCase(item)}</Text>
                  {form.gender === item && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Country Picker Modal */}
      <Modal transparent visible={showCountryPicker} animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country 🌍</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput
                value={countryQuery}
                onChangeText={setCountryQuery}
                placeholder="Search country or code"
                style={styles.searchInput}
                placeholderTextColor="#8880B6"
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    setCountryQuery("");
                  }}
                >
                  <View style={styles.countryOption}>
                    <Text style={styles.countryFlagLarge}>{item.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                    </View>
                  </View>
                  {selectedCountry.code === item.code && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: { width: 44 },
  container: { padding: 24, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.2)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFE8FF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldRow: { gap: 8 },
  label: { fontSize: 13, color: "rgba(255, 255, 255, 0.8)", fontWeight: "600" },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    height: 48,
    color: "#FFFFFF",
    fontSize: 15,
  },
  textArea: {
    height: 100,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "right",
    marginTop: 4,
  },
  photoSection: {
    alignItems: "center",
    gap: 16,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 3,
    borderColor: "#FFD6F2",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 214, 242, 0.15)",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFD6F2",
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C2B86",
  },
  instagramInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    height: 48,
  },
  atSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD6F2",
    marginRight: 4,
  },
  instagramInput: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
  },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#FFD6F2",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#FFD6F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { color: "#7C2B86", fontWeight: "800", fontSize: 17 },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    height: 48,
  },
  pickerButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  pickerPlaceholder: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  instagramPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 8,
    marginTop: 8,
  },
  instagramPreviewText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93, 95, 239, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1147",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: "rgba(246, 245, 255, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(93, 95, 239, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F1147",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93, 95, 239, 0.08)",
  },
  optionText: {
    fontSize: 16,
    color: "#1F1147",
    fontWeight: "500",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  chipSelected: {
    backgroundColor: "rgba(255, 214, 242, 0.2)",
    borderColor: "rgba(255, 214, 242, 0.6)",
    shadowColor: "#FFD6F2",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  selectionCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
    marginTop: 4,
  },
  phoneInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },
  phonePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 8,
    marginTop: 8,
  },
  phonePreviewText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  phoneCharCount: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "600",
    marginLeft: "auto",
  },
  phoneCharCountValid: {
    color: "#10B981",
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryFlagLarge: {
    fontSize: 28,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1147",
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 14,
    color: "#8880B6",
    fontWeight: "500",
  },
  categorySection: {
    marginBottom: 16,
    marginTop: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
  },
  categoryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  categoryBadge: {
    backgroundColor: "rgba(124, 43, 134, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C2B86",
  },
  needsWrap: {
    gap: 10,
  },
  needCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  needCardSelected: {
    borderColor: "#7C2B86",
    backgroundColor: "rgba(124, 43, 134, 0.2)",
  },
  needCardContent: {
    flex: 1,
  },
  needCardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  needCardLabelSelected: {
    color: "#7C2B86",
  },
  needCardDescription: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
