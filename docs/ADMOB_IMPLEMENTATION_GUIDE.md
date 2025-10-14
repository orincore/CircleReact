# AdMob Implementation Guide - Quick Start

## 📋 Overview

This guide provides step-by-step instructions for implementing Google AdMob in the Circle dating app to generate revenue from free users.

## 🎯 Revenue Strategy Summary

### Ad Placements (Optimized for Revenue & UX)

| Ad Type | Placement | Frequency | Revenue Priority | UX Impact |
|---------|-----------|-----------|------------------|-----------|
| **Banner** | Chat List Bottom | Always | HIGH | Low |
| **Banner** | Profile Bottom | Always | MEDIUM | Low |
| **Banner** | Explore Bottom | Always | MEDIUM | Low |
| **Interstitial** | After Match (Every 3) | 5min cooldown | HIGH | Medium |
| **Interstitial** | Screen Transition (Every 5) | 10min cooldown | LOW | Medium |
| **Rewarded** | Unlock Instagram | User-initiated | HIGH | None |
| **Rewarded** | Extra Matches (+5) | User-initiated | HIGH | None |
| **Rewarded** | Profile Boost (1hr) | User-initiated | MEDIUM | None |

## 🚀 Quick Start (5 Steps)

### Step 1: Install Dependencies

```bash
npx expo install react-native-google-mobile-ads
```

### Step 2: Get AdMob Account

1. Go to https://admob.google.com/
2. Create account or sign in
3. Add your app (iOS & Android)
4. Create ad units:
   - Banner ad unit
   - Interstitial ad unit
   - Rewarded ad unit

### Step 3: Configure app.json

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

### Step 4: Add Environment Variables

