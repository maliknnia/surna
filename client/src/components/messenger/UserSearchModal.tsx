import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, UserPlus, X, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { searchUsers } from '@/lib/searchUsers';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (userId: string, userData?: any) => void;
}

interface UserRow {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  profileImageUrl?: string;
  bio?: string;
}

type Mode = 'direct' | 'group-pick' | 'group-name';

export default function UserSearchModal({ isOpen, onClose, onStartConversation }: UserSearchModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<Mode>('direct');
  const [selected, setSelected] = useState<UserRow[]>([]);
  const [groupName, setGroupName] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/search', 'users', searchQuery],
    queryFn: () => searchUsers<UserRow>(searchQuery),
    enabled: searchQuery.trim().length > 0,
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['/api/messenger/recent-users'],
    queryFn: async () => {
      const r = await fetch('/api/messenger/recent-users', { credentials: 'include' });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.users || []) as UserRow[];
    },
    enabled: isOpen && !searchQuery.trim(),
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('POST', '/api/messenger/groups', {
        name: groupName.trim(),
        memberIds: selected.map((u) => u.id),
      });
      return r.json();
    },
    onSuccess: (room: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messenger/groups'] });
      toast({ title: 'Group created', description: `${groupName} is ready` });
      handleClose();
      onStartConversation(room.id, { id: room.id, name: room.name, type: 'group' });
    },
    onError: () => toast({ title: 'Failed to create group', variant: 'destructive' }),
  });

  const handleClose = () => {
    setSearchQuery('');
    setSelected([]);
    setMode('direct');
    setGroupName('');
    onClose();
  };

  const toggleSelect = (u: UserRow) => {
    setSelected((prev) =>
      prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  };

  const displayUsers = (searchQuery.trim() ? searchResults : recentUsers) || [];
  const getDisplayName = (u: UserRow) =>
    u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || u.email;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto" data-testid="user-search-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-token-text flex items-center gap-2">
            {mode !== 'direct' && (
              <button
                onClick={() => mode === 'group-name' ? setMode('group-pick') : setMode('direct')}
                className="p-1 -ml-1 rounded-full hover:bg-token-text/5"
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {mode === 'direct' && 'New Message'}
            {mode === 'group-pick' && `New Group${selected.length ? ` · ${selected.length}` : ''}`}
            {mode === 'group-name' && 'Name your group'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'group-name' ? (
          <div className="space-y-4">
            <Input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              maxLength={120}
              data-testid="input-group-name"
            />
            <div className="flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span key={u.id} className="text-xs px-2 py-1 rounded-full bg-token-text/10 text-token-text">
                  {getDisplayName(u)}
                </span>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!groupName.trim() || createGroup.isPending}
              onClick={() => createGroup.mutate()}
              data-testid="button-confirm-create-group"
            >
              {createGroup.isPending ? 'Creating…' : `Create group with ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-token-text" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username"
                className="pl-9"
                data-testid="input-user-search"
              />
            </div>

            {mode === 'group-pick' && selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleSelect(u)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-token-accent/15 text-token-accent"
                    data-testid={`chip-${u.id}`}
                  >
                    {getDisplayName(u)} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto -mx-2">
              {isLoading ? (
                <div className="space-y-2 px-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : displayUsers.length > 0 ? (
                displayUsers.map((u: UserRow) => {
                  const checked = selected.some((s) => s.id === u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-2 py-2 hover:bg-token-text/5 rounded-lg cursor-pointer"
                      onClick={() => {
                        if (mode === 'group-pick') {
                          toggleSelect(u);
                        } else {
                          onStartConversation(u.id, u);
                          handleClose();
                        }
                      }}
                      data-testid={`user-row-${u.id}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.profileImageUrl} />
                        <AvatarFallback>{getDisplayName(u)[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-token-text truncate">{getDisplayName(u)}</div>
                        {u.username && <div className="text-xs text-token-text-muted truncate">@{u.username}</div>}
                      </div>
                      {mode === 'group-pick' ? (
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          checked ? 'bg-token-accent border-token-accent' : 'border-token-text/30'
                        }`}>
                          {checked && <Check className="h-3 w-3 text-foreground" />}
                        </div>
                      ) : (
                        <MessageCircle className="h-4 w-4 text-token-text-muted" />
                      )}
                    </div>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="text-center py-8">
                  <p className="text-token-text text-sm font-medium">No users found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 mx-auto text-token-text mb-2" />
                  <p className="text-token-text text-sm">
                    {mode === 'group-pick' ? 'Search to add people' : 'Search to start a conversation'}
                  </p>
                </div>
              )}
            </div>

            {mode === 'group-pick' ? (
              <Button
                className="w-full"
                disabled={selected.length < 1}
                onClick={() => setMode('group-name')}
                data-testid="button-next-name-group"
              >
                Next ({selected.length} selected)
              </Button>
            ) : (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => { setMode('group-pick'); setSearchQuery(''); }}
                  className="w-full justify-start text-left p-3 hover:bg-token-text/5 border border-border"
                  data-testid="button-create-group-chat"
                >
                  <div className="w-10 h-10 bg-token-accent/15 text-token-accent rounded-full flex items-center justify-center mr-3">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-token-text">Create Group Chat</p>
                    <p className="text-xs text-token-text-muted">Pick people to start a group conversation</p>
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
