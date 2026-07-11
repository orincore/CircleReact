import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import PermissionDisclosureModal from '@/components/PermissionDisclosureModal';
import { PERMISSION_DISCLOSURES } from '@/constants/permissionDisclosures';
import { registerDisclosureRequester } from '@/utils/permissionGate';

const PermissionDisclosureContext = createContext(null);

/**
 * Mounted once at the app root. Renders a single shared
 * PermissionDisclosureModal and exposes requestDisclosure(type), which
 * resolves true/false based on the user's Allow/Not Now choice. Also
 * registers itself with utils/permissionGate.js so non-component modules
 * (services, upload utilities) can trigger the same modal imperatively.
 */
export function PermissionDisclosureProvider({ children }) {
  const [pending, setPending] = useState(null); // { type, resolve }

  const requestDisclosure = useCallback((type) => {
    return new Promise((resolve) => {
      setPending({ type, resolve });
    });
  }, []);

  useEffect(() => {
    registerDisclosureRequester(requestDisclosure);
    return () => registerDisclosureRequester(null);
  }, [requestDisclosure]);

  const settle = (value) => {
    pending?.resolve(value);
    setPending(null);
  };

  const config = pending ? PERMISSION_DISCLOSURES[pending.type] : null;

  return (
    <PermissionDisclosureContext.Provider value={{ requestDisclosure }}>
      {children}
      <PermissionDisclosureModal
        visible={!!config}
        config={config}
        onAllow={() => settle(true)}
        onDeny={() => settle(false)}
      />
    </PermissionDisclosureContext.Provider>
  );
}

export function usePermissionDisclosure() {
  const ctx = useContext(PermissionDisclosureContext);
  if (!ctx) {
    throw new Error('usePermissionDisclosure must be used within a PermissionDisclosureProvider');
  }
  return ctx;
}
