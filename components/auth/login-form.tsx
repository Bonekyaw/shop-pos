"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp";

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      toast.error("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      // Check if email is admin
      const checkRes = await fetch("/api/auth/check-admin", {
        method: "POST",
        body: JSON.stringify({ email: normalized }),
        headers: { "Content-Type": "application/json" },
      });
      const { isAdmin } = await checkRes.json();

      if (!isAdmin) {
        toast.error("Access denied", {
          description: "This email does not have admin privileges or is inactive.",
        });
        return;
      }

      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: normalized,
        type: "sign-in",
      });
      if (error) {
        throw new Error(error.message ?? "Could not send code");
      }
      setEmail(normalized);
      setStep("otp");
      setOtp("");
      toast.success("Check your email", {
        description: "We sent a 6-digit code to your inbox.",
      });
    } catch (err) {
      console.error("Sign-in error:", err);
      toast.error("Sign-in request failed", {
        description: "An error occurred while requesting your sign-in code.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const { error: signError } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (signError) {
        throw new Error(signError.message ?? "Invalid code");
      }

      const ex = await fetch("/api/auth/exchange-session", {
        method: "POST",
        credentials: "include",
      });
      if (!ex.ok) {
        throw new Error("Session exchange failed");
      }

      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Verification failed", {
        description: "The code may be wrong or expired. Request a new one from the previous step.",
      });
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50/50 dark:bg-slate-950 p-4 transition-colors duration-500">
      {/* Decorative floating blur circles */}
      <div className="absolute top-1/4 left-1/4 size-[300px] md:size-[400px] rounded-full bg-primary/10 blur-[80px] md:blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-[350px] md:size-[500px] rounded-full bg-violet-500/10 blur-[100px] md:blur-[120px] animate-pulse pointer-events-none [animation-delay:2s]" />

      <Card className="w-full max-w-md border border-white/20 dark:border-white/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden z-10 transition-all duration-300">
        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-primary/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <ChefHat className="size-9 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-gradient">
            FutureLink POS
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium px-4">
            {step === "email"
              ? "Enter your admin email to receive a sign-in code"
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          {step === "email" ? (
            <form onSubmit={handleSendEmail} className="space-y-6 animate-fade-in">
              <label className="block space-y-2 text-left">
                <span className="text-sm font-bold text-foreground/80 tracking-wide">Admin Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 focus-visible:bg-white dark:focus-visible:bg-slate-950 transition-all duration-300"
                />
              </label>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <Loader2 className="animate-spin size-6" />
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`size-12 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all duration-300 ${
                      otp.length > i
                        ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary shadow-sm scale-105"
                        : "border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-muted-foreground"
                    }`}
                  >
                    {otp[i] ? otp[i] : ""}
                  </div>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="sr-only"
                disabled={loading}
              />

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "←"].map((num) => (
                  <Button
                    key={num.toString()}
                    type="button"
                    variant="outline"
                    className="h-12 text-xl font-bold rounded-xl border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all active:scale-95 duration-200"
                    onClick={() => {
                      if (num === "C") setOtp("");
                      else if (num === "←") setOtp(otp.slice(0, -1));
                      else if (otp.length < 6)
                        setOtp(otp + num.toString());
                    }}
                    disabled={loading}
                  >
                    {num}
                  </Button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
                  disabled={otp.length !== 6 || loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin size-6" />
                  ) : (
                    "Verify & sign in"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
