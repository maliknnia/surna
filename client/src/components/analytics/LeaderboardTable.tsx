import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  value: number | string;
  subtitle?: string;
  imageUrl?: string;
}

interface LeaderboardTableProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel: string;
  loading?: boolean;
}

export function LeaderboardTable({ title, entries, valueLabel, loading }: LeaderboardTableProps) {
  if (loading) {
    return (
      <Card data-testid={`leaderboard-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700 dark:text-amber-600" />;
    return null;
  };

  return (
    <Card data-testid={`leaderboard-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground dark:text-gray-100">
          <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="leaderboard-empty">
            No data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-muted-foreground dark:text-muted-foreground">Rank</TableHead>
                <TableHead className="text-muted-foreground dark:text-muted-foreground">Name</TableHead>
                <TableHead className="text-right text-muted-foreground dark:text-muted-foreground">{valueLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow 
                  key={entry.id} 
                  className="hover:bg-muted dark:hover:bg-card"
                  data-testid={`leaderboard-row-${entry.id}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="text-foreground dark:text-gray-100">#{entry.rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {entry.imageUrl && (
                        <img 
                          src={entry.imageUrl} 
                          alt={entry.name}
                          className="h-8 w-8 rounded-full object-cover"
                          data-testid={`leaderboard-avatar-${entry.id}`}
                        />
                      )}
                      <div>
                        <div className="font-medium text-foreground dark:text-gray-100">{entry.name}</div>
                        {entry.subtitle && (
                          <div className="text-sm text-muted-foreground">{entry.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground dark:text-gray-100" data-testid={`leaderboard-value-${entry.id}`}>
                    {entry.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
