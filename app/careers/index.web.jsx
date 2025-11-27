import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';

const jobListings = [
  {
    id: 'app-testing',
    title: 'App Testing (1-year Subscription Reward)',
    type: 'Part-Time (60 days)',
    location: 'Remote',
    category: 'Quality Assurance',
    spots: 50,
    description: 'Use the app at least 30 minutes daily, report issues via any medium. Max 50 testers. Reward: 1-year subscription.',
    icon: '🧪',
    urgent: true,
  },
];

export default function CareersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmall = width < 640; // mobile breakpoint

  const handleJobClick = (job) => {
    // For web, open an email draft pre-filled with the job in the subject
    if (job.id === 'app-testing') {
      router.push('/careers/app-testing');
      return;
    }
    const subject = encodeURIComponent(`Application: ${job.title} (${job.id})`);
    const body = encodeURIComponent('Hi Circle Team,\n\nI would like to apply for the role above. Please find my details attached.\n\nRegards,');
    Linking.openURL(`mailto:careers@orincore.com?subject=${subject}&body=${body}`);
  };

  const handleContactUs = () => {
    router.push('/contact');
  };

  return (
    <ScrollView style={styles.container}>
      <Head>
        <title>Careers | Circle by ORINCORE</title>
        <meta name="description" content="Explore open roles at Circle by ORINCORE. Join us to build the future of social networking and learning." />
      </Head>
      {/* Header */}
      <LinearGradient
        colors={[ '#7C2B86', '#A16AE8' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, isSmall && styles.headerSmall]}
      >
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle, isSmall && styles.headerTitleSmall]}>Join Our Team</Text>
          <Text style={[styles.headerSubtitle, isSmall && styles.headerSubtitleSmall]}>
            Help us build the future of social networking and learning
          </Text>
          <View style={[styles.headerCtas, isSmall && styles.headerCtasSmall]}>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  const el = document.getElementById('open-positions');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              activeOpacity={0.9}
              style={[styles.primaryCta, isSmall && styles.primaryCtaSmall]}
            >
              <Ionicons name="briefcase-outline" size={18} color="#fff" />
              <Text style={styles.primaryCtaText}>View Open Roles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleContactUs}
              activeOpacity={0.9}
              style={[styles.secondaryCta, isSmall && styles.secondaryCtaSmall]}
            >
              <Ionicons name="mail-outline" size={18} color="#7C2B86" />
              <Text style={styles.secondaryCtaText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      {/* Content Wrapper */}
      <View style={[styles.content, isSmall && styles.contentSmall]}>        
      {/* Stats */}
      <View style={[styles.statsContainer, isSmall && styles.statsContainerSmall]}>
        <View style={styles.statBox}>
          <View style={styles.statIconWrap}><Ionicons name="briefcase-outline" size={18} color="#7C2B86" /></View>
          <Text style={[styles.statNumber, isSmall && styles.statNumberSmall]}>{jobListings.length}</Text>
          <Text style={[styles.statLabel, isSmall && styles.statLabelSmall]}>Open Roles</Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statIconWrap}><Ionicons name="people-outline" size={18} color="#7C2B86" /></View>
          <Text style={[styles.statNumber, isSmall && styles.statNumberSmall]}>
            {jobListings.reduce((sum, job) => sum + job.spots, 0)}
          </Text>
          <Text style={[styles.statLabel, isSmall && styles.statLabelSmall]}>Total Spots</Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statIconWrap}><Ionicons name="globe-outline" size={18} color="#7C2B86" /></View>
          <Text style={[styles.statNumber, isSmall && styles.statNumberSmall]}>Remote</Text>
          <Text style={[styles.statLabel, isSmall && styles.statLabelSmall]}>Work Options</Text>
        </View>
      </View>

      {/* Job Listings */}
      <View style={[styles.jobsSection, isSmall && styles.jobsSectionSmall]} nativeID="open-positions">
        <Text style={[styles.sectionTitle, isSmall && styles.sectionTitleSmall]}>Open Positions</Text>
        <Text style={[styles.sectionDescription, isSmall && styles.sectionDescriptionSmall]}>
          Transparent roles with clear expectations. Apply to a role that fits your skills and interests.
        </Text>
        <View style={[styles.jobsGrid, !isSmall && styles.jobsGridDesktop]}>
        {jobListings.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={[styles.jobCard, isSmall && styles.jobCardSmall]}
            onPress={() => handleJobClick(job)}
            activeOpacity={0.7}
          >
            {job.urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>⏰ Limited Spots</Text>
              </View>
            )}

            <View style={[styles.jobHeader, isSmall && styles.jobHeaderSmall]}>
              <View style={styles.jobIconWrap}><Text style={styles.jobIcon}>{job.icon}</Text></View>
              <View style={[styles.jobTitleContainer, isSmall && styles.jobTitleContainerSmall]}>
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

            <Text style={[styles.jobDescription, isSmall && styles.jobDescriptionSmall]}>{job.description}</Text>

            <View style={[styles.jobFooter, isSmall && styles.jobFooterSmall]}>
              <Text style={[styles.spotsText, isSmall && styles.spotsTextSmall]}>
                {job.spots} {job.spots === 1 ? 'position' : 'positions'} available
              </Text>
              <View style={[styles.jobFooterRight, isSmall && styles.jobFooterRightSmall]}>
                <TouchableOpacity onPress={() => handleJobClick(job)} activeOpacity={0.9}>
                  <LinearGradient
                    colors={[ '#7C2B86', '#A16AE8' ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.applyButton, isSmall && styles.applyButtonSmall]}
                  >
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                    <Text style={[styles.applyButtonText, isSmall && styles.applyButtonTextSmall]}>Apply</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        </View>
      </View>

      {/* Why Join Us */}
      <View style={styles.whyJoinSection}>
        <Text style={styles.sectionTitle}>Why Join Circle?</Text>
        <View style={styles.benefitCard}>
          <Text style={styles.benefitIcon}>💎</Text>
          <Text style={styles.benefitTitle}>Competitive Compensation</Text>
          <Text style={styles.benefitText}>
            Fair compensation aligned with role, location, and experience
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
            Build thoughtful, user-centered products that create real value
          </Text>
        </View>
      </View>

      {/* Contact Section */}
      <View style={[styles.contactSection, isSmall && styles.contactSectionSmall]}>
        <Text style={[styles.contactTitle, isSmall && styles.contactTitleSmall]}>Don't see a perfect fit?</Text>
        <Text style={[styles.contactText, isSmall && styles.contactTextSmall]}>
          We're always looking for talented individuals. Send us your resume!
        </Text>
        <TouchableOpacity style={[styles.contactButton, isSmall && styles.contactButtonSmall]} onPress={handleContactUs}>
          <Text style={[styles.contactButtonText, isSmall && styles.contactButtonTextSmall]}>Contact Us</Text>
          <Ionicons name="mail-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
  content: {
    paddingVertical: 16,
    ...(Platform.OS === 'web' && {
      maxWidth: 1100,
      marginLeft: 'auto',
      marginRight: 'auto',
    }),
  },
  header: {
    backgroundColor: '#7C2B86',
    paddingVertical: 72,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerInner: {
    ...(Platform.OS === 'web' && {
      maxWidth: 900,
      marginVertical: 0,
      marginHorizontal: 'auto',
      textAlign: 'center',
    }),
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
  },
  headerCtas: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && { alignItems: 'center' })
  },
  headerCtasSmall: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C2B86',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },
  primaryCtaSmall: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    ...(Platform.OS === 'web' && { cursor: 'pointer' })
  },
  secondaryCtaSmall: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: '#7C2B86',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  headerSmall: {
    paddingVertical: 48,
  },
  headerTitleSmall: {
    fontSize: 28,
  },
  headerSubtitleSmall: {
    fontSize: 14,
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
  statsContainerSmall: {
    flexDirection: 'column',
    gap: 12,
    marginTop: -20,
  },
  statBox: {
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
  statNumberSmall: {
    fontSize: 20,
  },
  statLabelSmall: {
    fontSize: 11,
  },
  jobsSection: {
    padding: 20,
  },
  jobsSectionSmall: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  sectionTitleSmall: {
    fontSize: 20,
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  sectionDescriptionSmall: {
    fontSize: 13,
  },
  jobsGrid: {
    gap: 16,
  },
  jobsGridDesktop: {
    ...(Platform.OS === 'web' && {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
    }),
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
    }),
  },
  jobCardSmall: {
    padding: 16,
  },
  jobCardHover: {},
  urgentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 3,
    ...(Platform.OS === 'web' && { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' })
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
    paddingRight: 120, // reserve space for top-right badge
  },
  jobHeaderSmall: {
    paddingRight: 96,
  },
  jobIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  jobTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  jobTitleContainerSmall: {
    paddingRight: 4,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  jobTitleSmall: {
    fontSize: 18,
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
    ...(Platform.OS === 'web' && {
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
    })
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
  jobDescriptionSmall: {
    fontSize: 13,
    lineHeight: 18,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  jobFooterSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  jobFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobFooterRightSmall: {
    alignSelf: 'flex-end',
  },
  spotsText: {
    fontSize: 13,
    color: '#7C2B86',
    fontWeight: '600',
  },
  spotsTextSmall: {
    fontSize: 12,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C2B86',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    ...(Platform.OS === 'web' && {
      transition: 'background-color 0.2s ease, transform 0.2s ease',
    }),
  },
  applyButtonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  applyButtonTextSmall: {
    fontSize: 14,
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
  contactSectionSmall: {
    marginHorizontal: 16,
    padding: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  contactTitleSmall: {
    fontSize: 18,
  },
  contactText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactTextSmall: {
    fontSize: 13,
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
  contactButtonSmall: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  contactButtonText: {
    color: '#7C2B86',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButtonTextSmall: {
    fontSize: 15,
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
