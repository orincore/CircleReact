# Circle Dating App - AdMob Integration Strategy

## Overview
This document outlines the comprehensive AdMob integration strategy for Circle dating app, designed to maximize revenue from free users while maintaining an excellent user experience.

## Ad Types & Placements

### 1. Banner Ads (Always Visible)
**Purpose:** Consistent revenue stream with minimal UX impact

**Placements:**
- ✅ **Chat List Screen** (Bottom)
  - High visibility, users check messages frequently
  - Non-intrusive placement below conversation list
  - Revenue Priority: **HIGH**

- ✅ **Profile Screen** (Bottom)
  - Users spend time viewing their profile
  - Natural placement below profile content
  - Revenue Priority: **MEDIUM**

- ✅ **Explore Screen** (Bottom)
  - Users browse potential matches
  - Visible while scrolling through profiles
  - Revenue Priority: **MEDIUM**

**Implementation:**
```jsx
import BannerAd from '@/components/ads/BannerAd';

<BannerAd placement="chat_list_bottom" />
```

### 2. Interstitial Ads (Full Screen)
**Purpose:** Higher revenue per impression, shown at natural breaks

**Placements:**
- ✅ **After Match Actions** (Every 3 matches)
  - Natural break in user flow
  - User has completed an action
  - 5-minute cooldown between ads
  - Revenue Priority: **HIGH**

- ✅ **Screen Transitions** (Every 5 transitions)
  - Between major navigation changes
  - 10-minute cooldown
  - Revenue Priority: **LOW**

**Frequency Limits:**
- Maximum 3 per hour
- Maximum 15 per day
- Minimum 5 minutes between ads

**Implementation:**
```jsx
import { useInterstitialAd } from '@/components/ads/InterstitialAd';

const { showInterstitial } = useInterstitialAd('after_match');

// After user makes a match
showInterstitial(() => {
  // Continue with app flow
});
```

### 3. Rewarded Ads (User-Initiated)
**Purpose:** Give free users access to premium features temporarily

**Rewards:**
- ✅ **View Instagram Username** (24 hours)
  - Watch ad to see someone's Instagram
  - Access expires after 24 hours
  - Revenue Priority: **HIGH**

- ✅ **Extra Matches** (5 additional matches)
  - Free users limited to 3 matches/day
  - Watch ad for 5 more matches
  - Revenue Priority: **HIGH**

- ✅ **Profile Boost** (1 hour)
  - Increased visibility in match queue
  - Temporary premium feature access
  - Revenue Priority: **MEDIUM**

**Frequency Limits:**
- Maximum 10 rewarded ads per day

**Implementation:**
```jsx
import { useRewardedAd } from '@/components/ads/RewardedAd';

const { showRewardedAd, isLoaded } = useRewardedAd('unlock_instagram');

const handleWatchAd = () => {
  showRewardedAd((rewarded) => {
    if (rewarded) {
      // Grant 24-hour access to Instagram usernames
      AdMobService.grantReward('view_instagram_username', 86400000);
    }
  });
};
```

## Revenue Optimization Strategy

### High-Impact Placements
1. **Chat List Banner** - Users check messages multiple times daily
2. **After Match Interstitial** - High engagement moment
3. **Instagram Unlock Rewarded** - High-value feature users want

### User Experience Protection
- ✅ No ads during active conversations
- ✅ No ads during matching/swiping
- ✅ Cooldown periods prevent ad fatigue
- ✅ Frequency limits maintain app quality
- ✅ Rewarded ads are 100% optional

### Conversion Funnel
```
Free User Experience
↓
Sees banner ads (subtle reminder)
↓
Hits match limit or wants Instagram
↓
Option: Watch rewarded ad OR upgrade to premium
↓
If watches ads repeatedly → More likely to convert to premium
↓
Premium = No ads + All features
```

## Implementation Checklist

### Phase 1: Setup (Complete)
- [x] Create AdMob configuration
- [x] Create AdMob service for frequency management
- [x] Create reusable ad components
- [x] Document strategy

### Phase 2: Integration (Next Steps)
- [ ] Add banner ads to chat list screen
- [ ] Add banner ads to profile screen
- [ ] Add banner ads to explore screen
- [ ] Implement interstitial after match actions
- [ ] Create rewarded ad UI for Instagram unlock
- [ ] Create rewarded ad UI for extra matches
- [ ] Create rewarded ad UI for profile boost

### Phase 3: Configuration
- [ ] Get AdMob account and app ID
- [ ] Create ad units in AdMob console
- [ ] Add production ad unit IDs to environment variables
- [ ] Configure app.json with AdMob app ID
- [ ] Test ads on real devices

### Phase 4: Testing
- [ ] Test banner ad display
- [ ] Test interstitial frequency limits
- [ ] Test rewarded ad reward granting
- [ ] Test premium user ad blocking
- [ ] Test ad error handling

## Environment Variables

Add to `.env`:
```
# iOS AdMob IDs
EXPO_PUBLIC_ADMOB_IOS_BANNER=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_REWARDED=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# Android AdMob IDs
EXPO_PUBLIC_ADMOB_ANDROID_BANNER=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

## app.json Configuration

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

## Revenue Projections

### Assumptions
- 1000 daily active free users
- Average 5 banner ad impressions per user per day
- Average 1 interstitial ad per user per day
- Average 0.5 rewarded ads per user per day

### Estimated Revenue (Monthly)
- **Banner Ads:** 150,000 impressions × $0.50 CPM = $75
- **Interstitial Ads:** 30,000 impressions × $3.00 CPM = $90
- **Rewarded Ads:** 15,000 impressions × $10.00 CPM = $150

**Total Monthly Revenue:** ~$315 from 1000 DAU

**Scaling:** With 10,000 DAU = ~$3,150/month

## Best Practices

### Do's ✅
- Show ads only to free users
- Respect frequency limits
- Provide value through rewarded ads
- Test thoroughly before production
- Monitor ad performance metrics
- A/B test ad placements

### Don'ts ❌
- Don't show ads during critical user actions
- Don't show ads too frequently
- Don't block app functionality with ads
- Don't show ads to premium users
- Don't ignore user feedback about ads

## Monitoring & Optimization

### Key Metrics to Track
1. **Ad Fill Rate** - Percentage of ad requests filled
2. **eCPM** - Effective cost per thousand impressions
3. **Click-Through Rate (CTR)** - User engagement with ads
4. **Conversion Rate** - Free to premium conversion
5. **User Retention** - Impact of ads on retention

### Optimization Strategies
- Adjust frequency limits based on retention data
- Test different ad placements
- Optimize rewarded ad rewards
- Monitor premium conversion rates
- Balance revenue vs. user experience

## Support & Resources

- **AdMob Console:** https://apps.admob.com/
- **React Native Google Mobile Ads:** https://docs.page/invertase/react-native-google-mobile-ads
- **AdMob Policies:** https://support.google.com/admob/answer/6128543

## Contact

For questions about AdMob implementation:
- Technical: Check `/src/config/admob.js` and `/src/services/AdMobService.js`
- Strategy: Review this document
- Issues: Check component error logs
