import { useState, useCallback } from 'react';
import { getSportConfig } from '@/components/TeamCard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft, Check, ChevronRight, MapPin, Users, Share2,
  Link2, Search, ShoppingBag, Megaphone, Award, Rocket,
  Sparkles, Trophy, X
} from 'lucide-react';

interface TeamBuilderProps {
  onSuccess?: (team: any) => void;
  onCancel?: () => void;
}

interface KitData {
  sport: string | null;
  teamName: string;
  description: string;
  skillLevel: string;
  venue: string | null;
  isPrivate: boolean;
  players: string[];
  gear: { name: string; price: number }[];
  boosts: string[];
}

const sports = [
  { name: 'Boxing', emoji: '🥊' },
  { name: 'MMA', emoji: '🥋' },
  { name: 'Basketball', emoji: '🏀' },
  { name: 'Soccer', emoji: '⚽' },
  { name: 'Baseball', emoji: '⚾' },
  { name: 'Volleyball', emoji: '🏐' },
  { name: 'Tennis', emoji: '🎾' },
  { name: 'Swimming', emoji: '🏊' },
  { name: 'Football', emoji: '🏈' },
  { name: 'Hockey', emoji: '🏒' },
  { name: 'Running', emoji: '🏃' },
  { name: 'Cycling', emoji: '🚴' },
  { name: 'Golf', emoji: '⛳' },
  { name: 'Rugby', emoji: '🏉' },
  { name: 'Cricket', emoji: '🏏' },
  { name: 'Wrestling', emoji: '🤼' },
  { name: 'Fitness', emoji: '💪' },
  { name: 'CrossFit', emoji: '🏋️' },
  { name: 'Yoga', emoji: '🧘' },
];

const skillLevels = [
  { level: 'Beginner', desc: 'Just starting out', icon: '🌱' },
  { level: 'Intermediate', desc: 'Some experience', icon: '⚡' },
  { level: 'Advanced', desc: 'Very experienced', icon: '🔥' },
  { level: 'Professional', desc: 'Competitive level', icon: '💎' },
];

const STEPS = ['sport', 'venue', 'players', 'gear', 'boost', 'launch'] as const;
type Step = typeof STEPS[number];

function calculatePoints(kit: KitData): number {
  let pts = 500;
  if (kit.venue) pts += 100;
  if (kit.players.length >= 5) pts += 200;
  pts += kit.gear.length * 50;
  if (kit.boosts.length > 0) pts += 150;
  return pts;
}

