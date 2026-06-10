import { ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { ROUTES } from '@/navigation';

interface PerformanceCardProps {
  distance: number;
  level: number;
  points: number;
  progress: number;
}

export function PerformanceCard({ distance, level, points, progress }: PerformanceCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div 
      className="rounded-lg p-4 cursor-pointer group transition-all duration-200"
      style={{ background: 'var(--surna-surface)' }}
      onClick={() => setLocation(ROUTES.performance)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--surna-text-secondary)' }}>Level {level}</span>
        <div className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--surna-text-secondary)' }}>
          <span>+{points.toLocaleString()} pts</span>
          <ChevronRight size={14} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
      
      <div className="text-4xl font-black tracking-tight" style={{ color: 'var(--surna-text)' }}>
        {distance}
        <span className="text-lg font-normal ml-1" style={{ color: 'var(--surna-text-muted)' }}>mi</span>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium" style={{ color: 'var(--surna-text-muted)' }}>Today's Activity</span>
          <span className="font-bold" style={{ color: 'var(--surna-text)' }}>{progress}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surna-text-muted)' }}>
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ background: 'var(--surna-text)', width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
