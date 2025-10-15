import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  Clipboard,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';

export default function ReferralsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [upiId, setUpiId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, transactions, earnings
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      loadReferralData();
      loadShareLink();
    }
  }, [token]);

  const loadReferralData = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/referrals/my-referral`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferralData(response.data);
      setUpiId(response.data.upi_id || '');
    } catch (error) {
      console.error('Error loading referral data:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to load referral information');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadReferralData(),
      loadShareLink(),
      showAllTransactions ? loadTransactions() : Promise.resolve()
    ]);
  };

  const loadTransactions = async (status = null) => {
    if (!token) return;
    setLoadingTransactions(true);
    try {
      const url = status 
        ? `${API_URL}/api/referrals/my-referrals/transactions?status=${status}`
        : `${API_URL}/api/referrals/my-referrals/transactions`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadShareLink = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/referrals/share-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareLink(response.data.shareLink);
    } catch (error) {
      console.error('Error loading share link:', error);
    }
  };

  const handleShare = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/referrals/share-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { shareText, shareLink } = response.data;
      
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareLink);
        Alert.alert('Success', 'Referral link copied to clipboard!');
      } else {
        await Share.share({
          message: shareText,
          url: shareLink,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  const copyToClipboard = (text) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
    } else {
      Clipboard.setString(text);
    }
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const updateUpiId = async () => {
    if (!upiId.match(/^[\w.-]+@[\w.-]+$/)) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID');
      return;
    }

    if (!token) return;
    try {
      await axios.post(
        `${API_URL}/api/referrals/update-upi`,
        { upiId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'UPI ID updated successfully');
      loadReferralData();
    } catch (error) {
      console.error('Error updating UPI:', error);
      Alert.alert('Error', 'Failed to update UPI ID');
    }
  };

  const requestPayment = async () => {
    if (!referralData?.upi_id) {
      Alert.alert('UPI ID Required', 'Please add your UPI ID first');
      return;
    }

    if (referralData.pending_earnings < 100) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is ₹100');
      return;
    }

    Alert.alert(
      'Request Payment',
      `Request payment of ₹${referralData.pending_earnings}?\n\nPayment will be processed within 7 days after verification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            if (!token) return;
            try {
              await axios.post(
                `${API_URL}/api/referrals/request-payment`,
                { amount: referralData.pending_earnings },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Success', 'Payment request submitted successfully!');
              loadReferralData();
            } catch (error) {
              console.error('Error requesting payment:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to request payment');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'paid': return '#3B82F6';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time';
      case 'approved': return 'checkmark-circle';
      case 'paid': return 'cash';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1F1147', '#2D1B69']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6FB5" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1F1147', '#2D1B69']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6FB5"
              colors={['#FF6FB5', '#A16AE8']}
              progressBackgroundColor="#1F1147"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Referral Program</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Earnings Summary */}
          <View style={styles.earningsCard}>
            <LinearGradient
              colors={['#FF6FB5', '#A16AE8']}
              style={styles.earningsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsAmount}>₹{referralData?.total_earnings || 0}</Text>
              <View style={styles.earningsBreakdown}>
                <View style={styles.earningsStat}>
                  <Text style={styles.earningsStatLabel}>Pending</Text>
                  <Text style={styles.earningsStatValue}>₹{referralData?.pending_earnings || 0}</Text>
                </View>
                <View style={styles.earningsStat}>
                  <Text style={styles.earningsStatLabel}>Paid</Text>
                  <Text style={styles.earningsStatValue}>₹{referralData?.paid_earnings || 0}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Referral Code Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="gift" size={24} color="#FF6FB5" />
              <Text style={styles.cardTitle}>Your Referral Code</Text>
            </View>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{referralData?.referral_code}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(referralData?.referral_code)}
              >
                <Ionicons name="copy" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.rewardText}>
              Earn ₹10 for each friend who signs up using your code!
            </Text>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8']}
                style={styles.shareButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="share-social" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share Referral Link</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color="#10B981" />
              <Text style={styles.statValue}>{referralData?.total_referrals || 0}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{referralData?.pending_count || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{referralData?.approved_count || 0}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color="#8B5CF6" />
              <Text style={styles.statValue}>{referralData?.paid_count || 0}</Text>
              <Text style={styles.statLabel}>Paid</Text>
            </View>
          </View>

          {/* UPI ID Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet" size={24} color="#FF6FB5" />
              <Text style={styles.cardTitle}>UPI ID for Payments</Text>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="yourname@upi"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />

            {referralData?.upi_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}

            <TouchableOpacity style={styles.updateButton} onPress={updateUpiId}>
              <Text style={styles.updateButtonText}>Update UPI ID</Text>
            </TouchableOpacity>

            {referralData?.pending_earnings >= 100 && (
              <TouchableOpacity style={styles.withdrawButton} onPress={requestPayment}>
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  style={styles.withdrawGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.withdrawButtonText}>
                    Request Payment (₹{referralData.pending_earnings})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <Text style={styles.noteText}>
              💡 Payments are processed within 7 days after verification
            </Text>
          </View>

          {/* Recent Transactions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={24} color="#FF6FB5" />
              <Text style={styles.cardTitle}>Referral History</Text>
            </View>

            {!showAllTransactions ? (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => {
                  setShowAllTransactions(true);
                  loadTransactions();
                }}
              >
                <Text style={styles.viewAllText}>View All Transactions</Text>
                <Ionicons name="arrow-forward" size={16} color="#FF6FB5" />
              </TouchableOpacity>
            ) : (
              <View>
                {loadingTransactions ? (
                  <View style={styles.transactionsLoading}>
                    <ActivityIndicator size="small" color="#FF6FB5" />
                    <Text style={styles.loadingText}>Loading transactions...</Text>
                  </View>
                ) : transactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                    <Text style={styles.emptyText}>No referrals yet</Text>
                    <Text style={styles.emptySubtext}>Share your code to start earning!</Text>
                  </View>
                ) : (
                  <View>
                    {transactions.map((transaction, index) => (
                      <View key={transaction.id || index} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                          <View style={styles.transactionLeft}>
                            <Ionicons 
                              name={getStatusIcon(transaction.status)} 
                              size={20} 
                              color={getStatusColor(transaction.status)} 
                            />
                            <View style={styles.transactionInfo}>
                              <Text style={styles.transactionNumber}>
                                {transaction.referral_number}
                              </Text>
                              <Text style={styles.transactionDate}>
                                {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.transactionRight}>
                            <Text style={styles.transactionAmount}>
                              ₹{transaction.reward_amount || 10}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                              <Text style={styles.statusText}>
                                {transaction.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {transaction.referred_user && (
                          <View style={styles.transactionDetails}>
                            <Ionicons name="person" size={14} color="rgba(255, 255, 255, 0.5)" />
                            <Text style={styles.transactionDetailText}>
                              Referred: {transaction.referred_user.username || 'User'}
                            </Text>
                          </View>
                        )}
                        
                        {transaction.rejection_reason && (
                          <View style={styles.rejectionReason}>
                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                            <Text style={styles.rejectionText}>
                              {transaction.rejection_reason}
                            </Text>
                          </View>
                        )}
                        
                        {transaction.payment_reference && (
                          <View style={styles.paymentReference}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.paymentRefText}>
                              Ref: {transaction.payment_reference}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                    
                    <TouchableOpacity 
                      style={styles.collapseButton}
                      onPress={() => setShowAllTransactions(false)}
                    >
                      <Text style={styles.collapseText}>Show Less</Text>
                      <Ionicons name="chevron-up" size={16} color="#FF6FB5" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* How It Works */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={24} color="#FF6FB5" />
              <Text style={styles.cardTitle}>How It Works</Text>
            </View>

            <View style={styles.stepsList}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Share your referral code with friends</Text>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>They sign up using your code</Text>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Earn ₹10 per successful referral</Text>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>Request payment when you have ₹100 or more</Text>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>5</Text>
                </View>
                <Text style={styles.stepText}>Receive payment within 7 days after verification</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  earningsGradient: {
    padding: 24,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  earningsBreakdown: {
    flexDirection: 'row',
    gap: 24,
  },
  earningsStat: {
    flex: 1,
  },
  earningsStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  earningsStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 111, 181, 0.3)',
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    textAlign: 'center',
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  withdrawButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  withdrawGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6FB5',
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6FB5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    paddingTop: 4,
  },
  transactionsLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  transactionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  transactionDetailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  rejectionText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  paymentReference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
  },
  paymentRefText: {
    fontSize: 12,
    color: '#10B981',
    flex: 1,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  collapseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6FB5',
  },
});
