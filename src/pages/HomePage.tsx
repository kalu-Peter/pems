import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, LogIn, BarChart3, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ElectivePosition = Database["public"]["Enums"]["elective_position"];

const POSITIONS: { value: ElectivePosition; label: string }[] = [
  { value: "governor", label: "Governor" },
  { value: "senator", label: "Senator" },
  { value: "woman_rep", label: "Woman Rep" },
  { value: "mp", label: "MP" },
  { value: "mca", label: "MCA" },
];

const HomePage: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<ElectivePosition>("governor");

  const { data: results, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["public-results", selectedPosition],
    queryFn: async () => {
      const { data } = await supabase
        .from("result_submissions")
        .select(`
          id, votes, status, position,
          candidates!inner(id, full_name, party),
          polling_stations!inner(name, code)
        `)
        .eq("position", selectedPosition)
        .eq("status", "verified")
        .order("votes", { ascending: false });
      return data || [];
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: submissionStats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const [verified, pending, total] = await Promise.all([
        supabase.from("result_submissions").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("result_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("result_submissions").select("id", { count: "exact", head: true }),
      ]);
      return {
        verified: verified.count ?? 0,
        pending: pending.count ?? 0,
        total: total.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  // Aggregate by candidate
  const aggregated = React.useMemo(() => {
    if (!results) return [];
    const map = new Map<string, { name: string; party: string; totalVotes: number; stationCount: number }>();
    for (const r of results) {
      const cand = r.candidates as any;
      const existing = map.get(cand.id);
      if (existing) {
        existing.totalVotes += r.votes;
        existing.stationCount += 1;
      } else {
        map.set(cand.id, { name: cand.full_name, party: cand.party, totalVotes: r.votes, stationCount: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalVotes - a.totalVotes);
  }, [results]);

  const totalVotes = aggregated.reduce((sum, c) => sum + c.totalVotes, 0);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-lg leading-tight">PEMS</h1>
              <p className="text-xs text-muted-foreground">Kwale County · Live Results</p>
            </div>
          </div>
          <Link to="/login">
            <Button size="sm" className="gap-2">
              <LogIn className="w-4 h-4" />
              Login
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-heading font-bold text-success">{submissionStats?.verified ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-heading font-bold text-warning">{submissionStats?.pending ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-heading font-bold">{submissionStats?.total ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Position filter */}
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <Badge
              key={p.value}
              variant={selectedPosition === p.value ? "default" : "secondary"}
              className="cursor-pointer text-xs px-3 py-1"
              onClick={() => setSelectedPosition(p.value)}
            >
              {p.label}
            </Badge>
          ))}
        </div>

        {/* Results card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {POSITIONS.find((p) => p.value === selectedPosition)?.label} Results
              </CardTitle>
              <button
                onClick={() => refetch()}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Showing verified results · Updated {lastUpdated}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : aggregated.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">No verified results yet for this position</p>
                <p className="text-xs text-muted-foreground">Results appear here once verified by an admin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aggregated.map((candidate, idx) => {
                  const pct = totalVotes > 0 ? ((candidate.totalVotes / totalVotes) * 100) : 0;
                  const isLeading = idx === 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                            ${isLeading ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.party}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-heading font-bold text-sm">{candidate.totalVotes.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isLeading ? "bg-primary" : "bg-muted-foreground/40"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {candidate.stationCount} station{candidate.stationCount !== 1 ? "s" : ""} reporting
                      </p>
                    </div>
                  );
                })}

                <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                  <span>Total verified votes</span>
                  <span className="font-heading font-bold text-foreground">{totalVotes.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Results auto-refresh every 30 seconds · Only verified results are shown
        </p>
      </main>
    </div>
  );
};

export default HomePage;
