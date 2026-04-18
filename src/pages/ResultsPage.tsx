import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ElectivePosition = Database["public"]["Enums"]["elective_position"];

const POSITIONS: { value: ElectivePosition; label: string }[] = [
  { value: "governor", label: "Governor" },
  { value: "senator", label: "Senator" },
  { value: "woman_rep", label: "Woman Representative" },
  { value: "mp", label: "Member of Parliament" },
  { value: "mca", label: "Member of County Assembly" },
];

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPosition, setSelectedPosition] = useState<ElectivePosition>("governor");

  const { data: results, isLoading } = useQuery({
    queryKey: ["results", selectedPosition],
    queryFn: async () => {
      const { data } = await supabase
        .from("result_submissions")
        .select(`
          id, votes, status, position, created_at,
          candidates!inner(id, full_name, party),
          polling_stations!inner(name, code, ward_id,
            wards!inner(name, constituency_id,
              constituencies!inner(name)
            )
          )
        `)
        .eq("position", selectedPosition)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Aggregate by candidate
  const aggregated = React.useMemo(() => {
    if (!results) return [];
    const map = new Map<string, { name: string; party: string; totalVotes: number; stationCount: number }>();
    
    for (const r of results) {
      const cand = r.candidates as any;
      const key = cand.id;
      const existing = map.get(key);
      if (existing) {
        existing.totalVotes += r.votes;
        existing.stationCount += 1;
      } else {
        map.set(key, {
          name: cand.full_name,
          party: cand.party,
          totalVotes: r.votes,
          stationCount: 1,
        });
      }
    }
    
    return Array.from(map.values()).sort((a, b) => b.totalVotes - a.totalVotes);
  }, [results]);

  const totalVotes = aggregated.reduce((sum, c) => sum + c.totalVotes, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-foreground text-lg">Election Results</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
        {/* Position filter */}
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <Badge
              key={p.value}
              variant={selectedPosition === p.value ? "default" : "secondary"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedPosition(p.value)}
            >
              {p.label}
            </Badge>
          ))}
        </div>

        {/* Aggregated Results */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {POSITIONS.find((p) => p.value === selectedPosition)?.label} — Tallied Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : aggregated.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No results submitted yet</p>
            ) : (
              <div className="space-y-3">
                {aggregated.map((candidate, idx) => {
                  const pct = totalVotes > 0 ? ((candidate.totalVotes / totalVotes) * 100).toFixed(1) : "0";
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">{candidate.party}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold">{candidate.totalVotes.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{pct}% · {candidate.stationCount} station{candidate.stationCount !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t text-right">
                  <p className="text-sm text-muted-foreground">Total votes: <span className="font-heading font-bold text-foreground">{totalVotes.toLocaleString()}</span></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raw submission list */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Individual Station Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results && results.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="font-medium">{r.candidates?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.polling_stations?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold">{r.votes.toLocaleString()}</p>
                      <Badge
                        variant={r.status === "verified" ? "default" : r.status === "flagged" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ResultsPage;
