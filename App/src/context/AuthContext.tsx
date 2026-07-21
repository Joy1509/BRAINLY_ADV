import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userID: string, username: string, role?: string, avatar?: string) => void;
  logout: () => void;
  isAdmin: boolean;
  updateAvatar: (avatar: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const initUser = (): User | null => {
  const token = localStorage.getItem('token');
  const userID = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  if (!token || !userID || !username) return null;
  return {
    id: userID,
    username,
    role: (localStorage.getItem('role') || 'user') as 'user' | 'admin',
    avatar: localStorage.getItem('avatar') || ''
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(initUser);

  const login = (token: string, userID: string, username: string, role: string = 'user', avatar?: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userID);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    // Only update avatar in localStorage if explicitly provided
    if (avatar !== undefined) localStorage.setItem('avatar', avatar);
    
    const resolvedAvatar = avatar !== undefined ? avatar : (localStorage.getItem('avatar') || '');
    setUser({
      id: userID,
      username,
      role: role as 'user' | 'admin',
      avatar: resolvedAvatar
    });
  };

  const updateAvatar = (avatar: string) => {
    localStorage.setItem('avatar', avatar);
    setUser(prev => prev ? { ...prev, avatar } : prev);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('avatar');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    updateAvatar
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};