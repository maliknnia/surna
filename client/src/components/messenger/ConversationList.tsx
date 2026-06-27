import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { getMessengerTheme } from './messengerTheme';
import { EntityEmptyState, EntityListSkeleton } from '@/components/entity';
import {
  DEMO_DM_CONVERSATIONS,
  DEMO_GROUP_CONVERSATIONS,
  shouldShowMessengerDemos,
} from './demoData';

interface ConversationListProps {
  type: 'dm' | 'groups';
  searchQuery: string;
  onSelect: (id: string, data?: any) => void;
  onCompose?: () => void;
  onCreateGroup?: () => void;
}

function timeAgo(dateString: string) {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateString).toLocaleDateString();
}

export default function ConversationList({
  type,
  searchQuery,
  onSelect,
  onCompose,
  onCreateGroup,
}: ConversationListProps) {
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
    const api = conversations || [];
    if (searchQuery.trim()) return api;
    if (shouldShowMessengerDemos(api.length)) {
      const demos = isDm ? DEMO_DM_CONVERSATIONS : DEMO_GROUP_CONVERSATIONS;
      const apiIds = new Set(api.map((c: { id: string }) => String(c.id)));
      const extras = demos.filter((d) => !apiIds.has(d.id));
      return [...api, ...extras];
    }
    return api;
  }, [conversations, isDm, searchQuery]);

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
      <div className="flex-1 px-2 pt-2" data-testid="conversation-list-loading">
        <EntityListSkeleton rows={6} rowHeight={72} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="conversation-list-empty">
        <EntityEmptyState
          icon={isDm ? MessageCircle : Users}
          title={searchQuery ? 'No results' : isDm ? 'No messages yet' : 'No groups yet'}
          description={
            searchQuery
              ? 'Try a different name or email.'
              : isDm
                ? 'Message athletes, coaches, and sellers from their profile — or start a new chat here.'
                : 'Groups auto-create for events and pickup teams. You can also start your own crew chat.'
          }
          actionLabel={
            searchQuery ? undefined : isDm ? (onCompose ? 'New message' : undefined) : (onCreateGroup ? 'Create group' : undefined)
          }
          onAction={searchQuery ? undefined : isDm ? onCompose : onCreateGroup}
          compact
        />
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
