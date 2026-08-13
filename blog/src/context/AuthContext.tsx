import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { login as loginRequest, register as registerRequest } from '../data/api';
import { useMe, queryKeys } from '../hooks/queries';

interface AuthContextType {
  user: any | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // The authenticated user is cached under queryKeys.me for the whole app
  // lifecycle; it only fetches once per token (infinite cache defaults).
  const { data, isLoading, isError } = useMe(!!token);
  const user = data?.user ?? null;

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.removeQueries({ queryKey: queryKeys.me });
  };

  // A token that the server rejects (401 → query error) is stale — clear it.
  useEffect(() => {
    if (isError) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const login = async (payload: any) => {
    const { token: newToken, user: loggedInUser } = await loginRequest(payload);
    localStorage.setItem('token', newToken);
    queryClient.setQueryData(queryKeys.me, { user: loggedInUser });
    setToken(newToken);
  };

  const register = async (payload: any) => {
    const { token: newToken, user: newUser } = await registerRequest(payload);
    localStorage.setItem('token', newToken);
    queryClient.setQueryData(queryKeys.me, { user: newUser });
    setToken(newToken);
  };

  const loginWithToken = (newToken: string) => {
    localStorage.setItem('token', newToken);
    // No user in hand (OAuth redirect) — invalidate so useMe refetches it.
    queryClient.invalidateQueries({ queryKey: queryKeys.me });
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!user,
      login,
      register,
      loginWithToken,
      logout,
      // Only "loading" when we have a token and are resolving the user.
      isLoading: !!token && isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
