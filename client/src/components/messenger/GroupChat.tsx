import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, MoreVertical,
  Users, Settings, UserPlus, Crown, Shield, X,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import MessageBubble from './MessageBubble';
import ChatComposer from './ChatComposer';
import MediaPicker from './MediaPicker';
import { isDemoConversation, getDemoGroupMessages } from './demoData';
import { getMessengerTheme } from './messengerTheme';
import { mapPath } from '@/lib/mapNavigation';
import { GROUP_PLUS_OPTIONS, type PlusSheetOption } from './plusSheetOptions';
import { joinGroupRoom, leaveGroupRoom } from '@/lib/messengerSocket';

interface GroupChatProps {
  groupId: string;
  groupData?: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    created_at: string;
    member_count?: number;
    role?: 'owner' | 'admin' | 'member';
  };
  onBack: () => void;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  kind: 'text' | 'audio' | 'poll' | 'event_card' | 'image';
  body: string;
  media_id: string | null;
  created_at: string;
  replyTo?: { id: string; body: string; sender_id: string };
}

interface GroupMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  };
}

const PLUS_OPTIONS = GROUP_PLUS_OPTIONS;

const SMART_PLACEHOLDERS = ['Message the group…', 'Plan something…', 'Share a poll…', 'Invite to event…'];

