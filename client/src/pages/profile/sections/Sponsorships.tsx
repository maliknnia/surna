import { DollarSign, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SponsorshipsProps {
  sponsors: any[];
}

export default function Sponsorships({ sponsors }: SponsorshipsProps) {
  const { toast } = useToast();

  const handleContactSponsor = (sponsor: any) => {
    toast({ title: "Contact Sponsor", description: `Contacting ${sponsor.name}...` });
  };

  const handleAddSponsor = () => {
    toast({ title: "Add Sponsor", description: "Opening sponsorship form..." });
  };

  if (!sponsors || sponsors.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-token-text-muted mx-auto mb-4" />
        <p className="text-token-text-secondary mb-4">No sponsors yet</p>
        <Button onClick={handleAddSponsor} className="bg-gradient-to-r from-token-accent to-token-accent">
          <DollarSign size={18} />
          Become a Sponsor
        </Button>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'border-yellow-500 bg-yellow-500/10';
      case 'silver': return 'border-gray-400 bg-gray-400/10';
      case 'bronze': return 'border-orange-700 bg-orange-700/10';
      default: return 'border-border bg-transparent';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-token-text">Current Sponsors</h2>
        <Button onClick={handleAddSponsor} variant="outline">
          <DollarSign size={18} />
          Add New Sponsor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sponsors.map((sponsor: any) => (
          <div
            key={sponsor.id}
            className={`p-6 border rounded-xl ${getTierColor(sponsor.tier)} hover:scale-105 transition-transform`}
          >
            <div className="text-center mb-4">
              {sponsor.logo ? (
                <img src={sponsor.logo} alt={sponsor.name} className="w-full h-24 object-contain mb-4" />
              ) : (
                <div className="w-full h-24 flex items-center justify-center mb-4">
                  <Award size={48} className="text-token-text-muted" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-token-text mb-1">{sponsor.name}</h3>
              <p className="text-xs text-token-text-muted capitalize mb-3">{sponsor.tier} Tier</p>
              {sponsor.amount && (
                <div className="text-2xl font-bold text-token-accent mb-4">
                  ${sponsor.amount.toLocaleString()}
                </div>
              )}
            </div>
            <Button
              onClick={() => handleContactSponsor(sponsor)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Contact Sponsor
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
