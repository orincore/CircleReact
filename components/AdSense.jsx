import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// Google AdSense component for web browsers
export const AdSense = ({ 
  adSlot = 'ca-pub-1234567890123456', // Dummy AdSense ID
  adFormat = 'auto',
  adStyle = {},
  className = '',
  fullWidthResponsive = true
}) => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        // Load AdSense script if not already loaded
        if (!window.adsbygoogle) {
          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456';
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }

        // Push ad to AdSense queue
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            console.warn('AdSense error:', e);
          }
        }, 100);
      } catch (error) {
        console.warn('Failed to load AdSense:', error);
      }
    }
  }, []);

  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <div 
      className={`adsense-container ${className}`}
      style={{
        textAlign: 'center',
        margin: '20px 0',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        ...adStyle
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...adStyle
        }}
        data-ad-client={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  );
};

// Banner Ad Component
export const BannerAd = ({ style = {} }) => (
  <AdSense
    adSlot="ca-pub-1234567890123456"
    adFormat="horizontal"
    adStyle={{
      width: '100%',
      height: '90px',
      ...style
    }}
    className="banner-ad"
  />
);

// Square Ad Component
export const SquareAd = ({ style = {} }) => (
  <AdSense
    adSlot="ca-pub-1234567890123456"
    adFormat="rectangle"
    adStyle={{
      width: '300px',
      height: '250px',
      ...style
    }}
    className="square-ad"
  />
);

// Responsive Ad Component
export const ResponsiveAd = ({ style = {} }) => (
  <AdSense
    adSlot="ca-pub-1234567890123456"
    adFormat="auto"
    adStyle={{
      display: 'block',
      ...style
    }}
    className="responsive-ad"
    fullWidthResponsive={true}
  />
);

// AdMob placeholder for mobile (React Native)
export const AdMobBanner = ({ style = {} }) => {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={[styles.adMobContainer, style]}>
      <Text style={styles.adMobText}>AdMob Banner Placeholder</Text>
      <Text style={styles.adMobSubtext}>
        AdMob ID: ca-app-pub-1234567890123456/1234567890
      </Text>
    </View>
  );
};

// Interstitial Ad placeholder for mobile
export const AdMobInterstitial = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  // In production, this would trigger an interstitial ad
  //console.log('AdMob Interstitial would show here');
  return null;
};

// Rewarded Ad placeholder for mobile
export const AdMobRewarded = ({ onReward }) => {
  if (Platform.OS === 'web') {
    return null;
  }

  // In production, this would show a rewarded video ad
  const showRewardedAd = () => {
    //console.log('AdMob Rewarded Ad would show here');
    // Simulate reward after watching ad
    setTimeout(() => {
      if (onReward) {
        onReward({ type: 'extra_matches', amount: 1 });
      }
    }, 1000);
  };

  return (
    <View style={styles.rewardedAdContainer}>
      <Text style={styles.rewardedAdText}>Watch Ad for Extra Match</Text>
      <Text 
        style={styles.rewardedAdButton}
        onPress={showRewardedAd}
      >
        Watch Ad
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  adMobContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  adMobText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  adMobSubtext: {
    fontSize: 12,
    color: '#999',
  },
  rewardedAdContainer: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rewardedAdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  rewardedAdButton: {
    backgroundColor: '#fff',
    color: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AdSense;
