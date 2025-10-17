import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const jobListings = [
  {
    id: 'beta-tester',
    title: 'Beta Tester',
    type: 'Part-Time',
    location: 'Remote',
    category: 'Testing',
    spots: 30,
    description: 'Help shape the future of Circle by testing new features',
    icon: '🚀',
    urgent: true,
  },
  {
    id: 'mobile-developer',
    title: 'Mobile Developer',
    type: 'Full-Time',
    location: 'Remote/Hybrid',
    category: 'Engineering',
    spots: 3,
    description: 'Build amazing mobile experiences with React Native',
    icon: '📱',
    urgent: false,
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    type: 'Full-Time',
    location: 'Remote/Hybrid',
    category: 'Engineering',
    spots: 2,
    description: 'Design and build scalable backend systems',
    icon: '⚙️',
    urgent: false,
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    type: 'Full-Time',
    location: 'Remote/Hybrid',
    category: 'Design',
    spots: 2,
    description: 'Create beautiful and intuitive user experiences',
    icon: '🎨',
    urgent: false,
  },
  {
    id: 'content-moderator',
    title: 'Content Moderator',
    type: 'Full-Time',
    location: 'Remote',
    category: 'Operations',
    spots: 5,
    description: 'Ensure a safe and positive community environment',
    icon: '🛡️',
    urgent: true,
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI/ML Engineer',
    type: 'Full-Time',
    location: 'Remote/Hybrid',
    category: 'Engineering',
    spots: 2,
    description: 'Build intelligent features powered by AI',
    icon: '🤖',
    urgent: false,
  },
  {
    id: 'marketing-manager',
    title: 'Marketing Manager',
    type: 'Full-Time',
    location: 'Remote/Hybrid',
    category: 'Marketing',
    spots: 1,
    description: 'Drive growth and user acquisition strategies',
    icon: '📈',
    urgent: false,
  },
  {
    id: 'community-manager',
    title: 'Community Manager',
    type: 'Full-Time',
    location: 'Remote',
    category: 'Operations',
    spots: 2,
    description: 'Build and engage our growing community',
    icon: '💬',
    urgent: false,
  },
];

export default function CareersPage() {
  const router = useRouter();

  const handleJobClick = (jobId) => {
    router.push(`/careers/${jobId}`);
  };

  const handleContactUs = () => {
    Linking.openURL('mailto:careers@orincore.com?subject=Career Inquiry');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Join Our Team</Text>
        <Text style={styles.headerSubtitle}>
          Help us build the future of social networking and learning
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{jobListings.length}</Text>
          <Text style={styles.statLabel}>Open Positions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {jobListings.reduce((sum, job) => sum + job.spots, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Spots</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>Remote</Text>
          <Text style={styles.statLabel}>Work Options</Text>
        </View>
      </View>

      {/* Job Listings */}
      <View style={styles.jobsSection}>
        <Text style={styles.sectionTitle}>Open Positions</Text>
        
        {jobListings.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={styles.jobCard}
            onPress={() => handleJobClick(job.id)}
            activeOpacity={0.7}
          >
            {job.urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>⏰ Limited Spots</Text>
              </View>
            )}
            
            <View style={styles.jobHeader}>
              <Text style={styles.jobIcon}>{job.icon}</Text>
              <View style={styles.jobTitleContainer}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.jobMetaRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{job.type}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeSecondary]}>
                    <Text style={styles.badgeText}>{job.location}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeCategory]}>
                    <Text style={styles.badgeText}>{job.category}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <Text style={styles.jobDescription}>{job.description}</Text>
            
            <View style={styles.jobFooter}>
              <Text style={styles.spotsText}>
                {job.spots} {job.spots === 1 ? 'position' : 'positions'} available
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#7C2B86" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Why Join Us */}
      <View style={styles.whyJoinSection}>
        <Text style={styles.sectionTitle}>Why Join Circle?</Text>
        
        <View style={styles.benefitCard}>
          <Text style={styles.benefitIcon}>💎</Text>
          <Text style={styles.benefitTitle}>Competitive Compensation</Text>
          <Text style={styles.benefitText}>
            Industry-leading salaries and equity options
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Text style={styles.benefitIcon}>🏠</Text>
          <Text style={styles.benefitTitle}>Remote-First Culture</Text>
          <Text style={styles.benefitText}>
            Work from anywhere with flexible hours
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Text style={styles.benefitIcon}>🚀</Text>
          <Text style={styles.benefitTitle}>Growth Opportunities</Text>
          <Text style={styles.benefitText}>
            Learn, grow, and advance your career with us
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Text style={styles.benefitIcon}>🎯</Text>
          <Text style={styles.benefitTitle}>Impact & Innovation</Text>
          <Text style={styles.benefitText}>
            Build products that millions will use
          </Text>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Don't see a perfect fit?</Text>
        <Text style={styles.contactText}>
          We're always looking for talented individuals. Send us your resume!
        </Text>
        <TouchableOpacity style={styles.contactButton} onPress={handleContactUs}>
          <Text style={styles.contactButtonText}>Contact Us</Text>
          <Ionicons name="mail-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 Circle by ORINCORE Technologies
        </Text>
        <Text style={styles.footerText}>All rights reserved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#7C2B86',
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C2B86',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  jobsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  urgentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  urgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  jobTitleContainer: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  jobMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#7C2B86',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSecondary: {
    backgroundColor: '#6c757d',
  },
  badgeCategory: {
    backgroundColor: '#28a745',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  spotsText: {
    fontSize: 13,
    color: '#7C2B86',
    fontWeight: '600',
  },
  whyJoinSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  benefitCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7C2B86',
  },
  benefitIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
  },
  contactSection: {
    padding: 20,
    backgroundColor: '#7C2B86',
    marginHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#7C2B86',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
