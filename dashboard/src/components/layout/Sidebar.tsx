import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Terminal, LifeBuoy, Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', desc: 'Status at a glance' },
  { to: '/tracking', icon: Map, label: 'Tracking', desc: 'GPS + trail' },
  { to: '/logs', icon: Terminal, label: 'WiFi Logs', desc: 'ESP32 feed' },
];

export function Sidebar() {
  const { connection } = useRover();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[232px] bg-white border-r border-slate-200 z-40 hidden lg:flex flex-col">
      <div className="h-[76px] flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[16px] font-extrabold text-slate-900 block leading-none tracking-tight">RESQ Rover</span>
            <span className="text-[12px] text-slate-400 mt-1 block">Emergency unit R1</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2">Monitor</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200',
              isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>
              <span className="block text-[14px] font-semibold leading-none">{item.label}</span>
              <span className="block text-[12px] opacity-70 mt-1">{item.desc}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-5 border-t border-slate-100">
        <div className={cn(
          "mqtt-pill w-full justify-center !py-2.5",
          connection === 'live' && "connected",
          connection === 'simulated' && "disconnected",
          connection === 'connecting' && "connecting",
          connection === 'error' && "error",
        )}>
          {connection === 'live' && <><Wifi className="w-4 h-4" /> ESP32 Live</>}
          {connection === 'simulated' && <><WifiOff className="w-4 h-4" /> Simulated</>}
          {connection === 'connecting' && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting</>}
          {connection === 'error' && <><AlertTriangle className="w-4 h-4" /> Link Error</>}
        </div>
        <div className="text-[12px] text-slate-400 text-center mt-3">Test yard 24 �- 16 m</div>
      </div>
    </aside>
  );
}



