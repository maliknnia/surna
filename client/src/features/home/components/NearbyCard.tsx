import { useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/navigation';

interface NearbyCardProps {
  name: string;
  distance: string;
  status: string;
  emoji: string;
}

export function NearbyCard({ name, distance, status, emoji }: NearbyCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div 
      className="rounded-lg p-4 cursor-pointer group transition-all duration-200" 
      style={{ background: 'var(--surna-surface)' }}
      onClick={() => setLocation(ROUTES.places)}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'var(--surna-elevated)' }}>
          <span className="text-2xl">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm surna-truncate" style={{ color: 'var(--surna-text)' }}>{name} Opened Nearby</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--surna-text-muted)' }}>{distance} · <span style={{ color: 'var(--surna-text)' }}>{status}</span></p>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-all" style={{ color: 'var(--surna-text-muted)' }} />
      </div>
    </div>
  );
}
