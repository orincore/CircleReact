import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Color scheme
const COLORS = {
  primary: '#7C2B86',
  secondary: '#1F1147',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  blue: '#3B82F6',
  green: '#10B981',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#475569',
};

// Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

// Format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Status badge component
const StatusBadge = ({ status, health }) => {
  let color = COLORS.textSecondary;
  let icon = 'ellipse';
  let label = status;

  if (status === 'running') {
    if (health === 'healthy') {
      color = COLORS.success;
      icon = 'checkmark-circle';
      label = 'Healthy';
    } else if (health === 'unhealthy') {
      color = COLORS.danger;
      icon = 'alert-circle';
      label = 'Unhealthy';
    } else if (health === 'starting') {
      color = COLORS.warning;
      icon = 'time';
      label = 'Starting';
    } else {
      color = COLORS.success;
      icon = 'play-circle';
      label = 'Running';
    }
  } else if (status === 'exited') {
    color = COLORS.danger;
    icon = 'stop-circle';
    label = 'Stopped';
  } else if (status === 'restarting') {
    color = COLORS.warning;
    icon = 'refresh-circle';
    label = 'Restarting';
  } else if (status === 'paused') {
    color = COLORS.warning;
    icon = 'pause-circle';
    label = 'Paused';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
};

// Progress bar component
const ProgressBar = ({ value, max, color = COLORS.primary, showLabel = true, height = 8 }) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  let barColor = color;
  
  if (percent > 90) barColor = COLORS.danger;
  else if (percent > 70) barColor = COLORS.warning;

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { height }]}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
      {showLabel && (
        <Text style={styles.progressLabel}>{percent.toFixed(1)}%</Text>
      )}
    </View>
  );
};

// Metric card component
const MetricCard = ({ icon, label, value, subValue, color = COLORS.primary, trend }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? `${COLORS.success}20` : `${COLORS.danger}20` }]}>
          <Ionicons 
            name={trend > 0 ? 'trending-up' : 'trending-down'} 
            size={12} 
            color={trend > 0 ? COLORS.success : COLORS.danger} 
          />
          <Text style={[styles.trendText, { color: trend > 0 ? COLORS.success : COLORS.danger }]}>
            {Math.abs(trend).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
  </View>
);

