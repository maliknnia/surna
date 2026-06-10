import { useLocation } from 'wouter';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { ROUTES } from '@/navigation';

interface UpcomingEventProps {
  title: string;
  time: string;
  location: string;
}

export function UpcomingEvent({ title, time, location }: UpcomingEventProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div>
      <div 
        className="rounded-lg p-4 cursor-pointer group transition-all duration-200"
        style={{ background: 'var(--surna-surface)' }}
        onClick={() => setLocation(ROUTES.events)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'var(--surna-elevated)' }}>
            <Calendar size={20} strokeWidth={1.5} style={{ color: 'var(--surna-text)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm" style={{ color: 'var(--surna-text)' }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--surna-text-secondary)' }}>{time}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} strokeWidth={1.5} style={{ color: 'var(--surna-text-muted)' }} />
              <p className="text-[11px]" style={{ color: 'var(--surna-text-muted)' }}>{location}</p>
            </div>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-all" style={{ color: 'var(--surna-text-muted)' }} />
        </div>
      </div>
    </div>
  );
}
