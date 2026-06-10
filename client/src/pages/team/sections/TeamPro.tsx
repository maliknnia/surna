import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCog, FileText, Package,
  Shield, Hash, MapPin, Activity, Footprints,
  Award, Briefcase, ArrowDownToLine, CheckCircle2,
  AlertTriangle, Loader2, Crown
} from 'lucide-react';

interface TeamProProps {
  teamId: string;
}

type ProSubTab = 'roster' | 'staff' | 'docs' | 'equipment';

const subTabs: { id: ProSubTab; label: string; icon: any }[] = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'equipment', label: 'Equipment', icon: Package },
];

const statusColors: Record<string, string> = {
  active: '#34C759',
  injured: '#FF3B30',
  suspended: '#FF9500',
  reserve: '#000000',
  inactive: '#8E8E93',
};

const conditionColors: Record<string, string> = {
  new: '#34C759',
  good: '#30D158',
  fair: '#FF9500',
  worn: '#FF3B30',
  damaged: '#FF453A',
};

function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/40 rounded w-1/2" />
              <div className="h-3 bg-muted/40 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="glass-card text-center py-10">
      <Icon className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
      <p className="text-muted-foreground text-[15px] font-semibold mb-1">{title}</p>
      <p className="text-muted-foreground text-[13px]">{subtitle}</p>
    </div>
  );
}

function RosterSection({ teamId }: { teamId: string }) {
  const { data: roster, isLoading } = useQuery<any[]>({
    queryKey: ['/api/pro/team', teamId, 'roster'],
    enabled: !!teamId,
  });

  if (isLoading) return <SkeletonCards count={4} />;
  if (!roster?.length) return <EmptyState icon={Users} title="No Players" subtitle="Add players to build your roster" />;

  return (
    <div className="space-y-2">
      {roster.map((player: any) => (
        <div key={player.id} className="glass-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center border border-border">
              {player.jerseyNumber != null ? (
                <span className="text-foreground font-bold text-lg">#{player.jerseyNumber}</span>
              ) : (
                <Users size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold text-[15px] truncate">
                  {player.userId}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {player.positions?.length > 0 && (
                  <span className="text-muted-foreground text-[12px] flex items-center gap-1">
                    <MapPin size={11} /> {(player.positions as string[]).join(', ')}
                  </span>
                )}
                {player.nationality && (
                  <span className="text-muted-foreground text-[12px]">{player.nationality}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: statusColors[player.status] || '#8E8E93',
                  backgroundColor: `${statusColors[player.status] || '#8E8E93'}20`,
                }}
              >
                {player.status}
              </span>
              {player.preferredFoot && (
                <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Footprints size={10} /> {player.preferredFoot}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffSection({ teamId }: { teamId: string }) {
  const { data: staff, isLoading } = useQuery<any[]>({
    queryKey: ['/api/pro/team', teamId, 'staff'],
    enabled: !!teamId,
  });

  if (isLoading) return <SkeletonCards count={3} />;
  if (!staff?.length) return <EmptyState icon={UserCog} title="No Staff" subtitle="Add coaches and support staff" />;

  const typeIcons: Record<string, any> = {
    coach: Crown,
    physio: Activity,
    manager: Briefcase,
    analyst: Shield,
  };

  return (
    <div className="space-y-2">
      {staff.map((s: any) => {
        const TypeIcon = typeIcons[s.staffType] || UserCog;
        return (
          <div key={s.id} className="glass-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted/40 flex items-center justify-center border border-border">
                <TypeIcon size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-semibold text-[15px] truncate">{s.title || s.staffType}</div>
                <div className="text-muted-foreground text-[12px] capitalize">{s.staffType}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {s.certifications?.length > 0 && (
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                    <Award size={10} /> {s.certifications.length} cert{s.certifications.length > 1 ? 's' : ''}
                  </span>
                )}
                {s.specialties?.length > 0 && (
                  <span className="text-muted-foreground text-[11px]">
                    {(s.specialties as string[]).slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocsSection({ teamId }: { teamId: string }) {
  const { data: docs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/pro/team', teamId, 'docs'],
    enabled: !!teamId,
  });

  if (isLoading) return <SkeletonCards count={3} />;
  if (!docs?.length) return <EmptyState icon={FileText} title="No Documents" subtitle="Upload team documents and files" />;

  const typeColors: Record<string, string> = {
    contract: '#000000',
    medical: '#FF3B30',
    tactical: '#FF9500',
    administrative: '#30D158',
    waiver: '#007AFF',
  };

  return (
    <div className="space-y-2">
      {docs.map((doc: any) => (
        <div key={doc.id} className="glass-card">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${typeColors[doc.type] || '#8E8E93'}20` }}
            >
              <FileText size={18} style={{ color: typeColors[doc.type] || '#8E8E93' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-semibold text-[14px] truncate">{doc.title}</div>
              <div className="text-muted-foreground text-[12px] capitalize">{doc.type}</div>
            </div>
            {doc.fileUrl && (
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"
              >
                <ArrowDownToLine size={14} className="text-muted-foreground" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentSection({ teamId }: { teamId: string }) {
  const { data: equipment, isLoading } = useQuery<any[]>({
    queryKey: ['/api/pro/team', teamId, 'equipment'],
    enabled: !!teamId,
  });

  if (isLoading) return <SkeletonCards count={3} />;
  if (!equipment?.length) return <EmptyState icon={Package} title="No Equipment" subtitle="Track issued equipment here" />;

  return (
    <div className="space-y-2">
      {equipment.map((item: any) => (
        <div key={item.id} className="glass-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center border border-border">
              <Package size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-semibold text-[14px] truncate">{item.itemName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {item.category && (
                  <span className="text-muted-foreground text-[12px] capitalize">{item.category}</span>
                )}
                <span className="text-muted-foreground text-[12px]">x{item.quantity || 1}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  color: conditionColors[item.condition] || '#8E8E93',
                  backgroundColor: `${conditionColors[item.condition] || '#8E8E93'}20`,
                }}
              >
                {item.returnedAt ? (
                  <><CheckCircle2 size={10} /> Returned</>
                ) : (
                  <>{item.condition}</>
                )}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamPro({ teamId }: TeamProProps) {
  const [activeSubTab, setActiveSubTab] = useState<ProSubTab>('roster');

  return (
    <div className="space-y-4">
      <div className="glass-card !p-2">
        <div className="flex gap-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-muted/40 text-foreground'
                    : 'text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSubTab === 'roster' && <RosterSection teamId={teamId} />}
      {activeSubTab === 'staff' && <StaffSection teamId={teamId} />}
      {activeSubTab === 'docs' && <DocsSection teamId={teamId} />}
      {activeSubTab === 'equipment' && <EquipmentSection teamId={teamId} />}
    </div>
  );
}
