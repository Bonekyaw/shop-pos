import { Metadata } from "next";
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Settings | FutureLink POS",
  description: "Manage your account and preferences",
};

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gradient">Settings</h1>
        <p className="text-muted-foreground font-medium mt-1">
          Manage your account settings and application preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        {/* Navigation */}
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start font-bold bg-primary/10 text-primary">
            <User className="size-4 mr-2" />
            General
          </Button>
          <Button variant="ghost" className="justify-start font-semibold text-muted-foreground">
            <Bell className="size-4 mr-2" />
            Notifications
          </Button>
          <Button variant="ghost" className="justify-start font-semibold text-muted-foreground">
            <Shield className="size-4 mr-2" />
            Security
          </Button>
          <Button variant="ghost" className="justify-start font-semibold text-muted-foreground">
            <Palette className="size-4 mr-2" />
            Appearance
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="size-5 text-primary" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold">Display Name</Label>
                <Input id="name" defaultValue="Admin User" className="bg-white/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="font-bold">Email Address</Label>
                <Input id="email" type="email" defaultValue="admin@futurelink.com" disabled className="bg-slate-100 opacity-50" />
              </div>
              <Button className="font-bold shadow-lg shadow-primary/20">Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Restaurant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="res-name" className="font-bold">Restaurant Name</Label>
                <Input id="res-name" defaultValue="FutureLink Main Outlet" className="bg-white/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="res-addr" className="font-bold">Address</Label>
                <Input id="res-addr" defaultValue="123 default st, city" className="bg-white/50" />
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Button className="font-bold shadow-lg shadow-primary/20">Update Store</Button>
              </div>
            </CardContent>
          </Card>

          <Separator className="opacity-10" />
          
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground italic">
              FutureLink POS Admin Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
