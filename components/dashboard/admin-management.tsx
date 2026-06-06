"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminRole } from "@/app/generated/prisma/client";
import {
  Activity,
  Ban,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { ADMIN_ROLE_OPTIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  adminRole: AdminRole | null;
  isActive: boolean;
  createdAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  timestamp: string;
  details: {
    targetUserId?: string;
    changedFields?: string[];
    after?: { name?: string; email?: string | null; adminRole?: AdminRole | null };
  };
  user: {
    id: string;
    name: string;
    role: string;
  };
};

type AdminDraft = {
  name: string;
  email: string;
  adminRole: AdminRole;
};

const emptyDraft: AdminDraft = {
  name: "",
  email: "",
  adminRole: "COUNTER",
};

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

export function AdminManagement() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AdminDraft>(emptyDraft);
  const [edits, setEdits] = useState<Record<string, Partial<AdminDraft> & { isActive?: boolean }>>({});
  const [search, setSearch] = useState("");

  const adminsQuery = useQuery<AdminUser[]>({
    queryKey: ["admins"],
    queryFn: async () => {
      const response = await fetch("/api/admin/admins");
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to load admins"));
      }
      const data = await response.json();
      return data.admins;
    },
  });

  const auditQuery = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", "admin-management"],
    queryFn: async () => {
      const response = await fetch("/api/audit/logs?limit=25");
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to load audit logs"));
      }
      const data = await response.json();
      return data.logs;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: AdminDraft) => {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to create admin"));
      }
      return response.json();
    },
    onSuccess: async () => {
      setDraft(emptyDraft);
      toast.success("Admin created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admins"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs", "admin-management"] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const response = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to update admin"));
      }
      return response.json();
    },
    onSuccess: async (_, variables) => {
      setEdits((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      toast.success("Admin updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admins"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs", "admin-management"] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to deactivate admin"));
      }
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Admin deactivated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admins"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs", "admin-management"] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const admins = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);
  const adminNameById = useMemo(() => {
    return new Map(admins.map((admin) => [admin.id, admin.name]));
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => 
      admin.name.toLowerCase().includes(search.toLowerCase()) ||
      (admin.email && admin.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [admins, search]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(draft);
  }

  function updateEdit(id: string, patch: Partial<AdminDraft> & { isActive?: boolean }) {
    setEdits((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function saveAdmin(admin: AdminUser) {
    const patch = edits[admin.id] ?? {};
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined && patch.name !== admin.name) payload.name = patch.name;
    if (patch.email !== undefined && patch.email !== (admin.email ?? "")) payload.email = patch.email;
    if (patch.adminRole !== undefined && patch.adminRole !== admin.adminRole) payload.adminRole = patch.adminRole;
    if (patch.isActive !== undefined && patch.isActive !== admin.isActive) payload.isActive = patch.isActive;

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      return;
    }
    updateMutation.mutate({ id: admin.id, payload });
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="size-5 text-primary" />
            Add New Admin Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-[1fr_1fr_170px_auto] lg:items-end">
            <div className="grid gap-2">
              <Label htmlFor="admin-name" className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Display Name</Label>
              <Input
                id="admin-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="bg-white/50 dark:bg-slate-950/50 h-11 rounded-xl"
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-email" className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                className="bg-white/50 dark:bg-slate-950/50 h-11 rounded-xl"
                placeholder="e.g. john@restaurant.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-role" className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Authority Level</Label>
              <select
                id="admin-role"
                value={draft.adminRole}
                onChange={(event) => setDraft((current) => ({ ...current, adminRole: event.target.value as AdminRole }))}
                className="h-11 rounded-xl border border-input bg-white/50 dark:bg-slate-950/50 px-3 text-sm font-semibold shadow-xs outline-none focus-visible:border-primary/50 focus-visible:ring-ring/50 transition-all duration-300"
              >
                {ADMIN_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/95 text-white transition-all hover:-translate-y-0.5">
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Create Admin
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Admins Table list */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold">Active Administrators</CardTitle>
            {/* Search filter */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search admins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-white/40 dark:bg-slate-950/40 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {adminsQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No administrators found matching "{search}"
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <th className="pb-3 pr-3 pl-2">Admin Name</th>
                      <th className="pb-3 pr-3">Email Address</th>
                      <th className="pb-3 pr-3">Role</th>
                      <th className="pb-3 pr-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredAdmins.map((admin) => {
                      const edit = edits[admin.id] ?? {};
                      const isActive = edit.isActive ?? admin.isActive;
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-3.5 pr-3 pl-2">
                            <Input
                              value={edit.name ?? admin.name}
                              onChange={(event) => updateEdit(admin.id, { name: event.target.value })}
                              className="h-9 rounded-lg bg-white/50 dark:bg-slate-950/50 font-bold"
                            />
                          </td>
                          <td className="py-3.5 pr-3">
                            <Input
                              type="email"
                              value={edit.email ?? admin.email ?? ""}
                              onChange={(event) => updateEdit(admin.id, { email: event.target.value })}
                              className="h-9 rounded-lg bg-white/50 dark:bg-slate-950/50 text-muted-foreground font-semibold"
                            />
                          </td>
                          <td className="py-3.5 pr-3">
                            <select
                              value={edit.adminRole ?? admin.adminRole ?? "COUNTER"}
                              onChange={(event) => updateEdit(admin.id, { adminRole: event.target.value as AdminRole })}
                              className="h-9 w-full rounded-lg border border-input bg-white/50 dark:bg-slate-950/50 px-2.5 text-xs font-semibold outline-none focus-visible:border-primary/50 transition-all"
                            >
                              {ADMIN_ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 pr-3 text-center">
                            <button
                              type="button"
                              onClick={() => updateEdit(admin.id, { isActive: !isActive })}
                              className="cursor-pointer outline-none transition-transform active:scale-95"
                            >
                              <Badge variant={isActive ? "default" : "secondary"} className={cn("font-bold text-[10px] px-2 py-0.5 rounded-full border-none", isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground")}>
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                            </button>
                          </td>
                          <td className="py-3.5 pr-2">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                                onClick={() => saveAdmin(admin)}
                                disabled={updateMutation.isPending}
                                aria-label="Save admin"
                              >
                                <Save className="size-4" />
                              </Button>
                              {admin.isActive ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-95"
                                  onClick={() => deactivateMutation.mutate(admin.id)}
                                  disabled={deactivateMutation.isPending}
                                  aria-label="Deactivate admin"
                                >
                                  <Ban className="size-4" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
                                  onClick={() => updateMutation.mutate({ id: admin.id, payload: { isActive: true } })}
                                  disabled={updateMutation.isPending}
                                  aria-label="Reactivate admin"
                                >
                                  <RotateCcw className="size-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit / Timeline activity list */}
        <Card className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Activity className="size-5 text-primary" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {auditQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : (
              <div className="relative pl-6 border-l border-slate-100 dark:border-white/5 space-y-6">
                {(auditQuery.data ?? []).map((log) => {
                  const targetName =
                    log.details.after?.name ??
                    (log.details.targetUserId ? adminNameById.get(log.details.targetUserId) : null);
                  return (
                    <div key={log.id} className="relative group animate-fade-in">
                      {/* Timeline dot */}
                      <span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-primary border-2 border-white dark:border-slate-900 group-hover:scale-125 transition-transform" />
                      
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-sm text-foreground leading-tight">
                          {actionLabel(log.action)}
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold">
                          By {log.user.name}{targetName ? ` for ${targetName}` : ""}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {log.details.changedFields && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.details.changedFields.map((field) => (
                            <Badge key={field} variant="secondary" className="text-[9px] font-bold px-1.5 py-0">
                              {field}
                            </Badge>
                          ))}
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
    </div>
  );
}
