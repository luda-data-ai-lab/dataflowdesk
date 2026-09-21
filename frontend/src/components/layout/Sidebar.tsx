import { NavLink, useNavigate } from 'react-router-dom';

import { logoSrc } from '../../api/branding';
import { useAuth } from '../../contexts/AuthContext';
import { APP_NAME, useBranding } from '../../contexts/BrandingContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: 'DB' },
  { to: '/interfaces', label: '인터페이스 목록', icon: 'IF' },
  { to: '/systems', label: '시스템 관리', icon: 'SY' },
  { to: '/topology', label: '구성도', icon: 'TP' },
  { to: '/history', label: '변경 이력', icon: 'HX' },
  { to: '/users', label: '사용자 관리', icon: 'US', adminOnly: true },
  { to: '/settings', label: '설정', icon: 'ST' },
];

export function Sidebar() {
  const { branding } = useBranding();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const logo = branding ? logoSrc(branding) : null;
  const title = branding?.company_name || APP_NAME;
  const subtitle =
    branding?.tagline || (branding?.company_name ? APP_NAME : 'NeoSlon MES/ERP 연동 관리');
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-brand-700 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        {logo && (
          <img
            src={logo}
            alt={title}
            className="mb-2 max-h-14 w-full rounded bg-white/95 object-contain p-1.5"
          />
        )}
        <div className="text-lg font-bold tracking-tight">{title}</div>
        <div className="text-xs text-white/60">{subtitle}</div>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                isActive ? 'bg-white/15 font-semibold' : 'text-white/80 hover:bg-white/10'
              }`
            }
          >
            <span className="w-6 text-[10px] font-bold tracking-wider">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t border-white/10 px-5 py-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold">{user.display_name || user.username}</div>
              <div className="text-white/50">
                {user.username} · {user.role}
              </div>
            </div>
            <button
              type="button"
              className="rounded px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
