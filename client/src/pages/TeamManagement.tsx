import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Users, 
  Settings, 
  BarChart3, 
  Calendar,
  Trophy,
  MessageSquare,
  UserPlus,
  Crown,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Camera,
  Plus,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Team, User, Event } from "@shared/schema";

interface TeamWithDetails extends Team {
  memberCount: number;
  recentActivity: number;
  upcomingEvents: number;
  achievements: number;
}

interface TeamMember {
  id: string;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'captain' | 'co-captain';
  joinedAt: string;
  lastActive: string;
  permissions: string[];
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  eventsThisMonth: number;
  winRate: number;
  avgAttendance: number;
  memberGrowth: number;
}

export default function TeamManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Get user's teams (teams they own or are admin of)
  const { data: managedTeams, isLoading: teamsLoading } = useQuery<TeamWithDetails[]>({
    queryKey: ["/api/teams/me/managed"],
  });

  // Get team details for selected team
  const { data: teamDetails } = useQuery<TeamWithDetails>({
    queryKey: ["/api/teams", selectedTeam],
    enabled: !!selectedTeam,
  });

  // Get team members
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", selectedTeam, "members"],
    enabled: !!selectedTeam,
  });

  // Get team statistics
  const { data: teamStats } = useQuery<TeamStats>({
    queryKey: ["/api/teams", selectedTeam, "stats"],
    enabled: !!selectedTeam,
  });

  // Get team events
  const { data: teamEvents } = useQuery<Event[]>({
    queryKey: ["/api/teams", selectedTeam, "events"],
    enabled: !!selectedTeam,
  });

  // Invite member mutation
  const inviteMember = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", `/api/teams/${selectedTeam}/invite`, { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Team invitation has been sent successfully.",
      });
      setShowInviteDialog(false);
      setInviteEmail("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/teams/${selectedTeam}/members/${memberId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Team member has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam, "members"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Change member role mutation
  const changeMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return apiRequest("PUT", `/api/teams/${selectedTeam}/members/${memberId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam, "members"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate(inviteEmail);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'captain':
        return <Crown className="w-4 h-4 text-token-text" />;
      case 'co-captain':
        return <Star className="w-4 h-4 text-token-text" />;
      case 'admin': return <Shield className="w-4 h-4 text-token-text" />;
      default: return <Users className="w-4 h-4 text-token-text" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
      case 'captain':
        return "default";
      case 'co-captain':
      case 'admin': return "secondary";
      default: return "outline";
    }
  };

  const markAttendance = useMutation({
    mutationFn: async (memberUserId: string) => {
      return apiRequest("POST", `/api/teams/${selectedTeam}/members/${memberUserId}/attendance`);
    },
    onSuccess: () => {
      toast({ title: "Attendance recorded" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam, "members"] });
    },
    onError: () => {
      toast({ title: "Couldn't record attendance", variant: "destructive" });
    },
  });

  if (teamsLoading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 rounded-full bg-gradient-to-r from-background to-token-accent" />
          </div>
        </div>
      </div>
    );
  }

  if (!managedTeams || managedTeams.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-token-text mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Teams to Manage</h3>
              <p className="text-token-text mb-6">
                You don't have any teams to manage yet. Create a team to get started!
              </p>
              <Button
                onClick={() => setLocation("/teams")}
                className="bg-transparent border border-border text-token-text hover:bg-background"
              >
                <Users className="w-4 h-4 mr-2" />
                Go to Teams
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-token-text">Team Management</h1>
            <p className="text-token-text">
              Manage your teams, members, and activities
            </p>
          </div>
          <Button
            onClick={() => setLocation("/teams")}
            variant="outline"
          >
            <Users className="w-4 h-4 mr-2" />
            View All Teams
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Teams Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Teams</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {managedTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full p-3 text-left hover:bg-transparent border border-border transition-colors ${
                        selectedTeam === team.id ? "bg-transparent border border-border" : ""
                      }`}
                      data-testid={`team-select-${team.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-transparent border border-border rounded-lg flex items-center justify-center text-token-text font-semibold">
                          {team.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-token-text truncate">
                            {team.name}
                          </p>
                          <p className="text-sm text-token-text">
                            {team.memberCount} members
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedTeam ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-token-text mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select a Team</h3>
                  <p className="text-token-text">
                    Choose a team from the sidebar to view its management dashboard.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-token-text" />
                          <span className="text-sm font-medium text-token-text">Total Members</span>
                        </div>
                        <p className="text-2xl font-bold text-token-text mt-1">
                          {teamStats?.totalMembers || 0}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-token-text" />
                          <span className="text-sm font-medium text-token-text">Events This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-token-text mt-1">
                          {teamStats?.eventsThisMonth || 0}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-5 h-5 text-token-text" />
                          <span className="text-sm font-medium text-token-text">Win Rate</span>
                        </div>
                        <p className={cn(
                          "text-2xl font-bold mt-1",
                          (teamStats?.winRate || 0) > 50 ? "text-green-500" : 
                          (teamStats?.winRate || 0) < 50 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {teamStats?.winRate || 0}%
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5 text-token-text" />
                          <span className="text-sm font-medium text-token-text">Avg Attendance</span>
                        </div>
                        <p className="text-2xl font-bold text-token-text mt-1">
                          {teamStats?.avgAttendance || 0}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <MessageSquare className="w-5 h-5" />
                          <span>Recent Activity</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-token-text rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium">New member joined</p>
                              <p className="text-xs text-token-text">2 hours ago</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-token-text rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium">Event "Weekly Practice" created</p>
                              <p className="text-xs text-token-text">1 day ago</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-token-text rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium">Team achievements updated</p>
                              <p className="text-xs text-token-text">3 days ago</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5" />
                          <span>Upcoming Events</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {teamEvents?.slice(0, 3).map((event, index) => (
                            <div key={event.id} className="flex items-center justify-between p-2 bg-transparent border border-border rounded">
                              <div>
                                <p className="font-medium text-sm">{event.title}</p>
                                <p className="text-xs text-token-text">
                                  {new Date((event as any).startDate || (event as any).eventDate).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {(event as any).attendeeCount || 0} attending
                              </Badge>
                            </div>
                          )) || (
                            <p className="text-sm text-token-text text-center py-4">
                              No upcoming events
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Members Tab */}
                <TabsContent value="members">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <Users className="w-5 h-5" />
                          <span>Team Members ({teamMembers?.length || 0})</span>
                        </CardTitle>
                        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="invite-member-button">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Invite Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Invite Team Member</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Email Address</label>
                                <input
                                  type="email"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  placeholder="Enter email address"
                                  className="w-full p-2 bg-transparent border border-border rounded-md"
                                  data-testid="invite-email-input"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={handleInviteMember}
                                  disabled={inviteMember.isPending}
                                  className="flex-1"
                                  data-testid="send-invite-button"
                                >
                                  {inviteMember.isPending ? "Sending..." : "Send Invitation"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowInviteDialog(false)}
                                  data-testid="cancel-invite-button"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamMembers?.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 bg-transparent border border-border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={member.user.profileImageUrl || ""} />
                                <AvatarFallback>
                                  {member.user.firstName?.charAt(0)}{member.user.lastName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">
                                    {member.user.firstName} {member.user.lastName}
                                  </p>
                                  {getRoleIcon(member.role)}
                                </div>
                                <p className="text-sm text-token-text">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant={getRoleBadgeVariant(member.role)}>
                                {member.role}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`member-actions-${member.id}`}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {member.role !== 'owner' && member.role !== 'captain' && (
                                    <>
                                      <DropdownMenuItem onClick={() => changeMemberRole.mutate({ memberId: member.id, role: 'captain' })}>
                                        <Crown className="w-4 h-4 mr-2" />
                                        Make Captain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => changeMemberRole.mutate({ memberId: member.id, role: 'co-captain' })}>
                                        <Star className="w-4 h-4 mr-2" />
                                        Make Co-Captain
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => changeMemberRole.mutate({ memberId: member.id, role: 'admin' })}>
                                        <Shield className="w-4 h-4 mr-2" />
                                        Make Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => changeMemberRole.mutate({ memberId: member.id, role: 'member' })}>
                                        <Users className="w-4 h-4 mr-2" />
                                        Make Member
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => markAttendance.mutate(member.user.id)}>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Mark attendance
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => removeMember.mutate(member.id)}
                                        className="text-token-text"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove Member
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )) || (
                          <p className="text-center text-token-text py-8">
                            No members found
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5" />
                          <span>Team Events</span>
                        </CardTitle>
                        <Button onClick={() => setLocation("/events")}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Event
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamEvents?.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date((event as any).startDate || (event as any).eventDate).toLocaleDateString()} • {event.location}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">
                                {(event as any).attendeeCount || 0} attending
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )) || (
                          <p className="text-center text-muted-foreground py-8">
                            No events found
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Member Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>This Month</span>
                              <span className={cn(
                                "font-medium",
                                (teamStats?.memberGrowth || 0) > 0 ? "text-green-500" : 
                                (teamStats?.memberGrowth || 0) < 0 ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {(teamStats?.memberGrowth || 0) > 0 ? "+" : ""}{teamStats?.memberGrowth || 0}
                              </span>
                            </div>
                            <Progress value={(teamStats?.memberGrowth || 0) * 10} className="mt-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Active Members</span>
                              <span className="font-medium">{teamStats?.activeMembers || 0}</span>
                            </div>
                            <Progress value={(teamStats?.activeMembers || 0) / (teamStats?.totalMembers || 1) * 100} className="mt-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Event Participation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-token-text">{teamStats?.avgAttendance || 0}%</p>
                            <p className="text-sm text-muted-foreground">Average Attendance</p>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-xl font-semibold">{teamStats?.eventsThisMonth || 0}</p>
                              <p className="text-xs text-muted-foreground">Events This Month</p>
                            </div>
                            <div>
                              <p className={cn(
                                "text-xl font-semibold",
                                (teamStats?.winRate || 0) > 50 ? "text-green-500" : 
                                (teamStats?.winRate || 0) < 50 ? "text-destructive" : "text-muted-foreground"
                              )}>{teamStats?.winRate || 0}%</p>
                              <p className="text-xs text-muted-foreground">Win Rate</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5" />
                        <span>Team Settings</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">Team Information</h4>
                        <div className="space-y-3">
                          <Button variant="outline" className="justify-start">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Team Details
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <Camera className="w-4 h-4 mr-2" />
                            Change Team Photo
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Permissions</h4>
                        <div className="space-y-3">
                          <Button variant="outline" className="justify-start">
                            <Shield className="w-4 h-4 mr-2" />
                            Manage Roles & Permissions
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <FileText className="w-4 h-4 mr-2" />
                            Privacy Settings
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 text-token-text">Danger Zone</h4>
                        <Button variant="destructive" className="justify-start">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Team
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}