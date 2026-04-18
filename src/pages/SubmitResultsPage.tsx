import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Trash2, MapPin, AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ElectivePosition = Database["public"]["Enums"]["elective_position"];

const POSITIONS: { value: ElectivePosition; label: string }[] = [
  { value: "governor", label: "Governor" },
  { value: "senator", label: "Senator" },
  { value: "woman_rep", label: "Woman Representative" },
  { value: "mp", label: "Member of Parliament" },
  { value: "mca", label: "Member of County Assembly" },
];

interface VoteEntry {
  candidateId: string;
  votes: string;
}

const SubmitResultsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [constituencyId, setConstituencyId] = useState("");
  const [wardId, setWardId] = useState("");
  const [pollingStationId, setPollingStationId] = useState("");
  const [position, setPosition] = useState<ElectivePosition | "">("");
  const [voteEntries, setVoteEntries] = useState<VoteEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [formType, setFormType] = useState<string>("34A");
  const [totalValidVotes, setTotalValidVotes] = useState("");
  const [rejectedVotes, setRejectedVotes] = useState("");

  // ── Fetch assigned polling station ────────────────────────────────────────
  const { data: assignedStation, isLoading: loadingStation } = useQuery({
    queryKey: ["assigned-station", profile?.polling_station_id],
    queryFn: async () => {
      if (!profile?.polling_station_id) return null;
      const { data } = await supabase
        .from("polling_stations")
        .select(`
          id, name, code, registered_voters,
          wards!inner(id, name,
            constituencies!inner(id, name)
          )
        `)
        .eq("id", profile.polling_station_id)
        .single();
      return data;
    },
    enabled: !!profile?.polling_station_id,
  });

  // Auto-set location from assigned station
  useEffect(() => {
    if (assignedStation) {
      const ward = assignedStation.wards as any;
      const constituency = ward?.constituencies;
      setConstituencyId(constituency?.id ?? "");
      setWardId(ward?.id ?? "");
      setPollingStationId(assignedStation.id);
    }
  }, [assignedStation]);

  // ── Queries (only used if no assigned station — future flexibility) ────────
  const { data: candidates } = useQuery({
    queryKey: ["candidates", position, constituencyId, wardId],
    queryFn: async () => {
      if (!position) return [];
      let query = supabase.from("candidates").select("*").eq("position", position);
      if (position === "mca" && wardId) query = query.eq("ward_id", wardId);
      else if (position === "mp" && constituencyId) query = query.eq("constituency_id", constituencyId);
      const { data } = await query.order("full_name");
      return data || [];
    },
    enabled: !!position && !!pollingStationId,
  });

  useEffect(() => {
    if (candidates?.length) {
      setVoteEntries(candidates.map((c) => ({ candidateId: c.id, votes: "" })));
    } else {
      setVoteEntries([]);
    }
  }, [candidates]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !pollingStationId || !position) throw new Error("Missing required fields");

      const validEntries = voteEntries.filter((e) => e.votes !== "" && parseInt(e.votes) >= 0);
      if (validEntries.length === 0) throw new Error("Enter at least one vote count");

      const submissions = validEntries.map((entry) => ({
        polling_station_id: pollingStationId,
        candidate_id: entry.candidateId,
        position: position as ElectivePosition,
        votes: parseInt(entry.votes),
        agent_id: user.id,
        notes: notes || null,
      }));

      const { error } = await supabase.from("result_submissions").upsert(submissions, {
        onConflict: "polling_station_id,candidate_id",
      });
      if (error) throw error;

      for (const photo of photos) {
        const fileName = `${user.id}/${pollingStationId}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence-photos")
          .upload(fileName, photo);
        if (uploadError) { console.error("Photo upload error:", uploadError); continue; }

        const { data: urlData } = supabase.storage.from("evidence-photos").getPublicUrl(fileName);
        await supabase.from("evidence_photos").insert({
          polling_station_id: pollingStationId,
          position: position as ElectivePosition,
          photo_url: urlData.publicUrl,
          form_type: formType,
          agent_id: user.id,
          total_valid_votes: totalValidVotes ? parseInt(totalValidVotes) : null,
          rejected_votes: rejectedVotes ? parseInt(rejectedVotes) : null,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Results submitted", description: "Vote tallies have been recorded." });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-submissions"] });
      setPosition("");
      setNotes("");
      setPhotos([]);
      setTotalValidVotes("");
      setRejectedVotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  // ── No station assigned ───────────────────────────────────────────────────
  if (!loadingStation && !profile?.polling_station_id) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/agent")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading font-bold text-foreground text-lg">Submit Results</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-md text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto" />
          <h2 className="font-heading font-bold text-lg">No Polling Station Assigned</h2>
          <p className="text-sm text-muted-foreground">
            You have not been assigned to a polling station yet. Please contact your admin to get assigned before submitting results.
          </p>
          <Button variant="outline" onClick={() => navigate("/agent")}>Go Back</Button>
        </main>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const ward = assignedStation ? (assignedStation.wards as any) : null;
  const constituency = ward?.constituencies;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agent")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-foreground text-lg">Submit Results</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">

        {/* Assigned Station Info (locked) */}
        {assignedStation && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">{assignedStation.name}</p>
                <p className="text-xs text-muted-foreground">
                  Code: {assignedStation.code} · {ward?.name} · {constituency?.name}
                </p>
                {assignedStation.registered_voters > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Registered voters: {assignedStation.registered_voters.toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Position + Votes */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">1. Enter Vote Tallies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Elective Position</Label>
              <select
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={position}
                onChange={(e) => setPosition(e.target.value as ElectivePosition)}
              >
                <option value="">Select position</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {candidates && candidates.length > 0 && (
              <>
                <div className="space-y-3">
                  {candidates.map((candidate, idx) => {
                    const entered = parseInt(voteEntries[idx]?.votes || "0") || 0;
                    return (
                      <div key={candidate.id} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-tight">{candidate.full_name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.party}</p>
                          </div>
                          {entered > 0 && (
                            <span className="text-xs font-heading font-bold text-primary">
                              {entered.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Votes received</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter vote count from form"
                            className="text-base font-heading font-semibold"
                            value={voteEntries[idx]?.votes || ""}
                            onChange={(e) => {
                              const updated = [...voteEntries];
                              updated[idx] = { ...updated[idx], votes: e.target.value };
                              setVoteEntries(updated);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Running total */}
                {(() => {
                  const runningTotal = voteEntries.reduce(
                    (sum, e) => sum + (parseInt(e.votes) || 0), 0
                  );
                  return runningTotal > 0 ? (
                    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Total votes entered</span>
                      <span className="font-heading font-bold">{runningTotal.toLocaleString()}</span>
                    </div>
                  ) : null;
                })()}
              </>
            )}

            {position && candidates && candidates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No candidates registered for this position and location.
                <br />
                <span className="text-xs">Ask your admin to add candidates first.</span>
              </p>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any observations or issues at this station..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Evidence Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">2. Form Evidence & Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Form Type</Label>
              <select
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="34A">Form 34A (Polling Station)</option>
                <option value="34B">Form 34B (Constituency)</option>
                <option value="34C">Form 34C (County)</option>
              </select>
            </div>

            {/* Numeric summary from the form */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Total Valid Votes</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="From form"
                  value={totalValidVotes}
                  onChange={(e) => setTotalValidVotes(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Rejected Votes</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="From form"
                  value={rejectedVotes}
                  onChange={(e) => setRejectedVotes(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Photos</Label>
              <label className="mt-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to upload form photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="space-y-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="text-sm truncate flex-1">{photo.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => removePhoto(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!pollingStationId || !position || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Results"}
        </Button>
      </main>
    </div>
  );
};

export default SubmitResultsPage;
