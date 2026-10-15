import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const levelStyles: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  error: { icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
};

export function ActivityLog({ limit = 7 }: { limit?: number }) {
  const { logs } = useRover();

  return (
    <div className="panel p-5 sm:p-6 h-full">
      <div className="section-header">
        <div>
          <p className="section-title !text-[16px]">Recent activity</p>
          <p className="text-[13px] text-slate-400 mt-0.5">{logs.length} events tracked</p>
        </div>
      </div>
      <div className="space-y-1 max-h-[380px] overflow-y-auto">
        {logs.slice(0, limit).map((log) => {
          const lc = levelStyles[log.level] || levelStyles.info;
          const Icon = lc.icon;
          const ago = Math.floor((Date.now() - log.timestamp) / 1000);
          const t = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
          return (
            <div key={log.id} className="flex items-start gap-3.5 py-3 px-2 rounded-2xl hover:bg-slate-50">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", lc.bg)}>
                <Icon className={cn("w-4.5 h-4.5", lc.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-slate-800 leading-snug">{log.message}</p>
                <p className="text-[12px] text-slate-400 mt-1">{log.source} • {t}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



