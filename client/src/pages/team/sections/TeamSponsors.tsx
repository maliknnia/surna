import { Award } from 'lucide-react';

interface TeamSponsorsProps {
  sponsors: any[];
}

export default function TeamSponsors({ sponsors }: TeamSponsorsProps) {
  if (!sponsors || sponsors.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-token-text-muted mx-auto mb-4" />
        <p className="text-token-text-secondary">No sponsors yet</p>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {sponsors.map((sponsor: any) => (
        <div
          key={sponsor.id}
          className={`p-6 border rounded-xl ${getTierColor(sponsor.tier)} hover:scale-105 transition-transform cursor-pointer`}
          onClick={() => sponsor.link && window.open(sponsor.link, '_blank')}
        >
          {sponsor.logo ? (
            <img src={sponsor.logo} alt={sponsor.name} className="w-full h-24 object-contain mb-4" />
          ) : (
            <div className="w-full h-24 flex items-center justify-center mb-4">
              <Award size={48} className="text-token-text-muted" />
            </div>
          )}
          <h4 className="text-center text-token-text font-medium">{sponsor.name}</h4>
          <p className="text-center text-xs text-token-text-muted mt-1 capitalize">{sponsor.tier} Tier</p>
        </div>
      ))}
    </div>
  );
}
