import { useLocation } from 'wouter';
import { quickActionItems } from '@/navigation';

export function QuickActions() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex justify-between gap-2">
      {quickActionItems.map((action, i) => (
        <button 
          key={i} 
          onClick={() => setLocation(action.path)} 
          className="flex flex-col items-center gap-1.5 flex-1 group"
        >
          <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center group-hover:border-foreground/20 group-hover:bg-muted/50 transition-all duration-200">
            <action.icon size={18} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
