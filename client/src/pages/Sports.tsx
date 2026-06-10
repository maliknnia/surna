import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ChevronRight, MapPin, Users, Trophy, Star, Clock, Dumbbell } from 'lucide-react';

const sportsData = [
  {
    id: 'basketball',
    name: 'Basketball',
    emoji: '🏀',
    color: '#FF6B35',
    players: '5v5',
    difficulty: 'Medium',
    brief: 'Fast-paced team sport played on a court with two hoops. Score by shooting the ball through the opposing team\'s basket.',
    howToStart: [
      'Get a basketball and find a local court',
      'Learn basic dribbling, passing, and shooting',
      'Practice layups and free throws',
      'Join pickup games at your local gym or park',
      'Sign up for a recreational league on SURNA',
    ],
    journey: ['Beginner → Learn fundamentals', 'Intermediate → Join pickup games', 'Advanced → Compete in leagues', 'Elite → Tournament play'],
    nearbyPlaces: 12,
    activeTeams: 34,
  },
  {
    id: 'soccer',
    name: 'Soccer',
    emoji: '⚽',
    color: '#2ECC71',
    players: '11v11',
    difficulty: 'Easy',
    brief: 'The world\'s most popular sport. Two teams try to score by kicking a ball into the opposing goal.',
    howToStart: [
      'All you need is a ball and open space',
      'Practice passing, dribbling, and shooting',
      'Work on your first touch and ball control',
      'Join pickup matches at local fields',
      'Find a team or league through SURNA',
    ],
    journey: ['Beginner → Kick-arounds', 'Intermediate → 5-a-side', 'Advanced → 11v11 leagues', 'Elite → Competitive tournaments'],
    nearbyPlaces: 18,
    activeTeams: 56,
  },
  {
    id: 'tennis',
    name: 'Tennis',
    emoji: '🎾',
    color: '#DFFF00',
    players: '1v1 / 2v2',
    difficulty: 'Medium',
    brief: 'Hit a ball over a net using rackets. Play singles or doubles on clay, grass, or hard courts.',
    howToStart: [
      'Get a racket and tennis balls',
      'Find a local court — many parks have free ones',
      'Learn the basic strokes: forehand, backhand, serve',
      'Take a beginner lesson or watch tutorials',
      'Find hitting partners on SURNA',
    ],
    journey: ['Beginner → Rally practice', 'Intermediate → Match play', 'Advanced → Club competitions', 'Elite → Tournament circuit'],
    nearbyPlaces: 8,
    activeTeams: 15,
  },
  {
    id: 'swimming',
    name: 'Swimming',
    emoji: '🏊',
    color: '#3498DB',
    players: 'Individual',
    difficulty: 'Easy',
    brief: 'Full-body workout in water. Great for fitness, competition, or recreation. Multiple strokes to master.',
    howToStart: [
      'Find a local pool or aquatic center',
      'Start with basic freestyle and breathing',
      'Take a few lessons if you\'re a beginner',
      'Build endurance with lap swimming',
      'Join a swim club through SURNA',
    ],
    journey: ['Beginner → Learn to swim', 'Intermediate → Lap swimming', 'Advanced → Competitive meets', 'Elite → Championship events'],
    nearbyPlaces: 6,
    activeTeams: 8,
  },
  {
    id: 'boxing',
    name: 'Boxing',
    emoji: '🥊',
    color: '#E74C3C',
    players: '1v1',
    difficulty: 'Hard',
    brief: 'Combat sport focused on punching technique, footwork, and defense. Amazing for fitness and discipline.',
    howToStart: [
      'Find a boxing gym near you',
      'Start with beginner classes — no experience needed',
      'Learn the basic punches: jab, cross, hook, uppercut',
      'Practice footwork and defense drills',
      'Spar when your coach says you\'re ready',
    ],
    journey: ['Beginner → Bag work & technique', 'Intermediate → Controlled sparring', 'Advanced → Amateur bouts', 'Elite → Competitive fighting'],
    nearbyPlaces: 5,
    activeTeams: 12,
  },
  {
    id: 'running',
    name: 'Running',
    emoji: '🏃',
    color: '#1ABC9C',
    players: 'Individual',
    difficulty: 'Easy',
    brief: 'The simplest sport — just lace up and go. Run for fitness, fun, or competition at any distance.',
    howToStart: [
      'Get a good pair of running shoes',
      'Start with a walk/run program (Couch to 5K)',
      'Build up distance gradually',
      'Join a running group for motivation',
      'Sign up for your first 5K race',
    ],
    journey: ['Beginner → Walk/run 5K', 'Intermediate → 10K races', 'Advanced → Half marathon', 'Elite → Full marathon & ultras'],
    nearbyPlaces: 15,
    activeTeams: 22,
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    emoji: '🏐',
    color: '#F39C12',
    players: '6v6',
    difficulty: 'Medium',
    brief: 'Team sport where you hit a ball over a high net. Play indoor on courts or beach volleyball outdoors.',
    howToStart: [
      'Find a local gym or beach with nets',
      'Learn basic skills: bump, set, spike',
      'Practice serving — underhand first, then overhand',
      'Join open gym sessions or beach games',
      'Form or join a team on SURNA',
    ],
    journey: ['Beginner → Open gym play', 'Intermediate → Rec leagues', 'Advanced → Competitive leagues', 'Elite → Tournament play'],
    nearbyPlaces: 9,
    activeTeams: 20,
  },
  {
    id: 'mma',
    name: 'MMA',
    emoji: '🤼',
    color: '#8E44AD',
    players: '1v1',
    difficulty: 'Hard',
    brief: 'Mixed Martial Arts combines striking, grappling, and ground fighting. Tests every aspect of combat fitness.',
    howToStart: [
      'Find an MMA gym with beginner-friendly classes',
      'Start with fundamentals — striking and grappling basics',
      'Cross-train in disciplines like BJJ, Muay Thai, wrestling',
      'Focus on conditioning and flexibility',
      'Work up to controlled sparring when ready',
    ],
    journey: ['Beginner → Fundamentals class', 'Intermediate → Multi-discipline training', 'Advanced → Amateur competition', 'Elite → Professional fights'],
    nearbyPlaces: 4,
    activeTeams: 7,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    emoji: '🚴',
    color: '#E67E22',
    players: 'Individual / Group',
    difficulty: 'Easy',
    brief: 'Road, mountain, or track cycling. Great cardio workout that lets you explore while building endurance.',
    howToStart: [
      'Get a bike that fits — road, hybrid, or mountain',
      'Learn basic bike maintenance and safety',
      'Start with short rides and build distance',
      'Find local cycling routes and trails',
      'Join group rides through SURNA',
    ],
    journey: ['Beginner → Casual rides', 'Intermediate → Century rides', 'Advanced → Racing', 'Elite → Stage races & crits'],
    nearbyPlaces: 11,
    activeTeams: 14,
  },
  {
    id: 'yoga',
    name: 'Yoga',
    emoji: '🧘',
    color: '#9B59B6',
    players: 'Individual / Group',
    difficulty: 'Easy',
    brief: 'Mind-body practice combining poses, breathing, and meditation. Builds flexibility, strength, and mental clarity.',
    howToStart: [
      'Start with beginner or gentle yoga classes',
      'Get a yoga mat — that\'s all you need',
      'Learn basic poses: downward dog, warrior, tree',
      'Try different styles: vinyasa, hatha, yin',
      'Practice consistently, even just 15 minutes a day',
    ],
    journey: ['Beginner → Basic poses', 'Intermediate → Flow sequences', 'Advanced → Advanced poses & teaching', 'Elite → Instructor certification'],
    nearbyPlaces: 10,
    activeTeams: 6,
  },
];

