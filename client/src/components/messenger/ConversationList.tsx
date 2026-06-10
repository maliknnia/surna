import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { DEMO_DM_CONVERSATIONS, DEMO_GROUP_CONVERSATIONS, shouldShowMessengerDemos } from './demoData';
import { getMessengerTheme } from './messengerTheme';

interface ConversationListProps {
  type: 'dm' | 'groups';
  searchQuery: string;
  onSelect: (id: string, data?: any) => void;
}

function timeAgo(dateString: string) {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateString).toLocaleDateString();
}

function SkeletonRow({ isDark }: { isDark: boolean }) {
  const bg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 13, borderRadius: 6, background: bg, marginBottom: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ width: '65%', height: 11, borderRadius: 6, background: bg, animation: 'pulse 1.4s ease-in-out infinite 0.1s' }} />
      </div>
    </div>
  );
}

export default function ConversationList({ type, searchQuery, onSelect }: ConversationListProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isDm = type === 'dm';

  const { data: conversations, isLoading } = useQuery({
    queryKey: isDm ? ['/api/messenger/dm/conversations'] : ['/api/messenger/groups'],
    queryFn: async () => {
      const url = isDm ? '/api/messenger/dm/conversations' : '/api/messenger/groups';
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch conversations');
      const data = await r.json();
      return isDm ? data.conversations : data.groups;
    },
  });

  const allConversations = useMemo(() => {
    const real = conversations || [];
    if (!shouldShowMessengerDemos(real.length)) return real;
    const demos = isDm ? DEMO_DM_CONVERSATIONS : DEMO_GROUP_CONVERSATIONS;
    const realIds = new Set(real.map((c: { id: string }) => c.id));
    return [...real, ...demos.filter((d) => !realIds.has(d.id))];
  }, [conversations, isDm]);

  const filtered = allConversations?.filter((conv: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (isDm) {
      return conv.other_user?.firstName?.toLowerCase().includes(q) ||
        conv.other_user?.lastName?.toLowerCase().includes(q) ||
        conv.other_user?.email?.toLowerCase().includes(q);
    }
    return conv.name?.toLowerCase().includes(q) || conv.description?.toLowerCase().includes(q);
  }) || [];

  const t = getMessengerTheme(isDark);

  if (isLoading) {
    return (
      <div className="flex-1" data-testid="conversation-list-loading">
        {[...Array(6)].map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" data-testid="conversation-list-empty">
        <div className="text-center max-w-xs">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: t.actionBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {isDm ? <MessageCircle size={28} style={{ color: t.iconMuted }} /> : <Users size={28} style={{ color: t.iconMuted }} />}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: t.title, marginBottom: 4 }}>
            {searchQuery ? 'No results' : isDm ? 'No messages yet' : 'No groups yet'}
          </p>
          <p style={{ fontSize: 13, color: t.sub, lineHeight: 1.45 }}>
            {searchQuery
              ? 'Try a different name or email'
              : isDm
                ? 'Tap the compose button to start a conversation with an athlete or coach.'
                : 'Create a group to plan events, share updates, and stay in sync.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="conversation-list">
      {filtered.map((conv: any) => {
        const name = isDm
          ? (conv.other_user?.firstName && conv.other_user?.lastName
            ? `${conv.other_user.firstName} ${conv.other_user.lastName}`
            : conv.other_user?.email || 'Unknown')
          : conv.name;
        const avatar = isDm ? conv.other_user?.profileImageUrl : null;
        const initials = isDm
          ? (conv.other_user?.firstName?.[0] || conv.other_user?.email?.[0]?.toUpperCase() || 'U')
          : (conv.name?.[0]?.toUpperCase() || 'G');
        const preview = conv.last_message
          ? (conv.last_message.kind === 'audio'
            ? 'Voice message'
            : (conv.last_message.sender_id === user?.id ? `You: ${conv.last_message.body}` : conv.last_message.body))
          : 'No messages yet';
        const ts = conv.last_message_at || conv.created_at;
        const unread = conv.unread_count || 0;

        return (
          <div
            key={conv.id}
            onClick={() => {
              if (isDm) {
                const peerId = conv.other_user?.id;
                if (!peerId) return;
                onSelect(peerId, conv);
              } else {
                onSelect(conv.id, conv);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', transition: 'background 120ms ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.rowHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            data-testid={`conversation-item-${conv.id}`}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${t.border}` }}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.avatarBg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: t.avatarText }}>{initials}</span>
                </div>
              )}
              {!isDm && conv.member_count ? (
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: t.unreadBg, borderRadius: 8, padding: '1px 5px', border: `1.5px solid ${isDark ? '#000' : '#fff'}` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{conv.member_count}</span>
                </div>
              ) : null}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 600, color: t.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </p>
                <span style={{ fontSize: 11, color: unread > 0 ? t.unreadBg : t.iconMuted, flexShrink: 0, fontWeight: unread > 0 ? 600 : 400 }}>
                  {timeAgo(ts)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 13, color: unread > 0 ? t.title : t.sub, fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, opacity: unread > 0 ? 0.9 : 0.75 }}>
                  {preview}
                </p>
                {unread > 0 && (
                  <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: t.unreadBg, color: t.unreadText, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
                    {unread > 99 ? '99+' : unread}
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
