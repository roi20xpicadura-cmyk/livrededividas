import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AdminTheme = "dark" | "light";
const KEY = "admin-theme";

interface Ctx {
  theme: AdminTheme;
  toggle: () => void;
  setTheme: (t: AdminTheme) => void;
}

const AdminThemeContext = createContext<Ctx>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

export const useAdminTheme = () => useContext(AdminThemeContext);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as AdminTheme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const setTheme = (t: AdminTheme) => setThemeState(t);
  const toggle = () => setThemeState((p) => (p === "dark" ? "light" : "dark"));

  return (
    <AdminThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}
