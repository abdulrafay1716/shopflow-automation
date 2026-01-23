import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded admin credentials
const ADMIN_USERNAME = 'cherrys';
const ADMIN_PASSWORD = 'controlpanel';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Check if already logged in from session
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [loading, setLoading] = useState(false);

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Check hardcoded credentials
      if (username.toLowerCase() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        setIsAdmin(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        return { error: null };
      } else {
        return { error: new Error('Invalid username or password') };
      }
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setIsAdmin(false);
    sessionStorage.removeItem('admin_authenticated');
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
