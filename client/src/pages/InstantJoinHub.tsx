import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, MapPin, Users, Zap, Plus, ChevronLeft, Filter, Trophy, Check, ArrowRight, Radio } from "lucide-react";
import { calculateDistance } from "@/lib/geo";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import { ROUTES } from "@/navigation";

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Baseball', 'Soccer', 'Rugby', 'Cricket', 'GAA', 'Hurling', 'Hockey', 'Badminton', 'Table Tennis', 'Swimming'];
const TIME_FILTERS = [
  { label: 'Now', value: 'now' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: 'Today', value: 'today' },
];
const SKILL_LEVELS = ['any', 'beginner', 'intermediate', 'advanced', 'expert'];

function formatTimeUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return 'Started';
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
  return `${Math.floor(diff / 86400000)}d`;
}

function SpotsBar({ joined, needed }: { joined: number; needed: number }) {
  const pct = Math.min(100, (joined / needed) * 100);
  const spotsLeft = Math.max(0, needed - joined);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surna-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: spotsLeft <= 1 ? '#FF3B30' : spotsLeft <= 3 ? '#FF9500' : '#000000' }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: spotsLeft <= 1 ? '#FF3B30' : spotsLeft <= 3 ? '#FF9500' : '#000000' }}>
        {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}

export default function InstantJoinHub() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sportFilter, setSportFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [skillFilter, setSkillFilter] = useState('any');
  const [showFilters, setShowFilters] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [chatByTeamId, setChatByTeamId] = useState<Record<string, string>>({});
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const { data: availability } = useQuery<any>({
    queryKey: ['/api/instant-teams/availability/me'],
    queryFn: async () => {
      const res = await fetch('/api/instant-teams/availability/me', { credentials: 'include' });
      if (!res.ok) return { isAvailable: false, sports: [], skillLevel: 'any', radiusKm: 10 };
      return res.json();
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/instant-teams/availability', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instant-teams/availability/me'] });
      toast({ title: availability?.isAvailable ? "You're now hidden" : "You're now visible!", description: availability?.isAvailable ? "Teams won't see you" : "Nearby teams can find you" });
    },
  });

  const { data: teams = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/instant-teams', sportFilter, skillFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sportFilter) params.set('sport', sportFilter);
      if (skillFilter !== 'any') params.set('skillLevel', skillFilter);
      const res = await fetch(`/api/instant-teams?${params}`, { credentials: 'include' });
      return res.json();
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const joined = new Set<string>();
    const chats: Record<string, string> = {};
    for (const t of teams) {
      if (t.isMember) joined.add(t.id);
      if (t.messengerGroupId) chats[t.id] = t.messengerGroupId;
    }
    setJoinedIds(joined);
    setChatByTeamId((prev) => ({ ...prev, ...chats }));
  }, [teams]);

  const joinMutation = useMutation({
    mutationFn: async (teamId: string) => {
      setJoiningId(teamId);
      const res = await apiRequest('POST', `/api/instant-teams/${teamId}/join`);
      return res.json() as Promise<{ success: boolean; chatGroupId?: string }>;
    },
    onSuccess: async (data, teamId) => {
      setJoinedIds(prev => new Set(prev).add(teamId));
      const chatCreated = Boolean(data.chatGroupId);
      if (data.chatGroupId) {
        setChatByTeamId((prev) => ({ ...prev, [teamId]: data.chatGroupId! }));
      }

      toast({
        title: "You're in!",
        description: chatCreated ? "Opening group chat…" : "You've joined the game",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/instant-teams'] });
      setJoiningId(null);
      if (data.chatGroupId) {
        navigate(`/messages?groupId=${encodeURIComponent(data.chatGroupId)}`);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Can't join", description: err.message, variant: "destructive" });
      setJoiningId(null);
    },
  });

  const filteredTeams = teams.filter((t: any) => {
    if (timeFilter === 'now') return new Date(t.startTime).getTime() - Date.now() < 900000;
    if (timeFilter === '1h') return new Date(t.startTime).getTime() - Date.now() < 3600000;
    if (timeFilter === '2h') return new Date(t.startTime).getTime() - Date.now() < 7200000;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--surna-void)' }}>
      <div className="sticky top-0 z-20" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate('/')} className="p-1">
            <ChevronLeft size={24} color="#000000" />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={18} color="#000000" />
            <span className="text-base font-bold" style={{ color: 'var(--surna-text)' }}>Instant Join</span>
          </div>
          <button onClick={() => navigate('/instant-teams/create')} className="p-1.5 rounded-full" style={{ background: '#000000' }}>
            <Plus size={18} color="#fff" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-2">
          {TIME_FILTERS.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeFilter(tf.value)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: timeFilter === tf.value ? '#000000' : 'var(--surna-elevated)',
                color: timeFilter === tf.value ? '#fff' : 'var(--surna-text-secondary)',
                border: `1px solid ${timeFilter === tf.value ? '#000000' : 'var(--surna-separator)'}`,
              }}
            >
              {tf.label}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 rounded-full flex items-center gap-1"
            style={{
              background: showFilters ? '#000000' : 'var(--surna-elevated)',
              color: showFilters ? '#fff' : 'var(--surna-text-secondary)',
              border: `1px solid ${showFilters ? '#000000' : 'var(--surna-separator)'}`,
            }}
          >
            <Filter size={12} />
            <span className="text-xs font-semibold">Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="px-4 pb-3 space-y-2" style={{ borderBottom: '1px solid var(--surna-separator)' }}>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--surna-text-secondary)' }}>Sport</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSportFilter('')} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: !sportFilter ? '#000000' : 'var(--surna-surface)', color: !sportFilter ? '#fff' : 'var(--surna-text-secondary)' }}>All</button>
                {SPORTS.map(s => (
                  <button key={s} onClick={() => setSportFilter(s)} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: sportFilter === s ? '#000000' : 'var(--surna-surface)', color: sportFilter === s ? '#fff' : 'var(--surna-text-secondary)' }}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--surna-text-secondary)' }}>Skill Level</label>
              <div className="flex gap-1.5">
                {SKILL_LEVELS.map(sl => (
                  <button key={sl} onClick={() => setSkillFilter(sl)} className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ background: skillFilter === sl ? '#000000' : 'var(--surna-surface)', color: skillFilter === sl ? '#fff' : 'var(--surna-text-secondary)' }}>{sl}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-4 mt-3 mb-2">
        <button
          onClick={() => availabilityMutation.mutate({ isAvailable: !availability?.isAvailable, sports: availability?.sports || [], skillLevel: availability?.skillLevel || 'any', radiusKm: availability?.radiusKm || 10 })}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
          style={{
            background: availability?.isAvailable ? 'rgba(52, 199, 89, 0.1)' : 'var(--surna-elevated)',
            border: `1px solid ${availability?.isAvailable ? 'rgba(52, 199, 89, 0.3)' : 'var(--surna-separator)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radio size={18} color={availability?.isAvailable ? '#34C759' : 'var(--surna-text-muted)'} />
              {availability?.isAvailable && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: '#34C759' }} />}
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold block" style={{ color: 'var(--surna-text)' }}>
                {availability?.isAvailable ? 'Available to Play' : 'Not Available'}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--surna-text-secondary)' }}>
                {availability?.isAvailable ? 'Teams can find and invite you' : 'Tap to let nearby teams find you'}
              </span>
            </div>
          </div>
          <div className="w-12 h-7 rounded-full p-0.5 transition-all" style={{ background: availability?.isAvailable ? '#34C759' : 'var(--surna-surface)' }}>
            <div className="w-6 h-6 rounded-full transition-all shadow" style={{ background: '#fff', transform: availability?.isAvailable ? 'translateX(20px)' : 'translateX(0)' }} />
          </div>
        </button>
      </div>

      <div className="mx-4 mt-1 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.2)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34C759' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--surna-text-secondary)' }}>
          <span style={{ color: '#000000', fontWeight: 700 }}>{filteredTeams.length}</span> games looking for players near you
        </span>
      </div>

      <div className="px-4 pb-24 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surna-elevated)', height: 140 }} />
          ))
        ) : filteredTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--surna-elevated)' }}>
              <Zap size={28} color="#000000" />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--surna-text)' }}>No games right now</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--surna-text-secondary)' }}>Be the first to create one!</p>
            <button
              onClick={() => navigate('/instant-teams/create')}
              className="px-6 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: '#000000', color: '#fff' }}
            >
              Create Game
            </button>
          </div>
        ) : (
          filteredTeams.map((team: any) => {
            const isJoined = joinedIds.has(team.id) || team.isMember;
            const chatGroupId = chatByTeamId[team.id] || team.messengerGroupId;
            const isFull = (team.playersJoined || 0) >= team.playersNeeded;
            const isJoining = joiningId === team.id;
            const timeLabel = formatTimeUntil(team.startTime);
            const isUrgent = new Date(team.startTime).getTime() - Date.now() < 1800000;
            const teamLat = Number(team.lat ?? team.latitude ?? team.locationLat);
            const teamLng = Number(team.lng ?? team.longitude ?? team.locationLng);
            const hasCoords = Number.isFinite(teamLat) && Number.isFinite(teamLng);
            const distanceLabel =
              userCoords && hasCoords
                ? `${calculateDistance(userCoords, { lat: teamLat, lng: teamLng }).toFixed(1)} km away`
                : null;

            return (
              <div
                key={team.id}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{ background: 'var(--surna-elevated)', border: isUrgent ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid var(--surna-separator)' }}
                onClick={() => navigate(ROUTES.instantTeam(team.id))}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(0, 0, 0, 0.08)', color: '#000000' }}>{team.sport}</span>
                      {team.skillLevel && team.skillLevel !== 'any' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize" style={{ background: 'var(--surna-surface)', color: 'var(--surna-text-secondary)' }}>
                          <Trophy size={10} className="inline mr-0.5" />{team.skillLevel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} color={isUrgent ? '#FF3B30' : undefined} style={!isUrgent ? { color: 'var(--surna-text-secondary)' } : undefined} />
                      <span className="text-xs font-bold" style={{ color: isUrgent ? '#FF3B30' : 'var(--surna-text-secondary)' }}>
                        {timeLabel}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-[15px] font-bold mb-0.5" style={{ color: 'var(--surna-text)' }}>{team.name}</h3>
                  <div className="flex items-center gap-1.5 mb-2">
                    {team.creator?.profileImageUrl ? (
                      <img src={team.creator.profileImageUrl} className="w-4 h-4 rounded-full" alt="" />
                    ) : (
                      <div className="w-4 h-4 rounded-full" style={{ background: 'var(--surna-surface)' }} />
                    )}
                    {team.creatorId ? (
                      <button
                        type="button"
                        className="text-xs hover:underline"
                        style={{ color: 'var(--surna-text-secondary)' }}
                        onClick={() => navigate(`/person/${team.creatorId}`)}
                      >
                        {team.creator?.displayName || 'Anonymous'}
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--surna-text-secondary)' }}>
                        {team.creator?.displayName || 'Anonymous'}
                      </span>
                    )}
                  </div>

                  {team.locationName && (
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin size={12} style={{ color: 'var(--surna-text-secondary)' }} />
                      <span className="text-xs" style={{ color: 'var(--surna-text-secondary)' }}>{team.locationName}</span>
                    </div>
                  )}
                  {distanceLabel && (
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin size={12} style={{ color: 'var(--surna-text-secondary)' }} />
                      <span className="text-xs" style={{ color: 'var(--surna-text-secondary)' }}>{distanceLabel}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <CardAttendeeStrip
                      entityType="instant"
                      entityId={String(team.id)}
                      fallbackCount={team.playersJoined}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <SpotsBar joined={team.playersJoined || 0} needed={team.playersNeeded} />
                    </div>
                    {isJoined && chatGroupId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/messages?groupId=${encodeURIComponent(chatGroupId)}`);
                        }}
                        className="px-4 py-2 rounded-full text-sm font-semibold"
                        style={{ background: "var(--surna-surface)", color: "var(--surna-text)" }}
                      >
                        Chat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isJoined && !isFull) joinMutation.mutate(team.id);
                      }}
                      disabled={isJoined || isFull || isJoining}
                      className="px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5"
                      style={{
                        background: isJoined ? '#34C759' : isFull ? 'var(--surna-surface)' : '#000000',
                        color: isFull && !isJoined ? 'var(--surna-text-muted)' : '#fff',
                        opacity: isJoining ? 0.7 : 1,
                      }}
                    >
                      {isJoining ? (
                        <div className="w-4 h-4 border-2 border-border border-t-white rounded-full animate-spin" />
                      ) : isJoined ? (
                        <><Check size={14} /> In</>
                      ) : isFull ? (
                        'Full'
                      ) : (
                        <><Zap size={14} /> Join</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-6 right-5 z-30">
        <button
          onClick={() => navigate('/instant-teams/create')}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: '#000000', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
        >
          <Plus size={24} color="#fff" />
        </button>
      </div>
    </div>
  );
}
