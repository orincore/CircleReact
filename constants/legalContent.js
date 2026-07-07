// Shared content for the Terms and Privacy Policy modal shown during signup
// (components/signup/LegalContentModal.jsx). Mirrors app/terms.jsx and
// app/legal/privacy-policy.jsx, which remain the standalone web pages.

export const TERMS_LAST_UPDATED = 'October 5, 2025';

export const TERMS_INTRO =
  "Welcome to Circle. By accessing or using our application, you agree to be bound by these Terms and Conditions. Please read them carefully.";

export const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    paragraphs: [
      "By creating an account and using Circle, you accept and agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our services.",
    ],
  },
  {
    title: '2. Eligibility',
    paragraphs: ["You must be at least 18 years old to use Circle. By using our services, you represent and warrant that:"],
    bullets: [
      'You are at least 18 years of age',
      'You have the legal capacity to enter into these Terms',
      'You will comply with all applicable laws and regulations',
      'You have not been previously banned from Circle',
    ],
  },
  {
    title: '3. Account Registration',
    paragraphs: ['To use Circle, you must create an account. You agree to:'],
    bullets: [
      'Provide accurate and complete information',
      'Maintain the security of your account credentials',
      'Notify us immediately of any unauthorized access',
      'Be responsible for all activities under your account',
    ],
  },
  {
    title: '4. User Conduct',
    paragraphs: ['You agree NOT to:'],
    bullets: [
      'Use Circle for any illegal or unauthorized purpose',
      'Harass, abuse, or harm other users',
      'Post false, misleading, or offensive content',
      'Impersonate any person or entity',
      'Spam or solicit other users for commercial purposes',
      'Use automated systems or bots',
      'Attempt to access unauthorized areas of the service',
    ],
  },
  {
    title: '5. Content',
    paragraphs: [
      'You retain ownership of content you post on Circle. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with our services.',
      'We reserve the right to remove any content that violates these Terms or is otherwise objectionable.',
    ],
  },
  {
    title: '6. Matching and Connections',
    paragraphs: ['Circle uses algorithms to suggest potential matches. We do not guarantee:'],
    bullets: [
      'The accuracy of matching algorithms',
      'That you will find compatible matches',
      'The conduct or intentions of other users',
      'The outcome of any connections or relationships',
    ],
  },
  {
    title: '7. Safety and Security',
    paragraphs: ['While we implement security measures, you acknowledge that:'],
    bullets: [
      'You are responsible for your own safety when meeting users',
      'We cannot guarantee the identity or intentions of users',
      'You should exercise caution and common sense',
      'You should report suspicious or inappropriate behavior',
    ],
  },
  {
    title: '8. Subscription and Payments',
    paragraphs: ['Circle may offer premium features through subscriptions. By purchasing a subscription:'],
    bullets: [
      'You agree to pay all applicable fees',
      'Subscriptions auto-renew unless cancelled',
      'Refunds are subject to our refund policy',
      'We may change pricing with notice',
    ],
  },
  {
    title: '9. Termination',
    paragraphs: ['We reserve the right to suspend or terminate your account at any time for:'],
    bullets: [
      'Violation of these Terms',
      'Fraudulent or illegal activity',
      'Harmful behavior towards other users',
      'Any other reason at our discretion',
    ],
    trailingParagraphs: ['You may delete your account at any time through the app settings.'],
  },
  {
    title: '10. Disclaimer of Warranties',
    paragraphs: [
      'Circle is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not warrant that the service will be uninterrupted, secure, or error-free.',
    ],
  },
  {
    title: '11. Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by law, ORINCORE Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Circle.',
    ],
  },
  {
    title: '12. Changes to Terms',
    paragraphs: [
      'We may modify these Terms at any time. We will notify you of material changes. Your continued use of Circle after changes constitutes acceptance of the modified Terms.',
    ],
  },
  {
    title: '13. Governing Law',
    paragraphs: [
      'These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.',
    ],
  },
  {
    title: '14. Contact Information',
    paragraphs: ['For questions about these Terms, please contact us at:'],
    contact: ['Email: legal@circle.orincore.com', 'Address: Orincore Technologies, India'],
  },
];

export const TERMS_FOOTER = 'By using Circle, you agree to these Terms of Service and our Privacy Policy.';

export const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    paragraphs: [
      'We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with other users. This includes:',
    ],
    bullets: [
      'Profile information (name, age, photos, bio)',
      'Location data to find nearby matches',
      'Messages and interactions with other users',
      'Device information and usage analytics',
    ],
  },
  {
    title: '2. How We Use Your Information',
    paragraphs: ['We use the information we collect to:'],
    bullets: [
      'Provide and improve our dating services',
      'Match you with compatible users',
      'Send you notifications and updates',
      'Ensure safety and prevent fraud',
      'Analyze usage patterns to improve the app',
    ],
  },
  {
    title: '3. Information Sharing',
    paragraphs: [
      'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information:',
    ],
    bullets: [
      'With other users as part of the matching service',
      'With service providers who assist our operations',
      'When required by law or to protect our rights',
    ],
  },
  {
    title: '4. Location Information',
    paragraphs: [
      'We use your location to help you find nearby matches and improve your experience. You can control location sharing in your device settings. Location data is:',
    ],
    bullets: [
      'Used only for matching and safety features',
      'Not shared with other users without your consent',
      'Stored securely and deleted when no longer needed',
    ],
  },
  {
    title: '5. Data Security',
    paragraphs: [
      'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.',
    ],
  },
  {
    title: '6. Your Rights',
    paragraphs: ['You have the right to:'],
    bullets: [
      'Access and update your personal information',
      'Delete your account and associated data',
      'Opt out of certain communications',
      'Request a copy of your data',
    ],
  },
  {
    title: '7. Analytics and Tracking',
    paragraphs: [
      'We use analytics services to understand how you use our app and improve our services. This includes tracking:',
    ],
    bullets: [
      'App usage patterns and feature adoption',
      'Performance metrics and crash reports',
      'User engagement and retention data',
      'Anonymous usage statistics',
    ],
  },
  {
    title: "8. Children's Privacy",
    paragraphs: [
      'Our service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18.',
    ],
  },
  {
    title: '9. Changes to This Policy',
    paragraphs: [
      'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy in the app and updating the "last updated" date.',
    ],
  },
  {
    title: '10. Contact Us',
    paragraphs: ['If you have any questions about this privacy policy, please contact us at:'],
    contact: ['Email: privacy@circle.orincore.com', 'Address: Orincore Technologies, India'],
  },
];

export const PRIVACY_FOOTER = 'By using Circle, you agree to this Privacy Policy and our Terms of Service.';
