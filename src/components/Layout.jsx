import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAFF = ['admin', 'doctor', 'nurse', 'receptionist'];

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: STAFF },
  { to: '/opd', label: 'OPD Queue', icon: '🩺', roles: STAFF },
  { to: '/appointments', label: 'Appointments', icon: '🗓️', roles: [...STAFF, 'patient'] },
  { to: '/patients', label: 'Patients', icon: '🧑‍⚕️', roles: STAFF },
  { to: '/wards', label: 'Wards & Beds', icon: '🏥', roles: STAFF },
  { to: '/admissions', label: 'Admissions', icon: '🛏️', roles: STAFF },
  { to: '/doctors', label: 'Doctors', icon: '👨‍⚕️', roles: ['admin'] },
  { to: '/nurses', label: 'Nurses', icon: '👩‍⚕️', roles: ['admin'] },
  { to: '/pharmacy', label: 'Pharmacy', icon: '💊', roles: STAFF },
  { to: '/labs', label: 'Laboratory', icon: '🧪', roles: STAFF },
  { to: '/billing', label: 'Billing', icon: '🧾', roles: STAFF },
  { to: '/records', label: 'EMR Records', icon: '📁', roles: STAFF },
  { to: '/my-health', label: 'My Health', icon: '❤️', roles: ['patient'] },
  { to: '/users', label: 'User Accounts', icon: '👥', roles: ['admin'] },
];

const ROLE_LABEL = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  patient: 'Patient',
};
const ROLE_COLOR = {
  admin: 'bg-violet-100 text-violet-700',
  doctor: 'bg-blue-100 text-blue-700',
  nurse: 'bg-brand-100 text-brand-700',
  receptionist: 'bg-amber-100 text-amber-700',
  patient: 'bg-emerald-100 text-emerald-700',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = NAV.filter((n) => n.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
            <line x1="16" y1="8" x2="2" y2="22"></line>
            <line x1="17.5" y1="15" x2="9" y2="15"></line>
          </svg>
        </div>
        <div>
          <div className="text-lg font-bold text-white">MediCare</div>
          <div className="text-xs text-slate-400">Hospital Management</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-700 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <div className="text-xs text-slate-400">{ROLE_LABEL[user?.role]}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-slate-900 lg:block">{Sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900">{Sidebar}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:justify-end">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLOR[user?.role] || 'bg-slate-100 text-slate-700'}`}>
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
