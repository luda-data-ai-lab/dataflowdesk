import { NavLink } from 'react-router-dom';

import { logoSrc } from '../../api/branding';
import { APP_NAME, useBranding } from '../../contexts/BrandingContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

// Dashboard / 이력 / 사용자 are placeholders until Phase 2 & 3.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: 'DB', disabled: true },
  { to: '/interfaces', label: '인터페이스 목록', icon: 'IF' },
  { to: '/systems', label: '시스템 관리', icon: 'SY' },
  { to: '/topology', label: '구성도', icon: 'TP' },
  { to: '/history', label: '변경 이력', icon: 'HX', disabled: true },
  { to: '/users', label: '사용자 관리', icon: 'US', disabled: true },
  { to: '/settings', label: '설정', icon: 'ST' },
];

export function Sidebar() {
  const { branding } = useBranding();
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
        {NAV_ITEMS.map((item) =>
          item.disabled ? (
            <div
              key={item.to}
              title="다음 단계에서 제공됩니다"
              className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-white/40"
            >
              <span className="w-6 text-[10px] font-bold tracking-wider">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ) : (
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
          ),
        )}
      </nav>
      <div className="px-5 py-3 text-[11px] text-white/40">Phase 1 · Foundation</div>
    </aside>
  );
}
