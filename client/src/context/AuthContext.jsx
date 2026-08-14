import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'dental_clinic_token';
const USER_KEY = 'dental_clinic_user';

// Where each role lands after login — mirrors PRD section 5.
export const ROLE_HOME = {
  admin: '/admin',
  receptionist: '/reception',
  doctor: '/doctor',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [initialError, setInitialError] = useState(null);

  const fetchInitialClinicData = useCallback(async (userRole) => {
    try {
      setInitialError(null);
      setInitialLoading(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out while loading clinic data.')), 10000)
      );

      const fetchPromise = (async () => {
        if (userRole === 'admin') {
          await Promise.all([
            api.get('/auth/me').catch(() => null),
            api.get('/patients?limit=10').catch(() => null),
          ]);
        } else if (userRole === 'receptionist') {
          await Promise.all([
            api.get('/auth/me').catch(() => null),
            api.get('/queue/today').catch(() => null),
            api.get('/appointments?dateFilterPreset=today').catch(() => null),
          ]);
        } else if (userRole === 'doctor') {
          await Promise.all([
            api.get('/auth/me').catch(() => null),
            api.get('/queue/today').catch(() => null),
            api.get('/patients?limit=10').catch(() => null),
          ]);
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.error('Failed initial clinic data fetch:', err);
      setInitialError(err.message || "Couldn't load your dashboard. Please retry.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // On mount, restore the session from localStorage and confirm it's valid
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken || !storedUser) {
      setLoading(false);
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    api
      .get('/auth/me')
      .then(async ({ data }) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        await fetchInitialClinicData(data.user.role);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setLoading(false));
  }, [fetchInitialClinicData]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    await fetchInitialClinicData(data.user.role);
    return data.user;
  }, [fetchInitialClinicData]);

  const signup = useCallback(async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    await fetchInitialClinicData(data.user.role);
    return data.user;
  }, [fetchInitialClinicData]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setInitialError(null);
  }, []);

  const retryInitialLoad = useCallback(async () => {
    if (user && user.role) {
      await fetchInitialClinicData(user.role);
    }
  }, [user, fetchInitialClinicData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialLoading,
        initialError,
        login,
        signup,
        logout,
        retryInitialLoad,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
