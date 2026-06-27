import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { MessageCircle, Users, Search, Plus, Edit, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import ConversationList from './ConversationList';
import DMChat from './DMChat';
import GroupChat from './GroupChat';
import CreateGroupModal from './CreateGroupModal';
import UserSearchModal from './UserSearchModal';
import { getMessengerTheme } from './messengerTheme';
import { EntitySectionTabs } from '@/components/entity';
import { apiRequest } from '@/lib/queryClient';
import { useMessengerRealtime } from '@/hooks/useMessengerRealtime';

interface MessengerAppProps {
  onClose?: () => void;
  isPage?: boolean;
}

export default function MessengerApp({ onClose, isPage = false }: MessengerAppProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [, setLocation] = useLocation();
  const t = getMessengerTheme(isDark);
  const [selectedTab, setSelectedTab]           = useState<'dm' | 'groups'>('dm');
  const [selectedConversation, setSelectedConversation] = useState<{ type: 'dm' | 'group'; id: string; data?: any } | null>(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [showUserSearch, setShowUserSearch]     = useState(false);
  const [showCreateGroup, setShowCreateGroup]   = useState(false);

  useMessengerRealtime(true);

  useEffect(() => { setSelectedConversation(null); }, [selectedTab]);

  useEffect(() => {
    if (!isPage) return;
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("groupId") || params.get("group");
    if (groupId) {
      setSelectedTab("groups");
      setSelectedConversation({ type: "group", id: groupId });
      return;
    }
    const peerId = params.get("userId") || params.get("user");
    if (peerId) {
      setSelectedTab("dm");
      setSelectedConversation({ type: "dm", id: peerId });
      return;
    }

    const context = params.get("context");
    const teamId = params.get("id");
    const eventId = params.get("eventId");
    const placeId = params.get("placeId");

    if (context === "team" && teamId) {
      void (async () => {
        try {
          const instant = await fetch(`/api/instant-teams/${teamId}`, { credentials: "include" });
          if (instant.ok) {
            const data = await instant.json();
            const gid = data.messengerGroupId ?? data.messenger_group_id;
            if (gid) {
              setSelectedTab("groups");
              setSelectedConversation({ type: "group", id: String(gid) });
              return;
            }
          }
        } catch {
          /* fall through */
        }
        setLocation(`/teams/${teamId}#chat`);
      })();
      return;
    }

    if (eventId) {
      void (async () => {
        try {
          const ev = await fetch(`/api/events/${eventId}`, { credentials: "include" });
          if (ev.ok) {
            const data = await ev.json();
            const gid = data.chat_group_id ?? data.chatGroupId;
            if (gid) {
              setSelectedTab("groups");
              setSelectedConversation({ type: "group", id: String(gid) });
              return;
            }
          }
          const group = (await apiRequest("POST", "/api/messenger/groups", {
            name: "Event chat",
            eventId,
          })) as { id?: string };
          if (group?.id) {
            setSelectedTab("groups");
            setSelectedConversation({ type: "group", id: group.id });
          }
        } catch {
          /* ignore */
        }
      })();
      return;
    }

    if (context === "place" && placeId) {
      setLocation(`/places/${placeId}`);
    }
  }, [isPage, setLocation]);

  const handleStartConversation = (userId: string, userData?: any) => {
    if (userData?.type === 'group') {
      setSelectedTab('groups');
      setSelectedConversation({ type: 'group', id: userId, data: userData });
    } else {
      setSelectedTab('dm');
      setSelectedConversation({ type: 'dm', id: userId, data: userData });
    }
    setShowUserSearch(false);
  };

  const handleSelectConversation = (type: 'dm' | 'group', id: string, data?: any) => {
    setSelectedConversation({ type, id, data });
  };

  if (selectedConversation) {
    return (
      <div className="h-full flex flex-col min-h-0" style={{ background: t.pageBg }} data-testid="messenger-conversation-view">
        {selectedConversation.type === 'dm' ? (
          <DMChat peerId={selectedConversation.id} userData={selectedConversation.data} onBack={() => setSelectedConversation(null)} />
        ) : (
          <GroupChat groupId={selectedConversation.id} groupData={selectedConversation.data} onBack={() => setSelectedConversation(null)} />
        )}
      </div>
    );
  }

  const shellMax = isPage ? 480 : undefined;

  return (
    <div className={`flex flex-col min-h-0${isPage ? ' h-screen' : ' h-full'}`} style={{ background: t.pageBg }} data-testid="messenger-app">
      <header
        className="surna-header sticky top-0 z-50 shrink-0"
        style={{ borderBottom: `0.5px solid ${t.border}` }}
      >
        <div
          className="px-4 pt-3 pb-2"
          style={{ maxWidth: shellMax, margin: isPage ? '0 auto' : undefined }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {isPage && (
                <Link href="/">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    style={{ background: t.actionBg }}
                    aria-label="Back to home"
                    data-testid="button-home"
                  >
                    <ArrowLeft className="w-4 h-4" style={{ color: t.icon }} />
                  </button>
                </Link>
              )}
              <div className="min-w-0">
                <h1 className="surna-header-title text-base font-black tracking-tight truncate" style={{ color: t.title }}>
                  Messages
                </h1>
                <p className="text-xs truncate" style={{ color: t.sub }}>
                  {isPage ? 'Chats with athletes and teams' : (user?.firstName || user?.email || '')}
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform md:hidden"
                  style={{ background: t.actionBg, border: 'none', cursor: 'pointer' }}
                  data-testid="button-back"
                >
                  <X size={16} style={{ color: t.icon }} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowUserSearch(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ background: t.actionBg, border: 'none', cursor: 'pointer' }}
                data-testid="button-new-message"
              >
                <Edit size={16} style={{ color: t.icon }} />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search
              size={15}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.iconMuted, pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full text-sm outline-none box-border"
              style={{
                background: t.searchBg,
                border: `1px solid ${t.searchBorder}`,
                paddingLeft: 36,
                paddingRight: 14,
                color: t.searchText,
              }}
              data-testid="input-search"
            />
          </div>

          <EntitySectionTabs
            tabs={[
              { id: 'dm', label: 'Direct' },
              { id: 'groups', label: 'Groups' },
            ]}
            activeId={selectedTab}
            onChange={(id) => setSelectedTab(id as 'dm' | 'groups')}
            stickyTop="top-[7.5rem]"
            testIdPrefix="messenger-tab"
          />
        </div>
      </header>

      {selectedTab === 'groups' && (
        <div className="px-4 pt-2 shrink-0" style={{ maxWidth: shellMax, margin: isPage ? '0 auto' : undefined, width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="w-full h-10 rounded-full border-none flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background: t.primaryBtn, color: t.primaryBtnText }}
            data-testid="button-create-group"
          >
            <Plus size={16} /> Create group
          </button>
        </div>
      )}

      <div
        className="flex-1 overflow-hidden flex flex-col min-h-0"
        style={{ maxWidth: shellMax, margin: isPage ? '0 auto' : undefined, width: '100%' }}
      >
        <ConversationList
          type={selectedTab === 'dm' ? 'dm' : 'groups'}
          searchQuery={searchQuery}
          onSelect={(id, data) => handleSelectConversation(selectedTab === 'dm' ? 'dm' : 'group', id, data)}
          onCompose={() => setShowUserSearch(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      </div>

      <UserSearchModal isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} onStartConversation={handleStartConversation} />
      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} onGroupCreated={(id, data) => handleSelectConversation('group', id, data)} />
    </div>
  );
}
