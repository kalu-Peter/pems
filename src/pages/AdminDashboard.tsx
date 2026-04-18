import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, LogOut, Users, CheckCircle2, Clock,
  AlertTriangle, Plus, Eye, EyeOff, ClipboardEdit, MapPin, Trash2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ElectivePosition = Database["public"]["Enums"]["elective_position"];

const POSITIONS: { value: ElectivePosition; label: string }[] = [
  { value: "governor",   label: "Governor" },
  { value: "senator",    label: "Senator" },
  { value: "woman_rep",  label: "Woman Representative" },
  { value: "mp",         label: "Member of Parliament" },
  { value: "mca",        label: "Member of County Assembly" },
];

type SubmissionStatus = "pending" | "verified" | "flagged" | "rejected";

const STATUS_VARIANTS: Record<SubmissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  verified: "default",
  pending: "secondary",
  flagged: "destructive",
  rejected: "outline",
};

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create agent form
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Candidate form state
  const [candName, setCandName] = useState("");
  const [candParty, setCandParty] = useState("");
  const [candPosition, setCandPosition] = useState<ElectivePosition | "">("");
  const [candConstId, setCandConstId] = useState("");
  const [candWardId, setCandWardId] = useState("");

  // Locations form state
  const [selCountyId, setSelCountyId] = useState("");
  const [constName, setConstName] = useState("");
  const [selConstId, setSelConstId] = useState("");
  const [wardName, setWardName] = useState("");
  const [selWardId, setSelWardId] = useState("");
  const [stationName, setStationName] = useState("");
  const [stationCode, setStationCode] = useState("");
  const [stationVoters, setStationVoters] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [submissions, agents] = await Promise.all([
        supabase.from("result_submissions").select("id, status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
      ]);
      const subs = submissions.data || [];
      return {
        totalAgents: agents.count ?? 0,
        verified: subs.filter((s) => s.status === "verified").length,
        pending: subs.filter((s) => s.status === "pending").length,
        flagged: subs.filter((s) => s.status === "flagged").length,
        total: subs.length,
      };
    },
  });

  const { data: counties } = useQuery({
    queryKey: ["counties"],
    queryFn: async () => {
      const { data } = await supabase.from("counties").select("*").order("name");
      return data || [];
    },
  });

  const { data: constituencies } = useQuery({
    queryKey: ["constituencies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("constituencies")
        .select("*, counties(name)")
        .order("name");
      return data || [];
    },
  });

  const { data: wards } = useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wards")
        .select("*, constituencies(name)")
        .order("name");
      return data || [];
    },
  });

  const { data: pollingStations } = useQuery({
    queryKey: ["polling-stations-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("polling_stations")
        .select(`
          id, name, code, registered_voters,
          wards!inner(name, constituencies!inner(name))
        `)
        .order("name");
      return data || [];
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select(`
          id, full_name, party, position,
          constituencies(name),
          wards(name)
        `)
        .order("position")
        .order("full_name");
      return data || [];
    },
  });

  const { data: agents } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(`
          id, full_name, polling_station_id,
          polling_stations(name, code)
        `)
        .eq("role", "agent")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("result_submissions")
        .select(`
          id, votes, status, position, notes,
          candidates!inner(full_name, party),
          polling_stations!inner(name, code)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Unassigned stations (no agent assigned)
  const unassignedStations = pollingStations?.filter(
    (ps) => !agents?.some((a: any) => a.polling_station_id === ps.id)
  ) ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addConstMutation = useMutation({
    mutationFn: async () => {
      if (!constName.trim() || !selCountyId) throw new Error("County and name required");
      const { error } = await supabase
        .from("constituencies")
        .insert({ name: constName.trim(), county_id: selCountyId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Constituency added" });
      setConstName("");
      queryClient.invalidateQueries({ queryKey: ["constituencies"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addWardMutation = useMutation({
    mutationFn: async () => {
      if (!wardName.trim() || !selConstId) throw new Error("Constituency and name required");
      const { error } = await supabase
        .from("wards")
        .insert({ name: wardName.trim(), constituency_id: selConstId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ward added" });
      setWardName("");
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addStationMutation = useMutation({
    mutationFn: async () => {
      if (!stationName.trim() || !stationCode.trim() || !selWardId)
        throw new Error("Ward, name and code required");
      const { error } = await supabase.from("polling_stations").insert({
        name: stationName.trim(),
        code: stationCode.trim().toUpperCase(),
        ward_id: selWardId,
        registered_voters: parseInt(stationVoters) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Polling station added" });
      setStationName("");
      setStationCode("");
      setStationVoters("");
      queryClient.invalidateQueries({ queryKey: ["polling-stations-admin"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCandidateMutation = useMutation({
    mutationFn: async () => {
      if (!candName.trim() || !candParty.trim() || !candPosition)
        throw new Error("Name, party and position are required");

      // Require constituency for mp; ward for mca
      if (candPosition === "mp" && !candConstId) throw new Error("Select a constituency for MP");
      if (candPosition === "mca" && !candWardId) throw new Error("Select a ward for MCA");

      // Derive county from constituency/ward or use the first county
      const { data: countyRow } = await supabase
        .from("counties").select("id").limit(1).single();
      if (!countyRow) throw new Error("No county found");

      const { error } = await supabase.from("candidates").insert({
        full_name: candName.trim(),
        party: candParty.trim(),
        position: candPosition as ElectivePosition,
        county_id: countyRow.id,
        constituency_id: ["mp", "mca"].includes(candPosition) ? (candConstId || null) : null,
        ward_id: candPosition === "mca" ? (candWardId || null) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Candidate added" });
      setCandName(""); setCandParty(""); setCandPosition("");
      setCandConstId(""); setCandWardId("");
      queryClient.invalidateQueries({ queryKey: ["candidates-admin"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Candidate removed" });
      queryClient.invalidateQueries({ queryKey: ["candidates-admin"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createAgentHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim() || !newFullName.trim()) return;
    setCreatingUser(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: { data: { full_name: newFullName.trim() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("User creation failed");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: newFullName.trim(), created_by: user!.id })
        .eq("id", data.user.id);
      if (profileError) throw profileError;

      if (data.session && currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      toast({ title: "Agent created", description: `${newFullName} can now log in.` });
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["agents-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setCreatingUser(false);
    }
  };

  const assignStationMutation = useMutation({
    mutationFn: async ({ agentId, stationId }: { agentId: string; stationId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ polling_station_id: stationId })
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Station assignment updated" });
      queryClient.invalidateQueries({ queryKey: ["agents-list"] });
      queryClient.invalidateQueries({ queryKey: ["polling-stations-admin"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubmissionStatus }) => {
      const { error } = await supabase.from("result_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Filtered constituencies/wards for cascading selects in Locations tab
  const constByCounty = constituencies?.filter((c: any) => !selCountyId || c.county_id === selCountyId) ?? [];
  const wardsByConst = wards?.filter((w: any) => !selConstId || w.constituency_id === selConstId) ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-lg leading-tight">PEMS</h1>
              <p className="text-xs text-muted-foreground">Admin · Kwale County</p>
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

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Tabs defaultValue="overview">
          <TabsList className="w-full mb-6 grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Agents", value: stats?.totalAgents ?? "—" },
                { icon: <ClipboardEdit className="w-4 h-4 text-muted-foreground" />, label: "Total Submissions", value: stats?.total ?? 0 },
                { icon: <CheckCircle2 className="w-4 h-4 text-success" />, label: "Verified", value: stats?.verified ?? 0 },
                { icon: <Clock className="w-4 h-4 text-warning" />, label: "Pending", value: stats?.pending ?? 0 },
                { icon: <AlertTriangle className="w-4 h-4 text-secondary" />, label: "Flagged", value: stats?.flagged ?? 0 },
                { icon: <MapPin className="w-4 h-4 text-muted-foreground" />, label: "Stations", value: pollingStations?.length ?? "—" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {stat.icon}
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-heading font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Locations ── */}
          <TabsContent value="locations" className="space-y-4">

            {/* Add Constituency */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Constituency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); addConstMutation.mutate(); }}
                >
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selCountyId}
                    onChange={(e) => setSelCountyId(e.target.value)}
                    required
                  >
                    <option value="">Select county</option>
                    {counties?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Constituency name"
                    value={constName}
                    onChange={(e) => setConstName(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={addConstMutation.isPending}>Add</Button>
                </form>
                {constituencies && constituencies.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {constituencies.map((c: any) => (
                      <div key={c.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-xs">{c.counties?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Ward */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Ward
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); addWardMutation.mutate(); }}
                >
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selConstId}
                    onChange={(e) => setSelConstId(e.target.value)}
                    required
                  >
                    <option value="">Select constituency</option>
                    {constByCounty.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Ward name"
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={addWardMutation.isPending}>Add</Button>
                </form>
                {wards && wards.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {wards.map((w: any) => (
                      <div key={w.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{w.name}</span>
                        <span className="text-muted-foreground text-xs">{w.constituencies?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Polling Station */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Polling Station
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-3"
                  onSubmit={(e) => { e.preventDefault(); addStationMutation.mutate(); }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Ward</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selWardId}
                        onChange={(e) => setSelWardId(e.target.value)}
                        required
                      >
                        <option value="">Select ward</option>
                        {wardsByConst.map((w: any) => (
                          <option key={w.id} value={w.id}>{w.name} — {w.constituencies?.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Station Name</Label>
                      <Input
                        placeholder="e.g. Ukunda Primary"
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Station Code</Label>
                      <Input
                        placeholder="e.g. KWL/001"
                        value={stationCode}
                        onChange={(e) => setStationCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Registered Voters</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={stationVoters}
                        onChange={(e) => setStationVoters(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={addStationMutation.isPending}>
                    Add Polling Station
                  </Button>
                </form>

                {pollingStations && pollingStations.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      All Polling Stations ({pollingStations.length})
                    </p>
                    {pollingStations.map((ps: any) => {
                      const assignedAgent = agents?.find((a: any) => a.polling_station_id === ps.id);
                      return (
                        <div key={ps.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                          <div>
                            <span className="font-medium">{ps.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">({ps.code})</span>
                            <p className="text-xs text-muted-foreground">
                              {(ps.wards as any)?.name} · {(ps.wards as any)?.constituencies?.name}
                            </p>
                          </div>
                          {assignedAgent ? (
                            <Badge variant="default" className="text-xs shrink-0">
                              {(assignedAgent as any).full_name ?? "Assigned"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs shrink-0">Unassigned</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Candidates ── */}
          <TabsContent value="candidates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Candidate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-3"
                  onSubmit={(e) => { e.preventDefault(); addCandidateMutation.mutate(); }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={candName}
                        onChange={(e) => setCandName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Party</Label>
                      <Input
                        placeholder="e.g. ODM"
                        value={candParty}
                        onChange={(e) => setCandParty(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Position</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={candPosition}
                        onChange={(e) => {
                          setCandPosition(e.target.value as ElectivePosition);
                          setCandConstId(""); setCandWardId("");
                        }}
                        required
                      >
                        <option value="">Select position</option>
                        {POSITIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Constituency — required for MP and MCA */}
                    {(candPosition === "mp" || candPosition === "mca") && (
                      <div className="space-y-1">
                        <Label>Constituency</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={candConstId}
                          onChange={(e) => { setCandConstId(e.target.value); setCandWardId(""); }}
                          required
                        >
                          <option value="">Select constituency</option>
                          {constituencies?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Ward — required for MCA */}
                    {candPosition === "mca" && (
                      <div className="space-y-1">
                        <Label>Ward</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={candWardId}
                          onChange={(e) => setCandWardId(e.target.value)}
                          required
                        >
                          <option value="">Select ward</option>
                          {wards
                            ?.filter((w: any) => !candConstId || w.constituency_id === candConstId)
                            .map((w: any) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={addCandidateMutation.isPending}>
                    {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Candidates list */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  All Candidates ({candidates?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!candidates?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No candidates yet</p>
                ) : (
                  <div className="space-y-2">
                    {candidates.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.party} ·{" "}
                            <Badge variant="secondary" className="text-xs">
                              {POSITIONS.find((p) => p.value === c.position)?.label ?? c.position}
                            </Badge>
                            {c.constituencies && (
                              <span> · {c.constituencies.name}</span>
                            )}
                            {c.wards && (
                              <span> · {c.wards.name}</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => deleteCandidateMutation.mutate(c.id)}
                          disabled={deleteCandidateMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Agents ── */}
          <TabsContent value="agents" className="space-y-4">
            {/* Create agent */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createAgentHandler} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="John Mwangi"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="agent@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={creatingUser}>
                    {creatingUser ? "Creating..." : "Create Agent"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Agent list with station assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">Agents & Station Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                {!agents?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No agents yet</p>
                ) : (
                  <div className="space-y-3">
                    {agents.map((a: any) => (
                      <div key={a.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.full_name ?? "—"}</p>
                            {a.polling_stations ? (
                              <p className="text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {a.polling_stations.name} ({a.polling_stations.code})
                              </p>
                            ) : (
                              <p className="text-xs text-orange-500">No station assigned</p>
                            )}
                          </div>
                          <Badge variant={a.polling_station_id ? "default" : "secondary"} className="text-xs shrink-0">
                            {a.polling_station_id ? "Assigned" : "Unassigned"}
                          </Badge>
                        </div>
                        {/* Station assignment dropdown */}
                        <div className="flex gap-2">
                          <select
                            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                            value={a.polling_station_id ?? ""}
                            onChange={(e) =>
                              assignStationMutation.mutate({
                                agentId: a.id,
                                stationId: e.target.value || null,
                              })
                            }
                          >
                            <option value="">— Unassign —</option>
                            {/* Show current station + unassigned stations */}
                            {pollingStations
                              ?.filter((ps) => ps.id === a.polling_station_id || !agents.some((ag: any) => ag.polling_station_id === ps.id))
                              .map((ps: any) => (
                                <option key={ps.id} value={ps.id}>
                                  {ps.name} ({ps.code})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Results ── */}
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">Submissions — Verify / Flag / Reject</CardTitle>
              </CardHeader>
              <CardContent>
                {!submissions?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub: any) => (
                      <div key={sub.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{sub.candidates?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.polling_stations?.name} ({sub.polling_stations?.code}) · {sub.position}
                            </p>
                            {sub.notes && (
                              <p className="text-xs text-muted-foreground italic mt-1">{sub.notes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-heading font-bold">{sub.votes.toLocaleString()}</p>
                            <Badge variant={STATUS_VARIANTS[sub.status as SubmissionStatus]} className="text-xs">
                              {sub.status}
                            </Badge>
                          </div>
                        </div>
                        {sub.status === "pending" && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="default" className="flex-1 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "verified" })}
                              disabled={updateStatusMutation.isPending}>Verify</Button>
                            <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "flagged" })}
                              disabled={updateStatusMutation.isPending}>Flag</Button>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                              onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "rejected" })}
                              disabled={updateStatusMutation.isPending}>Reject</Button>
                          </div>
                        )}
                        {sub.status !== "pending" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground w-full"
                            onClick={() => updateStatusMutation.mutate({ id: sub.id, status: "pending" })}
                            disabled={updateStatusMutation.isPending}>Reset to pending</Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
