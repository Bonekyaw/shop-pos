"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Smartphone,
  SmartphoneNfc,
  Trash2,
  UserPlus,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MobileSessionInfo = {
  id: string;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  lastSeenAt: string;
};

type Waiter = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  mobileSession: MobileSessionInfo | null;
  pin?: string; // Only present right after creation or PIN regeneration
};

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function WaiterManagement() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [revealedPins, setRevealedPins] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const waitersQuery = useQuery<Waiter[]>({
    queryKey: ["waiters"],
    queryFn: async () => {
      const response = await fetch("/api/admin/waiters");
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to load waiters"));
      }
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (waiterName: string) => {
      const response = await fetch("/api/admin/waiters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: waiterName }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to create waiter"));
      }
      return response.json() as Promise<Waiter>;
    },
    onSuccess: async (data) => {
      setName("");
      if (data.pin) {
        setRevealedPins((prev) => ({ ...prev, [data.id]: data.pin! }));
      }
      toast.success("Waiter created", {
        description: data.pin
          ? `PIN: ${data.pin} — share this with the waiter`
          : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["waiters"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => {
      const response = await fetch(`/api/admin/waiters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to update waiter"));
      }
      return response.json() as Promise<Waiter>;
    },
    onSuccess: async (data, variables) => {
      if (data.pin) {
        setRevealedPins((prev) => ({ ...prev, [variables.id]: data.pin! }));
        toast.success("PIN regenerated", {
          description: `New PIN: ${data.pin} — share this with the waiter`,
        });
      } else {
        toast.success("Waiter updated");
      }
      setEditingNames((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["waiters"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/waiters/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, "Failed to deactivate waiter")
        );
      }
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Waiter deactivated");
      await queryClient.invalidateQueries({ queryKey: ["waiters"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/waiters/${id}/session`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, "Failed to revoke session")
        );
      }
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Mobile session revoked", {
        description: "The waiter will be logged out automatically.",
      });
      await queryClient.invalidateQueries({ queryKey: ["waiters"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const waiters = waitersQuery.data ?? [];

  const filteredWaiters = useMemo(() => {
    return waiters.filter(waiter => 
      waiter.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [waiters, search]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(name);
  }

  function handleCopyPin(pin: string) {
    navigator.clipboard.writeText(pin);
    toast.success("PIN copied to clipboard");
  }

  function handleSaveName(id: string, currentName: string) {
    const newName = editingNames[id]?.trim();
    if (!newName || newName === currentName) {
      setEditingNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    updateMutation.mutate({ id, payload: { name: newName } });
  }

  return (
    <div className="space-y-6">
      {/* Create Waiter Form */}
      <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden animate-fade-in">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="size-5 text-primary" />
            Register New Waitstaff
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={handleCreate}
            className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <div className="grid gap-2">
              <Label htmlFor="waiter-name" className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                Full Name
              </Label>
              <Input
                id="waiter-name"
                placeholder="e.g. Liam Smith"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="bg-white/50 dark:bg-slate-950/50 h-11 rounded-xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/95 text-white transition-all hover:-translate-y-0.5"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4 mr-2" />
              )}
              Add Waiter
            </Button>
          </form>
          <p className="mt-3 text-xs font-semibold text-muted-foreground italic">
            * A unique 4-digit PIN is auto-generated upon creation for device authentication.
          </p>
        </CardContent>
      </Card>

      {/* Waiters Grid */}
      <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-xl font-bold">Waiters Directory</CardTitle>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search filter */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-white/40 dark:bg-slate-950/40 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["waiters"] })}
              disabled={waitersQuery.isFetching}
              className="rounded-xl h-9 text-xs font-bold"
            >
              <RefreshCw
                className={cn("size-3.5 mr-1.5", waitersQuery.isFetching ? "animate-spin" : "")}
              />
              Sync
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 p-4 sm:p-6">
          {waitersQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : filteredWaiters.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="size-10 opacity-30" />
              <p className="font-bold">No results found</p>
              <p className="text-sm">Try tweaking your search or create a new staff record.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {filteredWaiters.map((waiter) => {
                const editName = editingNames[waiter.id];
                const isEditingName = editName !== undefined;
                const pin = revealedPins[waiter.id];

                return (
                  <div
                    key={waiter.id}
                    className={cn(
                      "rounded-2xl border p-5 transition-all duration-300 relative group overflow-hidden bg-white/40 dark:bg-slate-900/40 hover:-translate-y-0.5",
                      waiter.isActive
                        ? "border-slate-200/60 dark:border-white/5 hover:shadow-lg hover:shadow-primary/5"
                        : "border-slate-250/30 dark:border-white/5 opacity-55"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10 relative">
                      {/* Left: Name and edits */}
                      <div className="flex-1 min-w-[200px] flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                          {waiter.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          {isEditingName ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editName}
                                onChange={(e) =>
                                  setEditingNames((prev) => ({
                                    ...prev,
                                    [waiter.id]: e.target.value,
                                  }))
                                }
                                className="h-8 max-w-[180px] rounded-lg bg-white dark:bg-slate-950 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveName(waiter.id, waiter.name);
                                  }
                                  if (e.key === "Escape") {
                                    setEditingNames((prev) => {
                                      const next = { ...prev };
                                      delete next[waiter.id];
                                      return next;
                                    });
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveName(waiter.id, waiter.name)}
                                disabled={updateMutation.isPending}
                                className="h-8 px-2.5 rounded-lg text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setEditingNames((prev) => {
                                    const next = { ...prev };
                                    delete next[waiter.id];
                                    return next;
                                  })
                                }
                                className="h-8 px-2.5 rounded-lg text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-left font-black text-base hover:text-primary transition-colors cursor-pointer outline-none"
                              onClick={() =>
                                setEditingNames((prev) => ({
                                  ...prev,
                                  [waiter.id]: waiter.name,
                                }))
                              }
                              title="Click to edit name"
                            >
                              {waiter.name}
                            </button>
                          )}
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                            Role: {waiter.role}
                          </div>
                        </div>
                      </div>

                      {/* Right: details, pin and status toggling */}
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Status badge */}
                        <Badge variant={waiter.isActive ? "default" : "secondary"} className={cn("font-bold text-[10px] px-2.5 py-0.5 border-none", waiter.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground")}>
                          {waiter.isActive ? "Active" : "Inactive"}
                        </Badge>

                        {/* PIN badge block */}
                        <div className="flex items-center gap-1.5 border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl px-3 py-1.5 font-mono text-sm shadow-inner">
                          <KeyRound className="size-3.5 text-muted-foreground opacity-60" />
                          {pin ? (
                            <div className="flex items-center gap-1">
                              <code className="font-black text-primary tracking-widest text-sm">
                                {pin}
                              </code>
                              <button
                                className="p-1 hover:text-primary transition-colors cursor-pointer outline-none"
                                onClick={() => handleCopyPin(pin)}
                                title="Copy PIN"
                              >
                                <Copy className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 tracking-widest leading-none font-bold text-xs">
                              ••••
                            </span>
                          )}
                          {waiter.isActive && (
                            <button
                              className="p-1 hover:text-primary transition-colors cursor-pointer outline-none ml-1"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: waiter.id,
                                  payload: { regeneratePin: true },
                                })
                              }
                              disabled={updateMutation.isPending}
                              title="Regenerate PIN"
                            >
                              <RefreshCw className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Status switch CTAs */}
                        <div className="flex items-center">
                          {waiter.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs font-bold border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => deactivateMutation.mutate(waiter.id)}
                              disabled={deactivateMutation.isPending}
                            >
                              <Ban className="size-3.5 mr-1.5" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs font-bold border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: waiter.id,
                                  payload: { isActive: true },
                                })
                              }
                              disabled={updateMutation.isPending}
                            >
                              <RotateCcw className="size-3.5 mr-1.5" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile session row */}
                    {waiter.mobileSession ? (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20 px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SmartphoneNfc className="size-4.5 text-green-600 dark:text-green-400 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold text-green-800 dark:text-green-300">
                              {waiter.mobileSession.deviceName}
                            </span>
                            <span className="ml-2 text-muted-foreground font-semibold">
                              Connected {timeAgo(waiter.mobileSession.createdAt)} · Active {timeAgo(waiter.mobileSession.lastSeenAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2.5 rounded-lg text-[10px] font-bold tracking-wide shadow-xs shrink-0 self-end sm:self-center bg-red-600 dark:bg-red-750"
                          onClick={() => revokeSessionMutation.mutate(waiter.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          <Trash2 className="size-3 mr-1.5" />
                          Revoke Session
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-100/10 dark:bg-slate-950/20 px-4 py-2.5">
                        <Smartphone className="size-4 text-slate-400 dark:text-slate-600 opacity-60" />
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-600">
                          No active device connection
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
