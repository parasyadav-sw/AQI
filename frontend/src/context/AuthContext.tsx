import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'citizen' | 'government' | 'admin';
  language: string;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (token: string, userDetails: { name: string; email: string; role: string }) => Promise<void>;
  logout: () => void;
  updateLanguage: (lang: string) => void;
  isAuthenticated: boolean;
  role: 'citizen' | 'government' | 'admin' | null;
  isCitizen: boolean;
  isGovernment: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setUser(data);
      } else {
        // Token invalid/expired
        logout();
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (accessToken: string, userDetails: { name: string; email: string; role: string }) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setLoading(true);
    await fetchProfile(accessToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const updateLanguage = async (lang: string) => {
    if (user && token) {
      // Optimistic update
      setUser(prev => prev ? { ...prev, language: lang } : null);
      
      // Update in DB (optional for now, mock backend update or fetch)
      try {
        await fetch('http://localhost:8000/api/v1/auth/me', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language: lang })
        });
      } catch (err) {
        console.error("Failed to update language on backend:", err);
      }
    }
  };

  const isCitizen = user?.role === 'citizen';
  const isGovernment = user?.role === 'government';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      token,
      user,
      login,
      logout,
      updateLanguage,
      isAuthenticated: !!token && !!user,
      role: user?.role || null,
      isCitizen,
      isGovernment,
      isAdmin,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