export default function TeamBuilder({ onSuccess, onCancel }: TeamBuilderProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const [kit, setKit] = useState<KitData>({
    sport: null,
    teamName: '',
    description: '',
    skillLevel: '',
    venue: null,
    isPrivate: false,
    players: [],
    gear: [],
    boosts: [],
  });

  const step = STEPS[currentStep];
  const config = getSportConfig(kit.sport);
  const accentColor = config.ringColor;
  const [topColor] = config.colors;

  const canLaunch = kit.sport && kit.teamName.trim().length > 0;

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  }, [currentStep]);

  const skip = useCallback(() => {
    next();
  }, [next]);

  const handleLaunch = async () => {
    if (!canLaunch) return;
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/teams', {
        name: kit.teamName,
        description: kit.description || `A ${kit.sport} team`,
        sport: kit.sport,
        isPublic: !kit.isPrivate,
        location: kit.venue,
        city: kit.venue,
      });
      const team = await response.json();
      const pts = calculatePoints(kit);
      setEarnedPoints(pts);
      setLaunched(true);
      toast({ title: 'Team Launched! 🚀', description: `${kit.teamName} is live! +${pts} points` });
      setTimeout(() => onSuccess?.(team), 2500);
    } catch {
      toast({ title: 'Error', description: 'Failed to create team. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (launched) {
    return (
      <div className="spotify-team-page">
        <div className="spotify-bg-layer">
          <div className="spotify-bg-color" style={{ backgroundColor: topColor }} />
          <div className="spotify-bg-gradient-dark" />
        </div>
        <div className="spotify-content-layer flex items-center justify-center">
          <div className="text-center px-8 animate-in fade-in zoom-in duration-500">
            <div className="text-7xl mb-6 animate-bounce">{config.emoji}</div>
            <h1 className="text-3xl font-extrabold text-foreground mb-3">{kit.teamName}</h1>
            <p className="text-muted-foreground text-[15px] mb-6">Your team is live!</p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-lg font-bold"
              style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.25)' }}>
              <Sparkles size={20} />
              +{earnedPoints} points
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-team-page">
      {/* Dynamic gradient background */}
      <div className="spotify-bg-layer" style={{ opacity: kit.sport ? 1 : 0.3 }}>
        <div className="spotify-bg-color" style={{ backgroundColor: kit.sport ? topColor : '#333' }} />
        <div className="spotify-bg-gradient-dark" />
      </div>

      {/* Top bar */}
      <div className="spotify-top-bar" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
        <button onClick={currentStep > 0 ? prev : onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <ArrowLeft size={18} color="#fff" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-[13px] font-semibold text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <button onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <X size={16} color="#fff" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="fixed top-14 left-0 right-0 z-40 flex justify-center gap-2 py-2">
        {STEPS.map((s, i) => (
          <div key={s} className="transition-all duration-300" style={{
            width: i === currentStep ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i < currentStep ? accentColor :
                        i === currentStep ? '#fff' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>

      {/* Scrollable content */}
      <div className="spotify-content-layer" style={{ paddingTop: '80px' }}>
        <div className="px-5 pb-40">

          {/* STEP 0: Choose Sport + Team Name */}
          {step === 'sport' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Pack Your Team Kit</h2>
                <p className="text-muted-foreground text-[14px]">Choose your sport and name your team</p>
              </div>

              <div className="glass-card !p-5">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Team Name</label>
                <input
                  type="text"
                  value={kit.teamName}
                  onChange={e => setKit({ ...kit, teamName: e.target.value })}
                  placeholder="e.g., Thunder Hawks"
                  className="w-full h-12 bg-muted/40 rounded-xl px-4 text-foreground text-[16px] font-semibold placeholder:text-muted-foreground/60 border border-border focus:border-border focus:outline-none transition-colors"
                />
              </div>

              <div className="glass-card !p-5">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Sport</label>
                <div className="grid grid-cols-3 gap-2">
                  {sports.map(s => {
                    const selected = kit.sport === s.name;
                    const sc = getSportConfig(s.name);
                    return (
                      <button key={s.name} onClick={() => setKit({ ...kit, sport: s.name })}
                        className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-all duration-200 active:scale-[0.95]"
                        style={{
                          background: selected ? `${sc.ringColor}20` : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${selected ? sc.ringColor : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: selected ? `0 0 20px ${sc.ringColor}22` : 'none',
                        }}>
                        <span className="text-2xl">{s.emoji}</span>
                        <span className={`text-[11px] font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card !p-5">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Skill Level</label>
                <div className="space-y-2">
                  {skillLevels.map(sl => (
                    <button key={sl.level} onClick={() => setKit({ ...kit, skillLevel: sl.level })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        background: kit.skillLevel === sl.level ? `${accentColor}15` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${kit.skillLevel === sl.level ? accentColor + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      <span className="text-xl">{sl.icon}</span>
                      <div className="text-left flex-1">
                        <div className="text-[14px] font-semibold text-foreground">{sl.level}</div>
                        <div className="text-[12px] text-muted-foreground">{sl.desc}</div>
                      </div>
                      {kit.skillLevel === sl.level && <Check size={16} style={{ color: accentColor }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card !p-5">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Description</label>
                <textarea
                  value={kit.description}
                  onChange={e => setKit({ ...kit, description: e.target.value })}
                  placeholder="What's your team about?"
                  rows={3}
                  className="w-full bg-muted/40 rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/60 border border-border focus:border-border focus:outline-none resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 1: Venue */}
          {step === 'venue' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">📍</div>
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Where do you play?</h2>
                <p className="text-muted-foreground text-[14px]">Add your home venue</p>
              </div>

              <div className="glass-card !p-5">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={kit.venue || ''}
                    onChange={e => setKit({ ...kit, venue: e.target.value })}
                    placeholder="Search venues, gyms, parks..."
                    className="w-full h-12 bg-muted/40 rounded-xl pl-11 pr-4 text-foreground text-[14px] placeholder:text-muted-foreground/60 border border-border focus:border-border focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {['Central Park', 'City Gym', 'Sports Arena', 'Community Center'].map(v => (
                  <button key={v} onClick={() => setKit({ ...kit, venue: v })}
                    className="glass-card !p-4 !mb-2 w-full flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                    style={{
                      borderColor: kit.venue === v ? accentColor + '40' : undefined,
                      background: kit.venue === v ? 'rgba(255,255,255,0.08)' : undefined,
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/40">
                      <MapPin size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-foreground">{v}</div>
                      <div className="text-[12px] text-muted-foreground">Nearby venue</div>
                    </div>
                    {kit.venue === v && <Check size={16} style={{ color: accentColor }} />}
                  </button>
                ))}
              </div>

              <p className="text-center text-[12px] text-muted-foreground">+100 points for adding a venue</p>
            </div>
          )}

          {/* STEP 2: Invite Players */}
          {step === 'players' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">👥</div>
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Who's on your team?</h2>
                <p className="text-muted-foreground text-[14px]">Invite players to join</p>
              </div>

              <div className="glass-card !p-5 space-y-3">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}20` }}>
                    <Users size={18} style={{ color: accentColor }} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-[14px] font-semibold text-foreground">Find nearby players</div>
                    <div className="text-[12px] text-muted-foreground">Discover athletes in your area</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>

                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/40">
                    <Share2 size={18} className="text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-[14px] font-semibold text-foreground">Share invite link</div>
                    <div className="text-[12px] text-muted-foreground">Send a link to friends</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>

                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/40">
                    <Link2 size={18} className="text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-[14px] font-semibold text-foreground">Invite from contacts</div>
                    <div className="text-[12px] text-muted-foreground">Import from your phone</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </div>

              {kit.players.length > 0 && (
                <div className="glass-card !p-4">
                  <span className="text-[13px] font-semibold text-foreground">
                    👥 {kit.players.length} player{kit.players.length !== 1 ? 's' : ''} invited
                  </span>
                </div>
              )}

              <p className="text-center text-[12px] text-muted-foreground">+200 points for inviting 5+ players</p>
            </div>
          )}

          {/* STEP 3: Gear Up */}
          {step === 'gear' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">⚙️</div>
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Need equipment?</h2>
                <p className="text-muted-foreground text-[14px]">Browse gear for your sport</p>
              </div>

              <div className="space-y-2">
                {[
                  { name: `${config.emoji} ${kit.sport || 'Sport'} Gloves`, price: 50 },
                  { name: '🦷 Mouthguard', price: 15 },
                  { name: '👟 Training Shoes', price: 120 },
                  { name: '🎒 Equipment Bag', price: 45 },
                ].map(item => {
                  const inKit = kit.gear.some(g => g.name === item.name);
                  return (
                    <button key={item.name}
                      onClick={() => {
                        if (inKit) {
                          setKit({ ...kit, gear: kit.gear.filter(g => g.name !== item.name) });
                        } else {
                          setKit({ ...kit, gear: [...kit.gear, item] });
                        }
                      }}
                      className="glass-card !p-4 !mb-2 w-full flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                      style={{
                        borderColor: inKit ? accentColor + '40' : undefined,
                      }}>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold text-foreground">{item.name}</div>
                        <div className="text-[13px] font-bold" style={{ color: accentColor }}>€{item.price}</div>
                      </div>
                      {inKit ? (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: accentColor }}>
                          <Check size={14} color="#fff" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/40 border border-border">
                          <ShoppingBag size={14} className="text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {kit.gear.length > 0 && (
                <div className="glass-card !p-4 text-center">
                  <span className="text-[13px] text-muted-foreground">
                    🛒 {kit.gear.length} item{kit.gear.length !== 1 ? 's' : ''} — $
                    {kit.gear.reduce((s, g) => s + g.price, 0)}
                  </span>
                </div>
              )}

              <p className="text-center text-[12px] text-muted-foreground">+50 points per gear item</p>
            </div>
          )}

          {/* STEP 4: Boost */}
          {step === 'boost' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">📢</div>
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Want more visibility?</h2>
                <p className="text-muted-foreground text-[14px]">Optional boosts for your team</p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'promote', icon: <Megaphone size={18} />, name: 'Promote Team', desc: 'Featured in discover feed', price: '€5' },
                  { id: 'verified', icon: <Award size={18} />, name: 'Verified Badge', desc: 'Stand out with a verified mark', price: '€10' },
                  { id: 'sponsors', icon: <Trophy size={18} />, name: 'Find Sponsors', desc: 'Get matched with sponsors', price: 'Free' },
                ].map(boost => {
                  const selected = kit.boosts.includes(boost.id);
                  return (
                    <button key={boost.id}
                      onClick={() => {
                        if (selected) {
                          setKit({ ...kit, boosts: kit.boosts.filter(b => b !== boost.id) });
                        } else {
                          setKit({ ...kit, boosts: [...kit.boosts, boost.id] });
                        }
                      }}
                      className="glass-card !p-4 !mb-2 w-full flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                      style={{ borderColor: selected ? accentColor + '40' : undefined }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: selected ? `${accentColor}20` : 'rgba(255,255,255,0.06)', color: selected ? accentColor : 'rgba(255,255,255,0.4)' }}>
                        {boost.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold text-foreground">{boost.name}</div>
                        <div className="text-[12px] text-muted-foreground">{boost.desc}</div>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: accentColor }}>{boost.price}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-[12px] text-muted-foreground">+150 points for any boost</p>
            </div>
          )}

          {/* STEP 5: Review & Launch */}
          {step === 'launch' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="text-2xl font-extrabold text-foreground mb-1">Ready to launch?</h2>
                <p className="text-muted-foreground text-[14px]">Review your Team Kit</p>
              </div>

              <div className="glass-card !p-6">
                {/* Team card preview */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: `linear-gradient(135deg, ${topColor}88, ${config.colors[1]}88)` }}>
                    {config.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-foreground">{kit.teamName || 'Untitled Team'}</h3>
                    <p className="text-[13px] text-muted-foreground">{kit.sport} • {kit.skillLevel || 'Any level'}</p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config.emoji}</span>
                    <span className="text-[14px] text-foreground flex-1">Sport</span>
                    <span className="text-[14px] font-semibold text-foreground">{kit.sport || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📍</span>
                    <span className="text-[14px] text-foreground flex-1">Venue</span>
                    <span className="text-[14px] font-semibold text-foreground">{kit.venue || 'Skipped'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👥</span>
                    <span className="text-[14px] text-foreground flex-1">Players</span>
                    <span className="text-[14px] font-semibold text-foreground">{kit.players.length || 'None yet'}</span>
                  </div>
                  {kit.gear.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🛒</span>
                      <span className="text-[14px] text-foreground flex-1">Gear</span>
                      <span className="text-[14px] font-semibold text-foreground">
                        ${kit.gear.reduce((s, g) => s + g.price, 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Points preview */}
              <div className="glass-card !p-4 flex items-center justify-between"
                style={{ background: 'rgba(255,215,0,0.06)', borderColor: 'rgba(255,215,0,0.15)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} style={{ color: '#FFD700' }} />
                  <span className="text-[14px] font-semibold text-foreground">Points earned</span>
                </div>
                <span className="text-xl font-extrabold" style={{ color: '#FFD700' }}>+{calculatePoints(kit)}</span>
              </div>

              {/* Privacy toggle */}
              <div className="glass-card !p-4 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{kit.isPrivate ? 'Private Team' : 'Public Team'}</div>
                  <div className="text-[12px] text-muted-foreground">{kit.isPrivate ? 'Invite only' : 'Anyone can request to join'}</div>
                </div>
                <button
                  onClick={() => setKit({ ...kit, isPrivate: !kit.isPrivate })}
                  className="w-12 h-7 rounded-full transition-colors duration-200 relative"
                  style={{ background: kit.isPrivate ? accentColor : 'rgba(255,255,255,0.15)' }}>
                  <div className="absolute top-1 w-5 h-5 rounded-full bg-background transition-transform duration-200"
                    style={{ left: kit.isPrivate ? 'calc(100% - 24px)' : '4px' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Team Kit pill */}
      <div className="builder-kit-pill">
        <div className="kit-items">
          {kit.sport && (
            <div className="kit-item" style={{ background: `${accentColor}20`, borderColor: `${accentColor}40` }}>
              <span className="text-sm">{config.emoji}</span>
              <span className="text-[11px] font-semibold text-foreground">{kit.sport}</span>
            </div>
          )}
          {kit.venue && (
            <div className="kit-item">
              <span className="text-sm">📍</span>
              <span className="text-[11px] font-semibold text-foreground truncate max-w-[60px]">{kit.venue}</span>
            </div>
          )}
          {kit.players.length > 0 && (
            <div className="kit-item">
              <span className="text-sm">👥</span>
              <span className="text-[11px] font-semibold text-foreground">{kit.players.length}</span>
            </div>
          )}
          {kit.gear.length > 0 && (
            <div className="kit-item">
              <span className="text-sm">⚙️</span>
              <span className="text-[11px] font-semibold text-foreground">{kit.gear.length}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        {step === 'launch' ? (
          <button onClick={handleLaunch} disabled={!canLaunch || loading}
            className="kit-action-btn"
            style={{ background: canLaunch ? accentColor : 'rgba(255,255,255,0.1)', opacity: canLaunch ? 1 : 0.5 }}>
            <Rocket size={16} />
            <span>{loading ? 'Launching...' : 'Launch'}</span>
          </button>
        ) : (
          <div className="flex gap-2">
            {step !== 'sport' && (
              <button onClick={skip} className="kit-skip-btn">Skip</button>
            )}
            <button onClick={step === 'sport' && (!kit.sport || !kit.teamName.trim()) ? undefined : next}
              className="kit-action-btn"
              style={{
                background: (step === 'sport' && (!kit.sport || !kit.teamName.trim())) ? 'rgba(255,255,255,0.1)' : accentColor,
                opacity: (step === 'sport' && (!kit.sport || !kit.teamName.trim())) ? 0.5 : 1,
              }}>
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
