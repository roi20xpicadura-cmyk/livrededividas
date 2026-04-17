import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Users, MessageCircle, DollarSign, Bell, Settings, ArrowLeft, Sun, Moon } from "lucide-react";
import { AdminThemeProvider, useAdminTheme } from "./AdminThemeContext";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: MessageCircle, label: "WhatsApp", path: "/admin/whatsapp" },
  { icon: DollarSign, label: "Receita", path: "/admin/revenue" },
  { icon: Bell, label: "Notificações", path: "/admin/notifications" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

const PALETTES = {
  dark: {
    bg: "#08080F",
    sidebar: "#110820",
    border: "rgba(167,139,250,0.1)",
    text: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.4)",
    navInactive: "rgba(255,255,255,0.5)",
    iconBg: "rgba(124,58,237,0.15)",
  },
  light: {
    bg: "#F7F5FB",
    sidebar: "#FFFFFF",
    border: "rgba(124,58,237,0.12)",
    text: "#0F0820",
    textMuted: "rgba(15,8,32,0.55)",
    navInactive: "rgba(15,8,32,0.6)",
    iconBg: "rgba(124,58,237,0.1)",
  },
} as const;

function Shell() {
  const { theme, toggle } = useAdminTheme();
  const p = PALETTES[theme];

  return (
    <div
      className={`admin-shell admin-${theme} min-h-screen flex`}
      style={{ background: p.bg, color: p.text }}
    >
      <aside
        className="w-60 shrink-0 flex flex-col"
        style={{ background: p.sidebar, borderRight: `1px solid ${p.border}` }}
      >
        <div className="p-5" style={{ borderBottom: `1px solid ${p.border}` }}>
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: p.iconBg }}
            >
              🐨
            </div>
            <div>
              <div className="text-sm font-bold leading-tight" style={{ color: p.text }}>
                KoraFinance
              </div>
              <div className="text-[11px]" style={{ color: p.textMuted }}>
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: "none",
                  background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                  color: isActive ? "#A78BFA" : p.navInactive,
                  border: isActive ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
                  transition: "all 0.15s",
                })}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 space-y-1" style={{ borderTop: `1px solid ${p.border}` }}>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: p.textMuted, background: "transparent", border: "none", cursor: "pointer" }}
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <Link
            to="/app"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: p.textMuted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      <main
        className="flex-1 overflow-y-auto p-6 lg:p-8"
        style={{ background: p.bg, color: p.text }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <Shell />
    </AdminThemeProvider>
  );
}
