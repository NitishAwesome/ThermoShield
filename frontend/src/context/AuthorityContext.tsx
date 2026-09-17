import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export interface AuthorityScope {
  id: string;
  name: string;
  type: string;
}

export interface AuthorityUserContext {
  userId: number;
  name: string;
  email: string;
  portalType: 'AUTHORITY';
  role: string;
  organization: string | null;
  department: string | null;
  designation: string | null;
  officialId: string | null;
  jurisdictionId: string;
  jurisdictionName: string;
  jurisdictionType: string;
  parentId: string | null;
  permissions: string[];
  accountStatus: string;
  subordinateJurisdictionIds: string[];
  canActivateHap: boolean;
  isNational: boolean;
  isState: boolean;
  isMunicipal: boolean;
}

export interface AuthorityContextType {
  authority: AuthorityUserContext | null;
  isLoading: boolean;
  error: string | null;
  operationalScope: AuthorityScope;
  viewingScope: AuthorityScope;
  isReadOnly: boolean;
  setViewingScope: (scope: AuthorityScope) => void;
  resetToOperationalScope: () => void;
  canActInScope: (targetJurisdictionId: string) => boolean;
  refreshAuthority: () => Promise<void>;
}

const DEFAULT_SCOPE: AuthorityScope = {
  id: 'IN',
  name: 'India (National)',
  type: 'COUNTRY',
};

const AuthorityContext = createContext<AuthorityContextType | undefined>(undefined);

export const AuthorityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [authority, setAuthority] = useState<AuthorityUserContext | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Operational Scope: Assigned permanently to account. Never mutated by map inspection!
  const [operationalScope, setOperationalScope] = useState<AuthorityScope>(DEFAULT_SCOPE);

  // Viewing Scope: What is currently being inspected in map/dashboard (defaults to operationalScope)
  const [viewingScope, setViewingScopeState] = useState<AuthorityScope>(DEFAULT_SCOPE);

  const fetchAuthorityContext = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getJurisdictionUserContext();
      const authCtx: AuthorityUserContext = {
        userId: data.user_id,
        name: data.name,
        email: data.email || user?.email || '',
        portalType: 'AUTHORITY',
        role: data.role,
        organization: data.organization || null,
        department: data.department || null,
        designation: data.designation || null,
        officialId: data.official_id || null,
        jurisdictionId: data.jurisdiction_id,
        jurisdictionName: data.jurisdiction_name,
        jurisdictionType: data.jurisdiction_type,
        parentId: data.parent_id || null,
        permissions: data.permissions || [],
        accountStatus: data.account_status || 'APPROVED',
        subordinateJurisdictionIds: data.subordinate_jurisdiction_ids || [],
        canActivateHap: !!data.can_activate_hap,
        isNational: !!data.is_national,
        isState: !!data.is_state,
        isMunicipal: !!data.is_municipal,
      };

      setAuthority(authCtx);

      const opScope: AuthorityScope = {
        id: data.jurisdiction_id,
        name: data.jurisdiction_name,
        type: data.jurisdiction_type,
      };

      setOperationalScope(opScope);
      // Initialize viewingScope to operational scope on login/load
      setViewingScopeState(opScope);
    } catch (err: any) {
      console.warn('Could not load authority user context:', err);
      // Fallback from existing user object if network issue
      if (user && user.role && user.role !== 'user' && user.role !== 'citizen') {
        const jurisId = (user as any).jurisdiction_id || 'IN-MH-MCGM';
        const fallbackScope: AuthorityScope = {
          id: jurisId,
          name: jurisId === 'IN-MH-MCGM' ? 'Greater Mumbai' : jurisId,
          type: jurisId === 'IN-MH-MCGM' ? 'MUNICIPAL_CORPORATION' : 'COUNTRY',
        };
        setOperationalScope(fallbackScope);
        setViewingScopeState(fallbackScope);
      }
      setError(err?.response?.data?.detail || 'Failed to retrieve authority context.');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, user]);

  useEffect(() => {
    fetchAuthorityContext();
  }, [fetchAuthorityContext]);

  const setViewingScope = useCallback((scope: AuthorityScope) => {
    setViewingScopeState(scope);
  }, []);

  const resetToOperationalScope = useCallback(() => {
    setViewingScopeState(operationalScope);
  }, [operationalScope]);

  // Read-only calculation: if viewing scope is NOT operational scope and NOT inside subordinate jurisdictions
  const isReadOnly = useMemo(() => {
    if (!authority) return true;
    if (viewingScope.id === operationalScope.id) return false;
    // Subordinates are within authority scope (e.g. Ward F/S is inside Greater Mumbai)
    if (authority.subordinateJurisdictionIds.includes(viewingScope.id)) return false;
    return true;
  }, [authority, viewingScope.id, operationalScope.id]);

  const canActInScope = useCallback(
    (targetJurisdictionId: string) => {
      if (!authority || authority.accountStatus !== 'APPROVED') return false;
      if (targetJurisdictionId === operationalScope.id) return true;
      return authority.subordinateJurisdictionIds.includes(targetJurisdictionId);
    },
    [authority, operationalScope.id]
  );

  return (
    <AuthorityContext.Provider
      value={{
        authority,
        isLoading,
        error,
        operationalScope,
        viewingScope,
        isReadOnly,
        setViewingScope,
        resetToOperationalScope,
        canActInScope,
        refreshAuthority: fetchAuthorityContext,
      }}
    >
      {children}
    </AuthorityContext.Provider>
  );
};

export const useAuthority = (): AuthorityContextType => {
  const context = useContext(AuthorityContext);
  if (!context) {
    throw new Error('useAuthority must be used within an AuthorityProvider');
  }
  return context;
};
