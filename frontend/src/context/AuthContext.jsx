import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser && storedToken !== "undefined") {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    const payload = res.data?.data || res.data;
    const authToken = payload.token;
    const authUser = payload.user;

    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const register = async (username, password, name = "", role = "operator") => {
    const res = await api.post("/auth/register", { username, password, name, role });
    const payload = res.data?.data || res.data;
    const authToken = payload.token;
    const authUser = payload.user;

    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const isOperator = user?.role === "operator";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        isAdmin,
        isOperator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
