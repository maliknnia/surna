import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, X, Plus, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { searchUsers } from '@/lib/searchUsers';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string, groupData: any) => void;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  profileImageUrl?: string;
}

export default function CreateGroupModal({ 
  isOpen, 
  onClose, 
  onGroupCreated 
}: CreateGroupModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<'details' | 'members'>('details');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);

  // Search users for group members
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/search', 'users', searchQuery],
    queryFn: () => searchUsers<User>(searchQuery),
    enabled: searchQuery.trim().length > 0,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      memberIds: string[];
    }) => {
      const response = await apiRequest('POST', '/api/messenger/groups', {
        name: data.name,
        description: data.description,
        memberIds: data.memberIds,
      });
      if (!response.ok) throw new Error('Failed to create group');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messenger/groups'] });
      onGroupCreated(data.id, data);
      handleClose();
    },
  });

  const handleClose = () => {
    setStep('details');
    setGroupName('');
    setGroupDescription('');
    setSearchQuery('');
    setSelectedMembers([]);
    onClose();
  };

  const handleAddMember = (member: User) => {
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers(prev => [...prev, member]);
    }
    setSearchQuery('');
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleNext = () => {
    if (step === 'details' && groupName.trim()) {
      setStep('members');
    }
  };

  const handleBack = () => {
    setStep('details');
  };

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroupMutation.mutate({
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedMembers.map(m => m.id),
      });
    }
  };

  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const canCreateGroup = groupName.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto" data-testid="create-group-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-token-text">
            {step === 'details' ? 'Create Group' : 'Add Members'}
          </DialogTitle>
        </DialogHeader>

        {step === 'details' ? (
          <div className="space-y-4">
            {/* Group Avatar Placeholder */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-transparent border border-border rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-token-text" />
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-token-text mb-2">
                Group Name *
              </label>
              <Input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-transparent border border-border  focus:bg-transparent border border-border"
                maxLength={50}
                autoFocus
                data-testid="input-group-name"
              />
              <p className="text-xs text-token-text mt-1">
                {groupName.length}/50 characters
              </p>
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-token-text mb-2">
                Description
              </label>
              <Textarea
                placeholder="Describe what this group is about (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="bg-transparent border border-border  focus:bg-transparent border border-border resize-none"
                rows={3}
                maxLength={200}
                data-testid="input-group-description"
              />
              <p className="text-xs text-token-text mt-1">
                {groupDescription.length}/200 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canCreateGroup}
                className="flex-1 bg-background text-token-text hover:bg-transparent border border-border"
                data-testid="button-next"
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-token-text mb-2">
                  Selected Members ({selectedMembers.length})
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedMembers.map((member) => (
                    <Badge
                      key={member.id}
                      variant="secondary"
                      className="flex items-center space-x-1 px-2 py-1"
                      data-testid={`selected-member-${member.id}`}
                    >
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={member.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{getDisplayName(member)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-0 h-auto w-auto ml-1"
                        data-testid={`button-remove-${member.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Members */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-token-text" />
              <Input
                type="text"
                placeholder="Search people to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border border-border  focus:bg-transparent border border-border"
                data-testid="input-member-search"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6  "></div>
                </div>
              ) : (searchResults?.length ?? 0) > 0 ? (
                <div className="space-y-1">
                  {(searchResults ?? []).map((user: User) => {
                    const isSelected = selectedMembers.find(m => m.id === user.id);
                    const isCurrentUser = user.id === user?.id;
                    
                    if (isCurrentUser) return null;
                    
                    return (
                      <div
                        key={user.id}
                        onClick={() => !isSelected && handleAddMember(user)}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer",
                          isSelected 
                            ? "bg-transparent border border-border cursor-not-allowed" 
                            : "hover:bg-transparent border border-border"
                        )}
                        data-testid={`user-result-${user.id}`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profileImageUrl} alt={getDisplayName(user)} />
                          <AvatarFallback className="bg-transparent border border-border text-token-text">
                            {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-token-text truncate">
                            {getDisplayName(user)}
                          </p>
                          <p className="text-xs text-token-text truncate">
                            {user.email}
                          </p>
                        </div>
                        
                        {isSelected ? (
                          <Check className="h-5 w-5 text-[#efe7e9]" />
                        ) : (
                          <Plus className="h-5 w-5 text-token-text" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center py-8">
                  <p className="text-token-text text-sm">No users found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-token-text text-sm">Search for people to add</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex-1"
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending}
                className="flex-1 bg-background text-token-text hover:bg-transparent border border-border"
                data-testid="button-create"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}