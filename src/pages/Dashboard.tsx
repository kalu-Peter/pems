import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  LogOut,
  ClipboardEdit,
  BarChart3,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

const POSITION_LABELS: Record<string, string> = {
  governor: "Governor",
  mp: "Member of Parliament",
  mca: "Member of County Assembly",
  woman_rep: "Woman Representative",
  senator: "Senator",
};

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [stations, submissions, candidates] = await Promise.all([
        supabase.from("polling_stations").select("id", { count: "exact", head: true }),
        supabase.from("result_submissions").select("id, status"),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
      ]);
      
      const submissionData = submissions.data || [];
      const verified = submissionData.filter((s) => s.status === "verified").length;
      const pending = submissionData.filter((s) => s.status === "pending").length;
      const flagged = submissionData.filter((s) => s.status === "flagged").length;

      return {
        totalStations: stations.count || 0,
        totalSubmissions: submissionData.length,
        totalCandidates: candidates.count || 0,
        verified,
        pending,
        flagged,
      };
    },
  });

  const { data: recentSubmissions } = useQuery({
    queryKey: ["recent-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("result_submissions")
        .select(`
          id, votes, status, position, created_at,
          candidates!inner(full_name, party),
          polling_stations!inner(name, code)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

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
              <p className="text-xs text-muted-foreground">Agent · Kwale County</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/submit">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <ClipboardEdit className="w-8 h-8 text-primary" />
                <span className="font-heading font-semibold text-sm">Submit Results</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/results">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <BarChart3 className="w-8 h-8 text-primary" />
                <span className="font-heading font-semibold text-sm">View Results</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Stations</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.totalStations ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Candidates</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.totalCandidates ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Verified</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.verified ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.pending ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Flagged</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.flagged ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardEdit className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-heading font-bold">{stats?.totalSubmissions ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentSubmissions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{sub.candidates?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.polling_stations?.name} · {POSITION_LABELS[sub.position] || sub.position}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-bold">{sub.votes.toLocaleString()}</p>
                      <Badge
                        variant={sub.status === "verified" ? "default" : sub.status === "flagged" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {sub.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
