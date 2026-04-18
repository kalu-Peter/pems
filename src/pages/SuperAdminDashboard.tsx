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
  Shield, LogOut, MapPin, Users, CheckCircle2, Clock,
  AlertTriangle, Plus, Eye, EyeOff,
} from "lucide-react";

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  super_admin: "destructive",
  admin: "default",
  agent: "secondary",
};

const SuperAdminDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // County form state
  const [countyName, setCountyName] = useState("");
  const [countyCode, setCountyCode] = useState("");

  // Create user form state
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "agent">("admin");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ["sa-stats"],
    queryFn: async () => {
      const [stations, submissions, candidates, users] = await Promise.all([
        supabase.from("polling_stations").select("id", { count: "exact", head: true }),
        supabase.from("result_submissions").select("id, status"),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const subs = submissions.data || [];
      return {
        totalStations: stations.count ?? 0,
        totalCandidates: candidates.count ?? 0,
        totalUsers: users.count ?? 0,
        verified: subs.filter((s) => s.status === "verified").length,
        pending: subs.filter((s) => s.status === "pending").length,
        flagged: subs.filter((s) => s.status === "flagged").length,
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

  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addCountyMutation = useMutation({
    mutationFn: async () => {
      if (!countyName.trim() || !countyCode.trim()) throw new Error("Name and code are required");
      const { error } = await supabase
        .from("counties")
        .insert({ name: countyName.trim(), code: countyCode.trim().toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "County added" });
      setCountyName("");
      setCountyCode("");
      queryClient.invalidateQueries({ queryKey: ["counties"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCountyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("counties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "County removed" });
      queryClient.invalidateQueries({ queryKey: ["counties"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createUserHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim() || !newFullName.trim()) return;
    setCreatingUser(true);
    try {
      // Save current admin session so we can restore it if signUp auto-signs in
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: { data: { full_name: newFullName.trim() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("User creation failed");

      // Update profile with desired role (trigger created it as 'agent')
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole, full_name: newFullName.trim(), created_by: user!.id })
        .eq("id", data.user.id);
      if (profileError) throw profileError;

      // If email confirmation is OFF, signUp returns a session and replaces ours — restore it
      if (data.session && currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      toast({
        title: "User created",
        description: `${newFullName} (${newRole}) — they can now log in.`,
      });
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create user";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCreatingUser(false);
    }
  };

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "agent" }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

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
              <p className="text-xs text-muted-foreground">Super Admin · Kwale County</p>
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
          <TabsList className="w-full mb-6">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="counties" className="flex-1">Counties</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: <MapPin className="w-4 h-4 text-muted-foreground" />, label: "Stations", value: stats?.totalStations ?? "—" },
                { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Users", value: stats?.totalUsers ?? "—" },
                { icon: <CheckCircle2 className="w-4 h-4 text-success" />, label: "Verified", value: stats?.verified ?? 0 },
                { icon: <Clock className="w-4 h-4 text-warning" />, label: "Pending", value: stats?.pending ?? 0 },
                { icon: <AlertTriangle className="w-4 h-4 text-secondary" />, label: "Flagged", value: stats?.flagged ?? 0 },
                { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "Candidates", value: stats?.totalCandidates ?? "—" },
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

          {/* ── Counties ── */}
          <TabsContent value="counties" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add County
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); addCountyMutation.mutate(); }}
                >
                  <Input
                    placeholder="County name"
                    value={countyName}
                    onChange={(e) => setCountyName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Code (e.g. 001)"
                    value={countyCode}
                    onChange={(e) => setCountyCode(e.target.value)}
                    className="w-32"
                    required
                  />
                  <Button type="submit" disabled={addCountyMutation.isPending}>
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">All Counties</CardTitle>
              </CardHeader>
              <CardContent>
                {!counties?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No counties yet</p>
                ) : (
                  <div className="space-y-2">
                    {counties.map((c) => (
                      <div key={c.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {c.code}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteCountyMutation.mutate(c.id)}
                          disabled={deleteCountyMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-4">
            {/* Create user form */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createUserHandler} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="Jane Doe"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as "admin" | "agent")}
                      >
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={creatingUser}>
                    {creatingUser ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* User list */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base">All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {!allUsers?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.id === user?.id ? "(you)" : u.id.slice(0, 8) + "…"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={ROLE_COLORS[u.role]}>{u.role.replace("_", " ")}</Badge>
                          {u.id !== user?.id && u.role !== "super_admin" && (
                            <select
                              className="text-xs rounded border border-input bg-background px-2 py-1"
                              value={u.role}
                              onChange={(e) =>
                                changeRoleMutation.mutate({ id: u.id, role: e.target.value as "admin" | "agent" })
                              }
                            >
                              <option value="admin">admin</option>
                              <option value="agent">agent</option>
                            </select>
                          )}
                        </div>
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

export default SuperAdminDashboard;
