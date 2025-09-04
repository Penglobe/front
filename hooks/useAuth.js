// 로그인 상태
// hooks/useAuth.js
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getAccessToken,
  me,
  logout as coreLogout,
} from "@services/authService";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const refreshUser = useCallback(async () => {
    const at = await getAccessToken();
    if (!at) return setUser(null);
    try {
      const profile = await me();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    await coreLogout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{ user, isAuthenticated: !!user, refreshUser, logout }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
