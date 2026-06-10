import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fetchAdminUsers } from "@/lib/adminApi";
import { Search, Ban, CheckCircle, Download, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  verified: boolean;
  banned: boolean;
  bannedReason: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const limit = 50;

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery, page, limit],
    queryFn: () =>
      fetchAdminUsers({ query: searchQuery, limit, offset: page * limit }),
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/actions`, {
        userId,
        actionType: "user_banned",
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User banned successfully" });
      setBanDialogOpen(false);
      setBanReason("");
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to ban user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const openUserProfile = (userId: string) => {
    window.open(`/person/${userId}`, "_blank", "noopener,noreferrer");
  };

  const handleBan = (user: User) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const confirmBan = () => {
    if (!selectedUser || !banReason.trim()) {
      toast({ 
        title: "Invalid input", 
        description: "Please provide a ban reason",
        variant: "destructive" 
      });
      return;
    }
    banMutation.mutate({ userId: selectedUser.id, reason: banReason });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f3efe8]">User Management</h1>
          <p className="text-[#f3efe8]/60 mt-1">
            Manage users, verify accounts, and handle violations
          </p>
        </div>

        {/* Search & Filters */}
        <Card className="bg-[#2a0a2a] border-border">
          <CardHeader>
            <CardTitle className="text-[#f3efe8]">Search Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#f3efe8]/40" />
                <Input
                  placeholder="Search by username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#1a001a] border-border text-[#f3efe8]"
                  data-testid="input-search-users"
                />
              </div>
              <Button variant="outline" className="border-purple-500/30">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-[#2a0a2a] border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-muted/40" />
                ))}
              </div>
            ) : usersData?.users && usersData.users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#f3efe8]/70">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#f3efe8]/70">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#f3efe8]/70">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#f3efe8]/70">Joined</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[#f3efe8]/70">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {usersData.users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/40" data-testid={`row-user-${user.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#f3efe8]">{user.username || "Anonymous"}</div>
                        </td>
                        <td className="px-4 py-3 text-[#f3efe8]/70">{user.email || "N/A"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.banned && (
                              <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                                Banned
                              </Badge>
                            )}
                            {user.verified && (
                              <Badge className="bg-green-500/20 text-green-400">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#f3efe8]/70">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUserProfile(user.id)}
                              className="border-green-500/30 hover:bg-green-500/10"
                              data-testid={`button-view-${user.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            {!user.banned && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBan(user)}
                                className="border-red-500/30 hover:bg-red-500/10"
                                data-testid={`button-ban-${user.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[#f3efe8]/60">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-[#f3efe8]/30" />
                <p>No users found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ban Dialog */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="bg-[#2a0a2a] border-border">
            <DialogHeader>
              <DialogTitle className="text-[#f3efe8]">Ban User</DialogTitle>
              <DialogDescription className="text-[#f3efe8]/60">
                Provide a reason for banning {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter ban reason (minimum 10 characters)..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="bg-[#1a001a] border-border text-[#f3efe8]"
                rows={4}
                data-testid="input-ban-reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBanDialogOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBan}
                disabled={banMutation.isPending || !banReason.trim()}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-ban"
              >
                {banMutation.isPending ? "Banning..." : "Ban User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