Create/update `.env`:
```env
# iOS AdMob IDs
EXPO_PUBLIC_ADMOB_IOS_BANNER=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_REWARDED=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# Android AdMob IDs
EXPO_PUBLIC_ADMOB_ANDROID_BANNER=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

### Step 5: Add Ads to Screens

See implementation examples below.

## 💻 Implementation Examples

### Banner Ad - Chat List

**File:** `/app/secure/(tabs)/chat/index.jsx`

```jsx
import BannerAd from '@/components/ads/BannerAd';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function ChatListScreen() {
  const { shouldShowAds } = useSubscription();
  
  return (
    <View style={{ flex: 1 }}>
      {/* Existing chat list content */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        // ... other props
      />
      
      {/* Banner ad at bottom - only for free users */}
      {shouldShowAds() && (
        <BannerAd placement="chat_list_bottom" />
      )}
    </View>
  );
}
```

### Interstitial Ad - After Match

**File:** `/app/secure/(tabs)/match.jsx`

```jsx
import { useInterstitialAd } from '@/components/ads/InterstitialAd';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AdMobService from '@/src/services/AdMobService';

export default function MatchScreen() {
  const { shouldShowAds } = useSubscription();
  const { showInterstitial } = useInterstitialAd('after_match');
  
  const handleMatch = async (action) => {
    // Process match action
    await processMatch(action);
    
    // Increment match count
    AdMobService.incrementMatchCount();
    
    // Show interstitial if conditions met (free user, every 3 matches, cooldown passed)
    if (shouldShowAds() && AdMobService.shouldShowAfterMatch()) {
      showInterstitial(() => {
        // Continue to next match
        loadNextMatch();
      });
    } else {
      // Continue without ad
      loadNextMatch();
    }
  };
  
  return (
    // ... match UI
  );
}
```

### Rewarded Ad - Unlock Instagram

**File:** `/components/InstagramUsername.jsx`

```jsx
import { useRewardedAd } from '@/components/ads/RewardedAd';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AdMobService from '@/src/services/AdMobService';
import { useState } from 'react';

export default function InstagramUsername({ username }) {
  const { isPremium } = useSubscription();
  const { showRewardedAd, isLoaded } = useRewardedAd('unlock_instagram');
  const [hasReward, setHasReward] = useState(
    AdMobService.hasActiveReward('view_instagram_username')
  );
  
  const handleWatchAd = () => {
    showRewardedAd((rewarded) => {
      if (rewarded) {
        // Grant 24-hour access
        AdMobService.grantReward('view_instagram_username', 86400000);
        setHasReward(true);
      }
    });
  };
  
  // Premium users see Instagram immediately
  if (isPremium()) {
    return <Text>@{username}</Text>;
  }
  
  // Free users with active reward see Instagram
  if (hasReward) {
    return <Text>@{username}</Text>;
  }
  
  // Free users without reward see unlock button
  return (
    <TouchableOpacity onPress={handleWatchAd} disabled={!isLoaded}>
      <View style={styles.unlockButton}>
        <Ionicons name="play-circle" size={20} color="#7C2B86" />
        <Text>Watch ad to see Instagram</Text>
      </View>
    </TouchableOpacity>
  );
}
```

### Rewarded Ad - Extra Matches

**File:** `/components/MatchLimitWarning.jsx`

```jsx
import { useRewardedAd } from '@/components/ads/RewardedAd';
import AdMobService from '@/src/services/AdMobService';

export default function MatchLimitWarning({ onMatchesGranted }) {
  const { showRewardedAd, isLoaded } = useRewardedAd('extra_matches');
  
  const handleWatchAd = () => {
    showRewardedAd((rewarded) => {
      if (rewarded) {
        // Grant 5 extra matches
        AdMobService.grantReward('extra_matches_5', true);
        onMatchesGranted(5);
      }
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Match Limit Reached</Text>
      <Text style={styles.subtitle}>You've used all 3 free matches today</Text>
      
      <TouchableOpacity 
        style={styles.adButton} 
        onPress={handleWatchAd}
        disabled={!isLoaded}
      >
        <Ionicons name="play-circle" size={24} color="white" />
        <Text style={styles.adButtonText}>
          Watch Ad for 5 More Matches
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.premiumButton}
        onPress={() => router.push('/secure/profile/subscription')}
      >
        <Text style={styles.premiumButtonText}>
          Upgrade to Premium - Unlimited Matches
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 📊 Files Created

### Configuration
- ✅ `/src/config/admob.js` - Ad unit IDs and configuration
- ✅ `/src/services/AdMobService.js` - Frequency management and rewards

### Components
- ✅ `/components/ads/BannerAd.jsx` - Banner ad component
- ✅ `/components/ads/InterstitialAd.jsx` - Interstitial ad hook
- ✅ `/components/ads/RewardedAd.jsx` - Rewarded ad hook

### Documentation
- ✅ `/docs/ADMOB_STRATEGY.md` - Comprehensive strategy document
- ✅ `/docs/ADMOB_IMPLEMENTATION_GUIDE.md` - This file

## 🧪 Testing

### Test Mode (Default)
The app uses test ad units by default. You'll see "Test Ad" labels.

### Production Mode
Set `NODE_ENV=production` and add real ad unit IDs to `.env`

### Test Checklist
- [ ] Banner ads display correctly
- [ ] Interstitial ads respect frequency limits
- [ ] Rewarded ads grant rewards correctly
- [ ] Premium users don't see ads
- [ ] Ads don't crash the app
- [ ] Ads load on real devices

## 🎨 UI/UX Best Practices

### Banner Ads
```jsx
// Good: Non-intrusive, at bottom
<View style={{ flex: 1 }}>
  <ScrollView>{content}</ScrollView>
  <BannerAd />
</View>

// Bad: Blocks content
<View>
  <BannerAd />
  <ScrollView>{content}</ScrollView>
</View>
```

### Interstitial Ads
```jsx
// Good: After user action completes
handleAction().then(() => {
  showInterstitial(() => continueFlow());
});

// Bad: During user action
showInterstitial(() => {
  handleAction();
});
```

### Rewarded Ads
```jsx
// Good: Clear value proposition
<Text>Watch ad to unlock Instagram username for 24 hours</Text>

// Bad: Vague benefit
<Text>Watch ad for reward</Text>
```

## 📈 Revenue Optimization Tips

1. **Monitor Metrics Daily**
   - Check AdMob console for fill rates
   - Track eCPM by ad type
   - Monitor user retention

2. **A/B Test Placements**
   - Test different banner positions
   - Adjust interstitial frequency
   - Optimize reward values

3. **Balance Revenue vs. UX**
   - If retention drops, reduce ad frequency
   - If conversion increases, ads are working
   - Premium users should never see ads

4. **Optimize Rewards**
   - Make rewards valuable enough to watch ads
   - Not so valuable that users never upgrade
   - Track which rewards convert best

## 🐛 Troubleshooting

### Ads Not Showing
1. Check if user is premium (`shouldShowAds()` returns false)
2. Verify ad unit IDs are correct
3. Check frequency limits in AdMobService
4. Look for errors in console logs

### Ads Showing to Premium Users
1. Verify `shouldShowAds()` check is in place
2. Check SubscriptionContext is working
3. Test subscription status updates

### Rewarded Ads Not Granting Rewards
1. Check `AdMobService.grantReward()` is called
2. Verify reward type matches
3. Check reward expiry logic

## 📞 Next Steps

1. **Get AdMob Account** - Sign up at https://admob.google.com/
2. **Create Ad Units** - Set up banner, interstitial, and rewarded ads
3. **Update Configuration** - Add real ad unit IDs to `.env`
4. **Integrate Ads** - Follow implementation examples above
5. **Test Thoroughly** - Use test devices before going live
6. **Monitor Performance** - Track metrics and optimize

## 🎯 Expected Results

With proper implementation:
- ✅ Free users see ads without UX degradation
- ✅ Premium users never see ads
- ✅ Revenue generated from 3 ad types
- ✅ Conversion funnel: Free → Ads → Premium
- ✅ Sustainable monetization model

---

**Ready to implement?** Start with Step 1 and follow the guide sequentially!
