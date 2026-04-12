import React, { createContext, useContext, useState } from 'react';
import api from '../utils/api';
const Ctx = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('rl_user')); } catch { return null; } });
  const [loading, setLoading] = useState(false);
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('rl_token', data.token);
      localStorage.setItem('rl_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally { setLoading(false); }
  };
  const logout = () => {
    localStorage.removeItem('rl_token');
    localStorage.removeItem('rl_user');
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
