import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

export default function AppTestingApplication() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [contact, setContact] = useState(''); // optional preferred contact medium
  const [agreeCommitment, setAgreeCommitment] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState(null);

  const apiBase = useMemo(() => {
    return process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  }, []);

  const validate = () => {
    if (!username.trim()) return 'Please enter your Circle username';
    if (!email.trim()) return 'Please enter your email';
    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address';
    if (!fullName.trim()) return 'Please enter your full name';
    if (!country.trim()) return 'Please enter your country/region';
    if (!agreeCommitment) return 'Please confirm the 30 minutes daily usage commitment';
    if (!agreeTerms) return 'Please agree to the terms of this role';
    return '';
  };

  const handleApply = async () => {
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/api/careers/app-testing/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          fullName: fullName.trim(),
          country: country.trim(),
          contact: contact.trim() || undefined,
          role: 'app-testing',
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        let message = 'Application failed. Please try again later.';
        try {
          const j = JSON.parse(txt);
          message = j.error || j.message || message;
        } catch {}
        throw new Error(message);
      }

      const data = await resp.json().catch(() => ({}));
      setRemaining(typeof data.remaining === 'number' ? data.remaining : null);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openSignup = () => {
    router.push('/signup');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Head>
        <title>Apply: App Testing | Circle Careers</title>
        <meta name="description" content="Apply for Circle's App Testing role. Use the app 30 minutes daily for 60 days and get a 1-year subscription as a reward. Max 50 applicants." />
      </Head>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Testing — 1-year Subscription Reward</Text>
        <Text style={styles.headerSubtitle}>
          Use the app at least 30 minutes daily for up to 60 days. Report issues via any medium. Limited to 50 testers.
        </Text>
      </View>

      {/* Role Highlights */}
      <View style={styles.highlights}>
        <View style={styles.highlightItem}>
          <Ionicons name="time" size={18} color="#7C2B86" />
          <Text style={styles.highlightText}>Daily 30 minutes</Text>
        </View>
        <View style={styles.highlightItem}>
          <Ionicons name="calendar" size={18} color="#7C2B86" />
          <Text style={styles.highlightText}>Role length: Max 60 days</Text>
        </View>
        <View style={styles.highlightItem}>
          <Ionicons name="gift" size={18} color="#7C2B86" />
          <Text style={styles.highlightText}>Reward: 1-year subscription</Text>
        </View>
        <View style={styles.highlightItem}>
          <Ionicons name="people" size={18} color="#7C2B86" />
          <Text style={styles.highlightText}>Max 50 applications</Text>
        </View>
      </View>

      {!success ? (
        <View style={styles.formCard}>
          {step === 1 ? (
            <>
              <Text style={styles.stepTitle}>Step 1: Create your Circle account</Text>
              <Text style={styles.stepText}>
                Please sign up on Circle first. After creating your account, return here to continue the application.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={openSignup}>
                <Text style={styles.primaryBtnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.secondaryBtnText}>I already created my account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>Step 2: Complete your application</Text>
              <Text style={styles.stepText}>Fill in the details below using the same email you will use on Google Play.</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Circle Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. john_doe"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Country/Region</Text>
                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  placeholder="e.g. India"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Preferred contact medium (optional)</Text>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  placeholder="e.g. Email/WhatsApp/Telegram"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={[styles.checkboxRow, agreeCommitment && styles.checkboxRowChecked]}
                onPress={() => setAgreeCommitment(!agreeCommitment)}
                activeOpacity={0.8}
              >
                <Ionicons name={agreeCommitment ? 'checkbox' : 'square-outline'} size={20} color={agreeCommitment ? '#7C2B86' : '#888'} />
                <Text style={styles.checkboxText}>I will use Circle at least 30 minutes daily during the role period</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkboxRow, agreeTerms && styles.checkboxRowChecked]}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.8}
              >
                <Ionicons name={agreeTerms ? 'checkbox' : 'square-outline'} size={20} color={agreeTerms ? '#7C2B86' : '#888'} />
                <Text style={styles.checkboxText}>I agree this role lasts a maximum of 60 days and offers a 1-year subscription reward</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleApply} disabled={loading}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Submit Application</Text>
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <Text style={styles.successTitle}>Application Submitted</Text>
          <Text style={styles.successText}>
            Our team will review your application. Once approved, we'll share the download link with you via WhatsApp.
          </Text>
          <Text style={styles.successText}>
            Please install the app from the Play Store using the same email you applied with.
          </Text>
          {remaining !== null && (
            <Text style={styles.successNote}>Remaining slots: {remaining}</Text>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/') }>
            <Text style={styles.secondaryBtnText}>Return Home</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          Note: Backend will validate the 50-applicant limit and handle Play Console access + email delivery.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, gap: 16 },
  header: { backgroundColor: '#7C2B86', padding: 24, borderRadius: 12 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  headerSubtitle: { color: '#fff', opacity: 0.95, fontSize: 14 },
  highlights: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  highlightItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3E8F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  highlightText: { color: '#7C2B86', fontWeight: '700', fontSize: 13 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  stepText: { fontSize: 14, color: '#555' },
  inputRow: { gap: 6 },
  inputLabel: { fontSize: 13, color: '#444', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa', color: '#111' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  checkboxRowChecked: { backgroundColor: '#F8F1FB', borderColor: '#E9D5FF' },
  checkboxText: { fontSize: 13, color: '#333', flex: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C2B86', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-start' },
  secondaryBtnText: { color: '#333', fontSize: 14, fontWeight: '600' },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  successCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#065F46' },
  successText: { fontSize: 14, color: '#065F46', textAlign: 'center' },
  successNote: { fontSize: 13, color: '#065F46', opacity: 0.8 },
  footerNote: { paddingVertical: 8, alignItems: 'center' },
  footerNoteText: { fontSize: 12, color: '#666' },
});
