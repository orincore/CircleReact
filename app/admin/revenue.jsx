import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get('window')

const RevenueScreen = () => {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  useEffect(() => {
    loadToken()
  }, [])

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token, selectedPeriod])

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken')
      setToken(storedToken)
    } catch (error) {
      console.error('Error loading token:', error)
    }
  }

  const loadDashboardData = async () => {
    if (!token) return

    try {
      setLoading(true)
      const apiUrl = 'https://api.circle.orincore.com'
      const response = await fetch(`${apiUrl}/api/revenue/admin/dashboard?days=${selectedPeriod}&months=12`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.dashboard)
      } else {
        console.error('Failed to load dashboard data:', response.status)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getPeriodLabel = (days) => {
    switch (days) {
      case 7: return 'Last 7 Days'
      case 30: return 'Last 30 Days'
      case 90: return 'Last 90 Days'
      case 365: return 'Last Year'
      default: return `Last ${days} Days`
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading revenue dashboard...</Text>
      </View>
    )
  }

  if (!dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Failed to load revenue data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { stats, planRevenue, monthlyTrend, breakdown } = dashboardData

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#7C2B86', '#A16AE8']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Revenue Dashboard</Text>
        <Text style={styles.headerSubtitle}>Comprehensive revenue analytics</Text>
      </LinearGradient>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[7, 30, 90, 365].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.periodButton,
                selectedPeriod === days && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(days)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === days && styles.activePeriodButtonText
              ]}>
                {getPeriodLabel(days)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.primaryMetric]}>
            <Ionicons name="trending-up" size={24} color="#7C2B86" />
            <Text style={styles.metricValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={[
              styles.metricChange,
              stats.revenueGrowth >= 0 ? styles.positiveChange : styles.negativeChange
            ]}>
              {formatPercentage(stats.revenueGrowth)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="cash" size={20} color="#10B981" />
            <Text style={styles.metricValue}>{formatCurrency(stats.netRevenue)}</Text>
            <Text style={styles.metricLabel}>Net Revenue</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="calendar" size={20} color="#3B82F6" />
            <Text style={styles.metricValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
            <Text style={styles.metricLabel}>Monthly Revenue</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="return-down-back" size={20} color="#F59E0B" />
            <Text style={styles.metricValue}>{formatCurrency(stats.totalRefunds)}</Text>
            <Text style={styles.metricLabel}>Total Refunds</Text>
            <Text style={styles.metricSubtext}>{stats.refundRate.toFixed(1)}% rate</Text>
          </View>
        </View>
      </View>

      {/* Plan Revenue Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Plan</Text>
        {planRevenue.map((plan, index) => (
          <View key={index} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={[
                styles.planIcon,
                { backgroundColor: plan.plan_type === 'premium_plus' ? '#FFD700' : 
                                   plan.plan_type === 'premium' ? '#7C2B86' : '#6B7280' }
              ]}>
                <Ionicons 
                  name={plan.plan_type === 'premium_plus' ? 'diamond' : 
                        plan.plan_type === 'premium' ? 'star' : 'person'} 
                  size={16} 
                  color="white" 
                />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>
                  {plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1).replace('_', ' ')}
                </Text>
                <Text style={styles.planSubscribers}>{plan.subscribers} subscribers</Text>
              </View>
              <View style={styles.planRevenue}>
                <Text style={styles.planRevenueAmount}>{formatCurrency(plan.revenue)}</Text>
                <Text style={styles.planNetRevenue}>Net: {formatCurrency(plan.netRevenue)}</Text>
              </View>
            </View>
            
            <View style={styles.planMetrics}>
              <View style={styles.planMetric}>
                <Text style={styles.planMetricLabel}>Avg Revenue</Text>
                <Text style={styles.planMetricValue}>{formatCurrency(plan.averageRevenue)}</Text>
              </View>
              <View style={styles.planMetric}>
                <Text style={styles.planMetricLabel}>Refunds</Text>
                <Text style={styles.planMetricValue}>{formatCurrency(plan.refunds)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Revenue Trend</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            {monthlyTrend.map((month, index) => {
              const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue))
              const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 120 : 0
              
              return (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBarFill, { height }]} />
                    <View style={[styles.chartBarRefund, { height: (month.refunds / maxRevenue) * 120 }]} />
                  </View>
                  <Text style={styles.chartBarLabel}>{month.month}</Text>
                  <Text style={styles.chartBarValue}>{formatCurrency(month.revenue)}</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* Revenue Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownItem}>
            <Ionicons name="add-circle" size={20} color="#10B981" />
            <Text style={styles.breakdownLabel}>New Subscriptions</Text>
            <Text style={styles.breakdownValue}>{breakdown.newSubscriptions}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Ionicons name="refresh-circle" size={20} color="#3B82F6" />
            <Text style={styles.breakdownLabel}>Renewals</Text>
            <Text style={styles.breakdownValue}>{breakdown.renewals}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Ionicons name="arrow-up-circle" size={20} color="#8B5CF6" />
            <Text style={styles.breakdownLabel}>Upgrades</Text>
            <Text style={styles.breakdownValue}>{breakdown.upgrades}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Ionicons name="arrow-down-circle" size={20} color="#F59E0B" />
            <Text style={styles.breakdownLabel}>Downgrades</Text>
            <Text style={styles.breakdownValue}>{breakdown.downgrades}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.breakdownLabel}>Cancellations</Text>
            <Text style={styles.breakdownValue}>{breakdown.cancellations}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Ionicons name="return-down-back" size={20} color="#F59E0B" />
            <Text style={styles.breakdownLabel}>Refunds</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown.refunds)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#7C2B86',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  periodSelector: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activePeriodButton: {
    backgroundColor: '#7C2B86',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activePeriodButtonText: {
    color: 'white',
  },
  metricsContainer: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryMetric: {
    borderLeftWidth: 4,
    borderLeftColor: '#7C2B86',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F1147',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  positiveChange: {
    color: '#10B981',
  },
  negativeChange: {
    color: '#EF4444',
  },
  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1147',
    marginBottom: 16,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  planSubscribers: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  planRevenue: {
    alignItems: 'flex-end',
  },
  planRevenueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F1147',
  },
  planNetRevenue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  planMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  planMetric: {
    alignItems: 'center',
  },
  planMetricLabel: {
    fontSize: 12,
    color: '#666',
  },
  planMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 20,
  },
  chartBar: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 60,
  },
  chartBarContainer: {
    height: 120,
    width: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  chartBarFill: {
    backgroundColor: '#7C2B86',
    width: '100%',
    borderRadius: 12,
  },
  chartBarRefund: {
    backgroundColor: '#F59E0B',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    opacity: 0.7,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1F1147',
    marginTop: 2,
    textAlign: 'center',
  },
  breakdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
})

export default RevenueScreen