export default function Sports() {
  const [, setLocation] = useLocation();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const selected = sportsData.find(s => s.id === selectedSport);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surna-base)', color: 'var(--surna-text)' }}>
      <header className="sticky top-0 backdrop-blur-sm z-20 px-4 h-12 flex items-center gap-3" style={{ background: 'var(--surna-base)', borderBottom: '1px solid var(--surna-border)' }}>
        <button onClick={() => setLocation('/')} className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--surna-text)' }}>
          <ArrowLeft size={20} />
        </button>
        <span className="text-base font-bold">Sports</span>
        <Dumbbell size={18} className="text-[#3498DB] ml-auto" />
      </header>

      {!selected ? (
        <div className="p-4 pb-24">
          <p className="text-sm mb-4" style={{ color: 'var(--surna-text-secondary)' }}>Discover sports, learn how to start, and find your path to greatness.</p>
          <div className="grid grid-cols-2 gap-3">
            {sportsData.map((sport) => (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className="rounded-xl p-4 text-left transition-colors group"
                style={{ background: 'var(--surna-elevated)' }}
              >
                <div className="text-3xl mb-2">{sport.emoji}</div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--surna-text)' }}>{sport.name}</h3>
                <p className="text-[10px] line-clamp-2 mb-2" style={{ color: 'var(--surna-text-secondary)' }}>{sport.brief}</p>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--surna-text-muted)' }}>
                  <span className="flex items-center gap-0.5"><Users size={10} />{sport.activeTeams}</span>
                  <span className="flex items-center gap-0.5"><MapPin size={10} />{sport.nearbyPlaces}</span>
                </div>
                <div
                  className="mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                  style={{ color: sport.color, backgroundColor: `${sport.color}20` }}
                >
                  {sport.difficulty} · {sport.players}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="pb-24">
          <div className="relative h-32 flex items-end p-4" style={{ background: `linear-gradient(135deg, ${selected.color}40, ${selected.color}10)` }}>
            <button
              onClick={() => setSelectedSport(null)}
              className="absolute top-3 left-3 p-1.5 rounded-full bg-foreground/40 hover:bg-foreground/80 transition-colors"
            >
              <ArrowLeft size={16} className="text-foreground" />
            </button>
            <div>
              <span className="text-4xl mr-3">{selected.emoji}</span>
              <h1 className="text-2xl font-black inline align-middle">{selected.name}</h1>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surna-elevated)' }}>
                <Users size={16} className="mx-auto mb-1" style={{ color: 'var(--surna-text-secondary)' }} />
                <div className="text-sm font-bold">{selected.activeTeams}</div>
                <div className="text-[10px]" style={{ color: 'var(--surna-text-muted)' }}>Teams</div>
              </div>
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surna-elevated)' }}>
                <MapPin size={16} className="mx-auto mb-1" style={{ color: 'var(--surna-text-secondary)' }} />
                <div className="text-sm font-bold">{selected.nearbyPlaces}</div>
                <div className="text-[10px]" style={{ color: 'var(--surna-text-muted)' }}>Places</div>
              </div>
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surna-elevated)' }}>
                <Star size={16} className="mx-auto mb-1" style={{ color: 'var(--surna-text-secondary)' }} />
                <div className="text-sm font-bold">{selected.difficulty}</div>
                <div className="text-[10px]" style={{ color: 'var(--surna-text-muted)' }}>Level</div>
              </div>
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surna-elevated)' }}>
                <Trophy size={16} className="mx-auto mb-1" style={{ color: 'var(--surna-text-secondary)' }} />
                <div className="text-sm font-bold">{selected.players}</div>
                <div className="text-[10px]" style={{ color: 'var(--surna-text-muted)' }}>Format</div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--surna-elevated)' }}>
              <h3 className="font-bold text-sm mb-2">About</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--surna-text-secondary)' }}>{selected.brief}</p>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--surna-elevated)' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Dumbbell size={14} style={{ color: selected.color }} />
                How to Start
              </h3>
              <div className="space-y-2.5">
                {selected.howToStart.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${selected.color}20`, color: selected.color }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--surna-text-secondary)' }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--surna-elevated)' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <ChevronRight size={14} style={{ color: selected.color }} />
                Your Journey
              </h3>
              <div className="space-y-3">
                {selected.journey.map((stage, i) => {
                  const [level, desc] = stage.split(' → ');
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selected.color, opacity: 0.3 + (i * 0.23) }}
                        />
                        {i < selected.journey.length - 1 && (
                          <div className="absolute top-3 left-1.5 w-px h-5" style={{ background: 'var(--surna-border)' }} />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold" style={{ color: 'var(--surna-text)' }}>{level}</span>
                        <span className="text-xs ml-1" style={{ color: 'var(--surna-text-muted)' }}>— {desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocation('/places')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ backgroundColor: `${selected.color}20`, color: selected.color }}
                >
                  Find Places
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('/teams')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: 'var(--surna-surface)', color: 'var(--surna-text)' }}
                >
                  Find Teams
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocation('/events')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: 'var(--surna-surface)', color: 'var(--surna-text)' }}
                >
                  Find Events
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('/coaches')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{ background: 'var(--surna-surface)', color: 'var(--surna-text)' }}
                >
                  Find Coaches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
