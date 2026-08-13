import { useState, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {AuthModal} from '../components/Navbar';

/* ─── Auth Gate Context ──────────────────────────────────────────────────── */
interface AuthGateContextType {
  openAuthModal: () => void;
}

const AuthGateContext = createContext<AuthGateContextType>({
  openAuthModal: () => {},
});

export const useAuthGate = () => useContext(AuthGateContext);

/* ─── Provider: wraps the whole app ─────────────────────────────────────── */
export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = () => { setAuthMode('signin'); setAuthOpen(true); };

  return (
    <AuthGateContext.Provider value={{ openAuthModal }}>
      {children}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={authMode}
        onToggleMode={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}
        onSuccess={() => setAuthOpen(false)}
      />
    </AuthGateContext.Provider>
  );
}