function PlusSheet({ isDark, onSelect, onClose }: { isDark: boolean; onSelect: (a: string) => void; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };
  const pick  = (a: string) => { setVisible(false); setTimeout(() => onSelect(a), 260); };

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handle  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const title   = isDark ? '#ffffff' : 'var(--surna-text)';
  const itemBg  = isDark ? 'rgba(255,255,255,0.06)' : 'var(--surna-elevated)';

  return (
    <div className="fixed inset-0 z-[60]" style={{ background: `rgba(0,0,0,${visible ? 0.45 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 18 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handle }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 18 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: title }}>Add to Chat</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handle, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '0 16px' }}>
          {PLUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const iconClr = isDark ? 'rgba(167,139,250,0.9)' : 'rgba(0,0,0,0.85)';
            const iconBg = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.15)';
            const hoverBg = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.15)';
            return (
              <button key={opt.action} onClick={() => pick(opt.action)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px 14px', borderRadius: 18, background: itemBg, border: 'none', cursor: 'pointer', transition: 'transform 120ms ease, background 150ms ease' }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = itemBg; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = itemBg; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={iconClr} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: title, textAlign: 'center', lineHeight: '1.2' }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GroupChat({ groupId, groupData, onBack }: GroupChatProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [message, setMessage]         = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo]     = useState(false);
  const [showPlus, setShowPlus]               = useState(false);
  const [replyTo, setReplyTo]                 = useState<GroupMessage | null>(null);
  const [placeholderIdx, setPlaceholderIdx]   = useState(0);
  const [inputFocused, setInputFocused]       = useState(false);
  const isDemo = isDemoConversation(groupId);
  const [demoMsgs, setDemoMsgs] = useState<any[]>(() => getDemoGroupMessages(groupId));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isDemo) setDemoMsgs(getDemoGroupMessages(groupId)); }, [groupId, isDemo]);

  useEffect(() => {
    if (inputFocused || message) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SMART_PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, [inputFocused, message]);

  const { data: group } = useQuery({
    queryKey: [`/api/messenger/groups/${groupId}`],
    queryFn: async () => {
      if (isDemo) return groupData;
      const r = await fetch(`/api/messenger/groups/${groupId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch group details');
      return r.json();
    },
    initialData: groupData,
  });

  const { data: messagesData, isLoading } = useQuery({
    queryKey: [`/api/messenger/groups/${groupId}/messages`],
    queryFn: async () => {
      if (isDemo) return { items: demoMsgs };
      const r = await fetch(`/api/messenger/groups/${groupId}/messages?limit=50`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch messages');
      return r.json();
    },
  });

  const displayMessages = isDemo ? { items: demoMsgs } : messagesData;

  const { data: members } = useQuery({
    queryKey: [`/api/messenger/groups/${groupId}/members`],
    queryFn: async () => {
      if (isDemo) return [
        { user_id: 'demo-sarah',  role: 'admin',  joined_at: '', user: { firstName: 'Sarah',  lastName: 'Chen',     email: 'sarah@surna.com'  } },
        { user_id: 'demo-marcus', role: 'member', joined_at: '', user: { firstName: 'Marcus', lastName: 'Johnson',  email: 'marcus@surna.com' } },
        { user_id: 'demo-alex',   role: 'member', joined_at: '', user: { firstName: 'Alex',   lastName: 'Rivera',   email: 'alex@surna.com'   } },
        { user_id: 'demo-jordan', role: 'member', joined_at: '', user: { firstName: 'Jordan', lastName: 'Williams', email: 'jordan@surna.com' } },
      ];
      const r = await fetch(`/api/messenger/groups/${groupId}/members`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch members');
      const data = await r.json();
      return data.members || [];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { body?: string; mediaId?: string }) => {
      const r = await fetch(`/api/messenger/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('Failed to send message');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messenger/groups/${groupId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/messenger/groups'] });
      setMessage('');
      setReplyTo(null);
    },
  });

  useEffect(() => {
    if (isDemo || !groupId) return;
    joinGroupRoom(groupId);
    return () => leaveGroupRoom(groupId);
  }, [groupId, isDemo]);

  useEffect(() => {
    if (isDemo || !groupId) return;
    void fetch(`/api/messenger/groups/${groupId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).catch(() => undefined);
  }, [groupId, isDemo]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [displayMessages?.items]);

  const handleSend = () => {
    if (!message.trim()) return;
    if (isDemo) {
      setDemoMsgs((prev) => [...prev, { id: `demo-gmsg-${Date.now()}`, group_id: groupId, sender_id: 'me', kind: 'text', body: message, media_id: null, created_at: new Date().toISOString(), replyTo: replyTo ? { id: replyTo.id, body: replyTo.body, sender_id: replyTo.sender_id } : undefined }]);
      setMessage(''); setReplyTo(null); return;
    }
    sendMessageMutation.mutate({ body: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getDisplayName = (m: GroupMember) => m.user?.firstName && m.user?.lastName ? `${m.user.firstName} ${m.user.lastName}` : m.user?.email || 'Unknown';
  const isOwnerOrAdmin = group?.role === 'owner' || group?.role === 'admin';

  const handlePlusAction = (action: string) => {
    switch (action) {
      case 'media':
        setShowMediaPicker(true);
        break;
      case 'event':
        navigate('/events/create');
        break;
      case 'location':
        navigate(mapPath());
        break;
      case 'people':
        setShowGroupInfo(true);
        break;
      default:
        break;
    }
  };

  const t = getMessengerTheme(isDark);
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const msgAreaBg = t.msgAreaBg;
  const iconClr = t.iconMuted;
  const borderTop = t.border;
  const nameClr = t.title;
  const statusClr = t.sub;
  const actionBg = t.actionBg;
  const replyBarBg = t.replyBg;
  const replyAccent = t.replyAccent;
  const groupIconBg = t.avatarBg;
  const groupIconClr = t.avatarText;

  return (
    <div className="h-full flex flex-col" style={{ background: pageBg }} data-testid="group-chat">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${borderTop}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: actionBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} data-testid="button-back">
            <ArrowLeft size={17} color={iconClr} />
          </button>
          <div
            style={{ width: 38, height: 38, borderRadius: '50%', background: groupIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => setShowGroupInfo(true)}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: groupIconClr }}>{group?.name?.[0]?.toUpperCase() || 'G'}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => setShowGroupInfo(true)}>
            <p style={{ fontSize: 15, fontWeight: 600, color: nameClr, lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group?.name}</p>
            <p style={{ fontSize: 11, color: statusClr }}>{members?.length || 0} members{group?.role ? ` · ${group.role}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button data-testid="button-more" onClick={() => setShowGroupInfo(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: actionBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <MoreVertical size={17} color={iconClr} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ background: msgAreaBg, padding: '10px 14px 6px' }} data-testid="messages-container">
        {isLoading && !isDemo ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${t.accentSoft}`, borderTopColor: t.iconMuted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : displayMessages?.items?.length > 0 ? (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {displayMessages.items.map((msg: GroupMessage, index: number) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isFromMe={msg.sender_id === user?.id || msg.sender_id === 'me'}
                showAvatar={index === 0 || displayMessages.items[index - 1].sender_id !== msg.sender_id}
                userAvatar={msg.sender_id === user?.id || msg.sender_id === 'me' ? (user?.profileImageUrl ?? undefined) : undefined}
                userName={msg.sender_id === user?.id || msg.sender_id === 'me' ? 'You' : (msg as any).senderName || 'Group Member'}
                onReply={(m) => setReplyTo(m)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: groupIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Users size={24} color="#fff" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: nameClr, marginBottom: 4 }}>{group?.name}</p>
            <p style={{ fontSize: 13, color: statusClr }}>Start the group conversation!</p>
          </div>
        )}
      </div>

      {/* Overlays */}
      {showMediaPicker && <MediaPicker onMediaSelected={(id) => { sendMessageMutation.mutate({ mediaId: id }); setShowMediaPicker(false); }} onClose={() => setShowMediaPicker(false)} />}

      <ChatComposer
        message={message}
        onChange={setMessage}
        onSend={handleSend}
        onPlus={() => setShowPlus(true)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={SMART_PLACEHOLDERS[placeholderIdx]}
        isPending={sendMessageMutation.isPending}
        onCamera={() => setShowMediaPicker(true)}
        replyBar={
          replyTo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: replyBarBg, borderRadius: 12, padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: replyAccent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: replyAccent, marginBottom: 2 }}>Replying</p>
                <p style={{ fontSize: 12, color: statusClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{replyTo.body}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={14} color={statusClr} />
              </button>
            </div>
          ) : undefined
        }
      />

      {showPlus && (
        <PlusSheet
          isDark={isDark}
          onSelect={(a) => { setShowPlus(false); handlePlusAction(a); }}
          onClose={() => setShowPlus(false)}
        />
      )}

      {/* Group Info Modal */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent className="max-w-md mx-auto" data-testid="group-info-modal">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Group Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: groupIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{group?.name?.[0]?.toUpperCase() || 'G'}</span>
              </div>
              <h3 className="text-lg font-semibold">{group?.name}</h3>
              {group?.description && <p className="text-sm text-muted-foreground mt-1">{group.description}</p>}
            </div>
            {isOwnerOrAdmin && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 p-3 rounded-xl text-sm font-medium"
                  style={{ background: actionBg, border: 'none', cursor: 'pointer', color: nameClr }}
                  onClick={() => { setShowGroupInfo(false); navigate('/discover/people'); }}
                  data-testid="button-add-member"
                >
                  <UserPlus size={16} /> Add Member
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 p-3 rounded-xl text-sm font-medium"
                  style={{ background: actionBg, border: 'none', cursor: 'pointer', color: nameClr }}
                  onClick={() => { setShowGroupInfo(false); navigate('/settings'); }}
                  data-testid="button-group-settings"
                >
                  <Settings size={16} /> Settings
                </button>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-3">Members ({members?.length || 0})</p>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {members?.map((m: GroupMember) => (
                  <button
                    key={m.user_id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left"
                    style={{ background: actionBg, border: 'none', cursor: m.user_id === user?.id ? 'default' : 'pointer' }}
                    onClick={() => {
                      if (m.user_id === user?.id) return;
                      setShowGroupInfo(false);
                      navigate(m.user_id.startsWith('demo-') ? '/discover/people' : `/person/${m.user_id}`);
                    }}
                    data-testid={`member-${m.user_id}`}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: groupIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.user?.firstName?.[0] || m.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate" style={{ color: nameClr }}>
                          {getDisplayName(m)}{m.user_id === user?.id ? ' (You)' : ''}
                        </p>
                        {m.role === 'owner' && <Crown size={11} color="#f59e0b" />}
                        {m.role === 'admin' && <Shield size={11} color="rgba(167,139,250,0.8)" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
