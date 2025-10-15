import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const VerificationContext = createContext();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';

export function VerificationProvider({ children }) {
  const { token, user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    if (token && user) {
      checkVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [token, user]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/verification/status`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.status);
        setVerificationRequired(data.required);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Failed to check verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending';
  const isRejected = verificationStatus === 'rejected';
  const needsVerification = verificationRequired && !isVerified;

  return (
    <VerificationContext.Provider 
      value={{ 
        verificationStatus,
        verificationRequired,
        isVerified,
        isPending,
        isRejected,
        needsVerification,
        loading,
        lastChecked,
        checkVerificationStatus,
        refreshStatus: checkVerificationStatus
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
}

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within VerificationProvider');
  }
  return context;
};
