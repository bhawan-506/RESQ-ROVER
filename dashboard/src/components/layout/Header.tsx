import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Map, Terminal, LifeBuoy, Wifi, WifiOff } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/tracking', icon: Map, label: 'Tracking' },
  { to: '/logs', icon: Terminal, label: 'WiFi Logs' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { connection } = useRover();

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <LifeBuoy className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-bold text-slate-900 tracking-tight">RESQ Rover</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("mqtt-pill text-[10px]", connection === 'live' ? "connected" : "disconnected")}>
            {connection === 'live' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connection === 'live' ? 'Live' : 'Sim'}
          </div>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="px-3 pb-3 space-y-1 border-t border-slate-100">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium', isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50')}>
              <item.icon className="w-[18px] h-[18px]" />{item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}



