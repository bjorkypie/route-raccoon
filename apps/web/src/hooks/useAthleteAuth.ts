import { useCallback, useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

interface AuthStatus { authenticated: boolean; expiresAt?: number }
interface UseAthleteAuthOptions { validateServer?: boolean }

export function useAthleteAuth(opts: UseAthleteAuthOptions = {}) {
  const { validateServer = true } = opts;
  const [athleteId, setAthleteId] = useState<string | null>(() => (
    typeof window !== 'undefined' ? localStorage.getItem('athleteId') : null
  ));
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const e = localStorage.getItem('expiresAt');
    const n = e ? Number(e) : NaN; return !isNaN(n) ? n : null;
  });
  const [checking, setChecking] = useState(false);
  const fetchedRef = useRef(false);

  const clearAuth = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('athleteId');
      localStorage.removeItem('expiresAt');
    }
    setAthleteId(null); setExpiresAt(null);
  }, []);

  const login = useCallback(() => { window.location.href = `${API}/api/auth/login`; }, []);

  // Expiry check
  useEffect(() => {
    if (athleteId && expiresAt && Date.now() >= expiresAt * 1000) clearAuth();
  }, [athleteId, expiresAt, clearAuth]);

  // Server validation
  useEffect(() => {
    if (!validateServer || !athleteId) return; if (fetchedRef.current) return; fetchedRef.current = true;
    setChecking(true);
    fetch(`${API}/api/auth/status?athleteId=${encodeURIComponent(athleteId)}`)
      .then(r => r.json())
      .then((d: AuthStatus) => {
        if (!d?.authenticated) { clearAuth(); }
        else if (typeof d.expiresAt === 'number') {
          setExpiresAt(d.expiresAt);
          if (typeof window !== 'undefined') localStorage.setItem('expiresAt', String(d.expiresAt));
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [athleteId, validateServer, clearAuth]);

  // Storage sync
  useEffect(() => {
    const handler = () => {
      if (typeof window === 'undefined') return;
      const a = localStorage.getItem('athleteId');
      const e = localStorage.getItem('expiresAt');
      setAthleteId(a);
      setExpiresAt(e ? Number(e) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const authenticated = !!athleteId && !!expiresAt && Date.now() < expiresAt * 1000;
  return { athleteId, expiresAt, authenticated, checking, login, clearAuth };
}
