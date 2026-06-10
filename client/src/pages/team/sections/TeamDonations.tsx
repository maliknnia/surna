import { DollarSign, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamDonationsProps {
  team: any;
}

export default function TeamDonations({ team }: TeamDonationsProps) {
  const { toast } = useToast();

  const handleDonate = (amount: number) => {
    toast({
      title: "Payment Modal",
      description: `Opening payment flow for €${amount} donation...`,
    });
  };

  const presetAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <div className="space-y-4">
      <div className="glass-card text-center">
        <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: '#FF6B6B' }} />
        <h2 className="text-xl font-bold text-foreground mb-1">Support {team.name}</h2>
        <p className="text-[14px] text-muted-foreground">Help us continue competing and growing</p>
      </div>

      <div className="glass-card">
        <h3 className="text-[16px] font-bold text-foreground mb-4">Choose an amount</h3>
        <div className="grid grid-cols-3 gap-3">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleDonate(amount)}
              className="h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-1 bg-muted/40 text-foreground border border-border hover:bg-muted/40 active:scale-[0.96] transition-all"
            >
              <DollarSign size={16} />
              {amount}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleDonate(0)}
          className="w-full mt-3 h-12 rounded-full text-[14px] font-bold bg-muted/40 text-foreground hover:bg-muted/40 active:scale-[0.97] transition-all"
        >
          Custom Amount
        </button>
      </div>

      <div className="glass-card">
        <h4 className="text-[15px] font-bold text-foreground mb-3">Your donation helps with:</h4>
        <ul className="space-y-2.5">
          {[
            'Equipment and gear for team members',
            'Travel expenses for tournaments',
            'Facility rentals and practice sessions',
            'Team training and development programs',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
