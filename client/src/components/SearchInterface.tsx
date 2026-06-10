import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Trophy, MapPin, Calendar } from "lucide-react";
import { useDebounce } from "@/lib/performance";
import type { User, Team, EventWithOrganizer } from "@shared/schema";

interface SearchResults {
  users: User[];
  teams: Team[];
  events: EventWithOrganizer[];
}

interface SearchInterfaceProps {
  onUserClick: (user: User) => void;
  onTeamClick: (team: Team) => void;
  onEventClick: (event: EventWithOrganizer) => void;
}

export default function SearchInterface({ onUserClick, onTeamClick, onEventClick }: SearchInterfaceProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ users: [], teams: [], events: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'teams' | 'events'>('all');

  // Use debounced search for better performance
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch();
    } else {
      setResults({ users: [], teams: [], events: [] });
    }
  }, [debouncedQuery, activeTab]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=${activeTab === 'all' ? '' : activeTab}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeTab]);

  const renderUserResult = (user: User) => (
    <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onUserClick(user)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
            <p className="text-sm text-token-text">{user.email}</p>
          </div>
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            User
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeamResult = (team: Team) => (
    <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTeamClick(team)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              <Users className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium">{team.name}</h3>
            <div className="flex items-center gap-4 text-sm text-token-text">
              <span>{team.sport}</span>
              <span>{team.currentMembers} members</span>
            </div>
          </div>
          <Badge variant="outline">
            <Trophy className="w-3 h-3 mr-1" />
            Team
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderEventResult = (event: EventWithOrganizer) => (
    <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onEventClick(event)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              <Calendar className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium">{event.title}</h3>
            <div className="flex items-center gap-4 text-sm text-token-text">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
              <span>{event.sport}</span>
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
            </div>
          </div>
          <Badge variant="outline">
            <Calendar className="w-3 h-3 mr-1" />
            Event
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Search input */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-token-text" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for users, teams, or events..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Search tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'users', label: 'Users' },
              { key: 'teams', label: 'Teams' },
              { key: 'events', label: 'Events' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={activeTab === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(key as any)}
                className={activeTab === key ? "bg-background text-token-text" : ""}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Results */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-token-text">Searching...</p>
          </CardContent>
        </Card>
      )}

      {!loading && query.length >= 2 && (
        <div className="space-y-4">
          {/* Users */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.users.map(renderUserResult)}
              </CardContent>
            </Card>
          )}

          {/* Teams */}
          {(activeTab === 'all' || activeTab === 'teams') && results.teams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.teams.map(renderTeamResult)}
              </CardContent>
            </Card>
          )}

          {/* Events */}
          {(activeTab === 'all' || activeTab === 'events') && results.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.events.map(renderEventResult)}
              </CardContent>
            </Card>
          )}

          {/* No results */}
          {results.users.length === 0 && results.teams.length === 0 && results.events.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-token-text">No results found for "{query}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {query.length > 0 && query.length < 2 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-token-text">Type at least 2 characters to search</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}