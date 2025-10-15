import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useVerification } from '@/contexts/VerificationContext';

/**
 * Hook to require verification for a feature
 * Redirects to verification screen if not verified
 * 
 * @param {boolean} enabled - Whether to enforce verification (default: true)
 * @returns {object} - Verification status and helpers
 */
export function useRequireVerification(enabled = true) {
  const router = useRouter();
  const verification = useVerification();
  const { needsVerification, loading, isVerified } = verification;

  useEffect(() => {
    if (enabled && !loading && needsVerification) {
      // Redirect to verification screen
      router.push('/auth/verify-face');
    }
  }, [enabled, loading, needsVerification]);

  return {
    ...verification,
    canAccess: !needsVerification,
    shouldBlock: needsVerification && !loading,
  };
}
