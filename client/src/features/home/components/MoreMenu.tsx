import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MoreVertical } from 'lucide-react';
import { menuItems } from '@/navigation';

const useOnClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
};

export function MoreMenu() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setMenuOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setMenuOpen(!menuOpen)} 
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/40"
      >
        <MoreVertical size={18} style={{ color: 'var(--surna-text-secondary)' }} />
      </button>
      
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden z-50" style={{ background: 'var(--surna-elevated)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--surna-border)' }}>
          {menuItems.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => { setMenuOpen(false); setLocation(item.path); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
              >
                <item.icon size={16} style={{ color: 'var(--surna-text-secondary)' }} />
                <span className="text-sm" style={{ color: 'var(--surna-text)' }}>{item.label}</span>
              </button>
              {item.divider && <div className="h-px mx-3" style={{ background: 'var(--surna-border)' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
