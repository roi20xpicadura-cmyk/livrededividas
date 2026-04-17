import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Users, MessageCircle, DollarSign, Bell, Settings, ArrowLeft } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: MessageCircle, label: "WhatsApp", path: "/admin/whatsapp" },
  { icon: DollarSign, label: "Receita", path: "/admin/revenue" },
  { icon: Bell, label: "Notificações", path: "/admin/notifications" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export default function AdminLayout() {
  return (
    <div
      className="admin-shell min-h-screen flex"
      style={{ background: "#08080F", color: "#FFFFFF" }}
    >
      <aside
        className="w-60 shrink-0 flex flex-col"
        style={{
          background: "#110820",
          borderRight: "1px solid rgba(167,139,250,0.1)",
        }}
      >
        <div
          className="p-5"
          style={{ borderBottom: "1px solid rgba(167,139,250,0.1)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "rgba(124,58,237,0.15)" }}
            >
              🐨
            </div>
            <div>
              <div className="text-sm font-bold leading-tight" style={{ color: "#FFFFFF" }}>
                KoraFinance
              </div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                  color: isActive ? "#A78BFA" : "rgba(255,255,255,0.5)",
                  border: isActive
                    ? "1px solid rgba(124,58,237,0.2)"
                    : "1px solid transparent",
                  transition: "all 0.15s",
                })}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}
        >
          <Link
            to="/app"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      <main
        className="flex-1 overflow-y-auto p-6 lg:p-8"
        style={{ background: "#08080F", color: "#FFFFFF" }}
      >
        <Outlet />
      </main>
    </div>
  );
}