// Container card component
const ContainerCard = ({ container, onRestart, onStop, onStart, onViewLogs }) => {
  const getServiceIcon = (serviceType) => {
    switch (serviceType) {
      case 'api': return 'server';
      case 'socket': return 'git-network';
      case 'matchmaking': return 'heart';
      case 'redis': return 'cube';
      case 'nginx': return 'globe';
      case 'cron': return 'time';
      default: return 'cube-outline';
    }
  };

  const getDeploymentColor = (color) => {
    if (color === 'blue') return COLORS.blue;
    if (color === 'green') return COLORS.green;
    return COLORS.textSecondary;
  };

  return (
    <View style={styles.containerCard}>
      <View style={styles.containerHeader}>
        <View style={styles.containerTitleRow}>
          <View style={[styles.serviceIcon, { backgroundColor: `${getDeploymentColor(container.deploymentColor)}20` }]}>
            <Ionicons 
              name={getServiceIcon(container.serviceType)} 
              size={18} 
              color={getDeploymentColor(container.deploymentColor)} 
            />
          </View>
          <View style={styles.containerTitleContainer}>
            <Text style={styles.containerName}>{container.name}</Text>
            <Text style={styles.containerId}>{container.id}</Text>
          </View>
          <StatusBadge status={container.status} health={container.health} />
        </View>
        {container.deploymentColor && (
          <View style={[styles.deploymentBadge, { backgroundColor: `${getDeploymentColor(container.deploymentColor)}20` }]}>
            <Text style={[styles.deploymentBadgeText, { color: getDeploymentColor(container.deploymentColor) }]}>
              {container.deploymentColor.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {container.status === 'running' && (
        <View style={styles.containerStats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>CPU</Text>
            <ProgressBar value={container.cpu?.percent || 0} max={100} color={COLORS.info} />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Memory</Text>
            <View style={styles.memoryInfo}>
              <ProgressBar value={container.memory?.percent || 0} max={100} color={COLORS.primary} />
              <Text style={styles.memoryText}>
                {container.memory?.usedFormatted || '0 B'} / {container.memory?.limitFormatted || '0 B'}
              </Text>
            </View>
          </View>
          <View style={styles.statRowInline}>
            <View style={styles.inlineStat}>
              <Ionicons name="arrow-down" size={12} color={COLORS.success} />
              <Text style={styles.inlineStatText}>{container.network?.rxFormatted || '0 B'}</Text>
            </View>
            <View style={styles.inlineStat}>
              <Ionicons name="arrow-up" size={12} color={COLORS.info} />
              <Text style={styles.inlineStatText}>{container.network?.txFormatted || '0 B'}</Text>
            </View>
            <View style={styles.inlineStat}>
              <Ionicons name="layers" size={12} color={COLORS.textSecondary} />
              <Text style={styles.inlineStatText}>{container.pids || 0} PIDs</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.containerMeta}>
        <Text style={styles.metaText}>
          <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} /> {container.uptime || 'N/A'}
        </Text>
        {container.restartCount > 0 && (
          <Text style={[styles.metaText, { color: COLORS.warning }]}>
            <Ionicons name="refresh" size={12} color={COLORS.warning} /> {container.restartCount} restarts
          </Text>
        )}
      </View>

      <View style={styles.containerActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnLogs]} 
          onPress={() => onViewLogs(container)}
        >
          <Ionicons name="document-text" size={16} color={COLORS.info} />
          <Text style={[styles.actionBtnText, { color: COLORS.info }]}>Logs</Text>
        </TouchableOpacity>
        
        {container.status === 'running' ? (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnRestart]} 
              onPress={() => onRestart(container)}
            >
              <Ionicons name="refresh" size={16} color={COLORS.warning} />
              <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnStop]} 
              onPress={() => onStop(container)}
            >
              <Ionicons name="stop" size={16} color={COLORS.danger} />
              <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Stop</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnStart]} 
            onPress={() => onStart(container)}
          >
            <Ionicons name="play" size={16} color={COLORS.success} />
            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Start</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Deployment status component
const DeploymentStatus = ({ deployment }) => {
  if (!deployment) return null;

  const getStatusColor = (status) => {
    if (status === 'healthy') return COLORS.success;
    if (status === 'unhealthy' || status === 'exited') return COLORS.danger;
    if (status === 'starting' || status === 'restarting') return COLORS.warning;
    return COLORS.textSecondary;
  };

  const renderServiceStatus = (services, color) => (
    <View style={styles.deploymentServices}>
      {Object.entries(services).map(([service, status]) => (
        <View key={service} style={styles.serviceStatus}>
          <View style={[styles.serviceStatusDot, { backgroundColor: getStatusColor(status) }]} />
          <Text style={styles.serviceStatusText}>{service}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.deploymentContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="git-branch" size={18} color={COLORS.text} /> Deployment Status
      </Text>
      
      <View style={styles.deploymentGrid}>
        <View style={[styles.deploymentCard, { borderColor: COLORS.blue }]}>
          <View style={styles.deploymentHeader}>
            <Text style={[styles.deploymentTitle, { color: COLORS.blue }]}>BLUE</Text>
            {deployment.activeColor === 'blue' || deployment.activeColor === 'both' ? (
              <View style={[styles.activeBadge, { backgroundColor: `${COLORS.success}20` }]}>
                <Text style={[styles.activeBadgeText, { color: COLORS.success }]}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          {renderServiceStatus(deployment.blue, 'blue')}
        </View>

        <View style={[styles.deploymentCard, { borderColor: COLORS.green }]}>
          <View style={styles.deploymentHeader}>
            <Text style={[styles.deploymentTitle, { color: COLORS.green }]}>GREEN</Text>
            {deployment.activeColor === 'green' || deployment.activeColor === 'both' ? (
              <View style={[styles.activeBadge, { backgroundColor: `${COLORS.success}20` }]}>
                <Text style={[styles.activeBadgeText, { color: COLORS.success }]}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          {renderServiceStatus(deployment.green, 'green')}
        </View>
      </View>
    </View>
  );
};

// Logs modal component
const LogsModal = ({ visible, container, logs, onClose, onRefresh, loading }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.logsModal}>
        <View style={styles.logsHeader}>
          <Text style={styles.logsTitle}>
            <Ionicons name="document-text" size={18} color={COLORS.text} /> {container?.name} Logs
          </Text>
          <View style={styles.logsActions}>
            <TouchableOpacity style={styles.logsRefreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={COLORS.info} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logsCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.logsLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView style={styles.logsContent}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logLine}>{log}</Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

// Main component
export default function InfrastructureMonitoring() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [logsModal, setLogsModal] = useState({ visible: false, container: null, logs: [], loading: false });
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/docker/monitoring`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(false), refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleContainerAction = async (action, container) => {
    const confirmMessage = `Are you sure you want to ${action} ${container.name}?`;
    
    const performAction = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await fetch(
          `${API_BASE_URL}/api/admin/docker/containers/${container.id}/${action}`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );

        const result = await response.json();
        if (result.success) {
          fetchData(false);
        } else {
          Alert.alert('Error', result.error || `Failed to ${action} container`);
        }
      } catch (err) {
        Alert.alert('Error', `Failed to ${action} container: ${err.message}`);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        performAction();
      }
    } else {
      Alert.alert('Confirm', confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: performAction },
      ]);
    }
  };

  const handleViewLogs = async (container) => {
    setLogsModal({ visible: true, container, logs: [], loading: true });
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/docker/containers/${container.id}/logs?lines=200`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const result = await response.json();
      if (result.success) {
        setLogsModal(prev => ({ ...prev, logs: result.data.logs, loading: false }));
      } else {
        setLogsModal(prev => ({ ...prev, logs: ['Failed to load logs'], loading: false }));
      }
    } catch (err) {
      setLogsModal(prev => ({ ...prev, logs: [`Error: ${err.message}`], loading: false }));
    }
  };

  const refreshLogs = () => {
    if (logsModal.container) {
      handleViewLogs(logsModal.container);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Infrastructure Data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData(true)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { overview, server, containers, deployment } = data || {};

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Infrastructure</Text>
            <Text style={styles.headerSubtitle}>Real-time Monitoring</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.autoRefreshBtn, autoRefresh && styles.autoRefreshBtnActive]}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Ionicons 
                name={autoRefresh ? 'sync' : 'sync-outline'} 
                size={20} 
                color={autoRefresh ? COLORS.success : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        {lastUpdate && (
          <Text style={styles.lastUpdate}>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && ` • Auto-refresh: ${refreshInterval / 1000}s`}
          </Text>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Docker Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="cube" size={18} color={COLORS.text} /> Docker Overview
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="server"
              label="Total Containers"
              value={overview?.totalContainers || 0}
              color={COLORS.info}
            />
            <MetricCard
              icon="play-circle"
              label="Running"
              value={overview?.runningContainers || 0}
              color={COLORS.success}
            />
            <MetricCard
              icon="stop-circle"
              label="Stopped"
              value={overview?.stoppedContainers || 0}
              color={COLORS.danger}
            />
            <MetricCard
              icon="images"
              label="Images"
              value={overview?.totalImages || 0}
              color={COLORS.primary}
            />
          </View>
        </View>

        {/* Server Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="hardware-chip" size={18} color={COLORS.text} /> Server Resources
          </Text>
          <View style={styles.serverStats}>
            <View style={styles.serverStatRow}>
              <Text style={styles.serverStatLabel}>Hostname</Text>
              <Text style={styles.serverStatValue}>{server?.hostname || 'N/A'}</Text>
            </View>
            <View style={styles.serverStatRow}>
              <Text style={styles.serverStatLabel}>Platform</Text>
              <Text style={styles.serverStatValue}>{server?.platform} ({server?.arch})</Text>
            </View>
            <View style={styles.serverStatRow}>
              <Text style={styles.serverStatLabel}>CPU Cores</Text>
              <Text style={styles.serverStatValue}>{server?.cpuCount || 0}</Text>
            </View>
            <View style={styles.serverStatRow}>
              <Text style={styles.serverStatLabel}>Load Average</Text>
              <Text style={styles.serverStatValue}>
                {server?.loadAverage?.map(l => l.toFixed(2)).join(' / ') || 'N/A'}
              </Text>
            </View>
            <View style={styles.serverStatRow}>
              <Text style={styles.serverStatLabel}>Uptime</Text>
              <Text style={styles.serverStatValue}>{formatUptime(server?.uptime || 0)}</Text>
            </View>
            
            <View style={styles.resourceBar}>
              <View style={styles.resourceBarHeader}>
                <Text style={styles.resourceBarLabel}>Memory Usage</Text>
                <Text style={styles.resourceBarValue}>
                  {formatBytes(server?.totalMemory - server?.freeMemory || 0)} / {formatBytes(server?.totalMemory || 0)}
                </Text>
              </View>
              <ProgressBar 
                value={server?.memoryUsedPercent || 0} 
                max={100} 
                color={COLORS.primary}
                height={12}
              />
            </View>

            {server?.diskUsage && (
              <View style={styles.resourceBar}>
                <View style={styles.resourceBarHeader}>
                  <Text style={styles.resourceBarLabel}>Disk Usage</Text>
                  <Text style={styles.resourceBarValue}>
                    {formatBytes(server.diskUsage.used)} / {formatBytes(server.diskUsage.total)}
                  </Text>
                </View>
                <ProgressBar 
                  value={server.diskUsage.percent} 
                  max={100} 
                  color={COLORS.info}
                  height={12}
                />
              </View>
            )}
          </View>
        </View>

        {/* Deployment Status */}
        <DeploymentStatus deployment={deployment} />

        {/* Containers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="layers" size={18} color={COLORS.text} /> Containers ({containers?.length || 0})
          </Text>
          <View style={styles.containersGrid}>
            {containers?.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onRestart={(c) => handleContainerAction('restart', c)}
                onStop={(c) => handleContainerAction('stop', c)}
                onStart={(c) => handleContainerAction('start', c)}
                onViewLogs={handleViewLogs}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Docker v{overview?.dockerVersion || 'N/A'}
          </Text>
        </View>
      </ScrollView>

      {/* Logs Modal */}
      <LogsModal
        visible={logsModal.visible}
        container={logsModal.container}
        logs={logsModal.logs}
        loading={logsModal.loading}
        onClose={() => setLogsModal({ visible: false, container: null, logs: [], loading: false })}
        onRefresh={refreshLogs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRefreshBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  autoRefreshBtnActive: {
    backgroundColor: `${COLORS.success}20`,
  },
  lastUpdate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginLeft: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricCard: {
    width: isWeb ? '23%' : '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  metricSubValue: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  serverStats: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  serverStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serverStatLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  serverStatValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  resourceBar: {
    marginTop: 16,
  },
  resourceBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resourceBarLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  resourceBarValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'right',
  },
  deploymentContainer: {
    padding: 16,
  },
  deploymentGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
  },
  deploymentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  deploymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deploymentTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deploymentServices: {
    gap: 8,
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  serviceStatusText: {
    fontSize: 14,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  containersGrid: {
    gap: 12,
  },
  containerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  containerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  containerTitleContainer: {
    flex: 1,
  },
  containerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  containerId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  deploymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  deploymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  containerStats: {
    marginBottom: 12,
  },
  statRow: {
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  memoryInfo: {
    gap: 4,
  },
  memoryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  containerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  containerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionBtnLogs: {
    backgroundColor: `${COLORS.info}15`,
  },
  actionBtnRestart: {
    backgroundColor: `${COLORS.warning}15`,
  },
  actionBtnStop: {
    backgroundColor: `${COLORS.danger}15`,
  },
  actionBtnStart: {
    backgroundColor: `${COLORS.success}15`,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logsModal: {
    width: '100%',
    maxWidth: 800,
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  logsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logsRefreshBtn: {
    padding: 8,
  },
  logsCloseBtn: {
    padding: 4,
  },
  logsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  logsContent: {
    padding: 16,
    maxHeight: 500,
  },
  logLine: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
    lineHeight: 18,
  },
});
