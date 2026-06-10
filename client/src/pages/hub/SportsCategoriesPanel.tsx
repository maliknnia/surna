import { useState } from "react";
import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SportIcon } from "@/components/SportIcons";
import type { Team, Event, CoachWithUser } from "@shared/schema";

const sportsCategories = [
  { key: "all", label: "All Sports", icon: Trophy },
  { key: "football", label: "Football", sport: "football" as const },
  { key: "basketball", label: "Basketball", sport: "basketball" as const },
  { key: "tennis", label: "Tennis", sport: "tennis" as const },
  { key: "soccer", label: "Soccer", sport: "soccer" as const },
  { key: "volleyball", label: "Volleyball", sport: "volleyball" as const },
  { key: "swimming", label: "Swimming", sport: "swimming" as const },
  { key: "running", label: "Running", sport: "running" as const },
  { key: "boxing", label: "Boxing", sport: "boxing" as const },
  { key: "weightlifting", label: "Gym", sport: "weightlifting" as const }
];

export default function SportsCategoriesPanel() {
  const [selectedSport, setSelectedSport] = useState("all");

  // Fetch data for stats
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: coaches = [] } = useQuery<CoachWithUser[]>({
    queryKey: ["/api/coaches"],
  });

  const getSportStats = (sportKey: string) => {
    if (sportKey === 'football') return '12 teams';
    if (sportKey === 'basketball') return '8 events';
    if (sportKey === 'tennis') return '5 coaches';
    return '6 activities';
  };

  return (
    <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-2">
      {/* Compact Header */}
      <div className="text-center mb-3">
        <h1 className="text-sm font-bold text-foreground mb-1">Sports</h1>
        <p className="text-xs text-muted-foreground mb-2">Find your community</p>
      </div>

      {/* Horizontal Sports Filter Bar */}
      <div className="mb-4 -mx-2 px-2">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x snap-mandatory">
          {sportsCategories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedSport(category.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 snap-center transition-all ${
                selectedSport === category.key
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-transparent border border-border text-foreground hover:bg-muted/40'
              }`}
              data-testid={`sport-filter-${category.key}`}
            >
              {category.sport ? (
                <SportIcon sport={category.sport} className={`w-4 h-4 ${
                  selectedSport === category.key ? 'text-background' : 'text-foreground'
                }`} />
              ) : (
                <category.icon className={`w-4 h-4 ${
                  selectedSport === category.key ? 'text-background' : 'text-foreground'
                }`} />
              )}
              <span className="text-xs font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Sports Grid - Standardized 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {sportsCategories.slice(1).map((category) => (
          <Card 
            key={category.key} 
            className={`border cursor-pointer transition-all hover:shadow-sm ${
              selectedSport === category.key 
                ? 'bg-transparent border-border' 
                : 'hover:opacity-60'
            }`}
            onClick={() => setSelectedSport(category.key)}
            data-testid={`sport-category-${category.key}`}
          >
            <CardContent className="p-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {category.sport ? (
                    <SportIcon sport={category.sport} className="w-6 h-6 text-foreground" />
                  ) : (
                    <category.icon className="w-6 h-6 text-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-xs mb-1">{category.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {getSportStats(category.key)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compact Stats */}
      <div className="bg-transparent border border-border rounded-lg p-3 mb-4">
        <h3 className="font-semibold text-foreground mb-2 text-center text-sm">Live Stats</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-foreground">{Array.isArray(events) ? events.length : 0}</div>
            <div className="text-[10px] text-muted-foreground">Events</div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{Array.isArray(teams) ? teams.length : 0}</div>
            <div className="text-[10px] text-muted-foreground">Teams</div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{Array.isArray(coaches) ? coaches.length : 0}</div>
            <div className="text-[10px] text-muted-foreground">Coaches</div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">9</div>
            <div className="text-[10px] text-muted-foreground">Sports</div>
          </div>
        </div>
      </div>

      {/* Compact Selected Sport Details */}
      {selectedSport !== "all" && (
        <div className="p-3 bg-transparent border border-border rounded-lg">
          <h4 className="font-semibold text-foreground mb-1 text-sm">
            {sportsCategories.find(c => c.key === selectedSport)?.label}
          </h4>
          <p className="text-xs text-muted-foreground">
            Explore activities and local communities for {sportsCategories.find(c => c.key === selectedSport)?.label.toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  );
}