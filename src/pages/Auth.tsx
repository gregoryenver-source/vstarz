import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/PhoneInput";
import { VStarzLogo } from "@/components/VStarzLogo";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { COUNTRY_CODES, toE164, type CountryDialingCode } from "@/lib/countryCodes";
import { OAuthButtons } from "@/components/OAuthButtons";
import type { MetaProvider } from "@/components/OAuthButtons";
import {
  Sparkles,
  Loader2,
  Mail,
  Phone,
  ArrowRight,
  UserX,
  KeyRound,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useMutation } from "convex/react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function storedCountry(): CountryDialingCode {
  try {
    const iso = localStorage.getItem("vstarz:country");
    return COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0];
  } catch {
    return COUNTRY_CODES[0];
  }
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const completeSignup = useMutation(api.users.completePhoneSignup);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  // ?connect=facebook|instagram deep link — starts that provider's OAuth
  // handoff automatically (used by the homepage "connect" icons).
  const connectParam = searchParams.get("connect");
  const autoConnect: MetaProvider | null =
    connectParam === "facebook" || connectParam === "instagram"
      ? connectParam
      : null;
  const clearConnect = () => {
    if (!autoConnect) return;
    searchParams.delete("connect");
    navigate(
      { pathname: "/auth", search: searchParams.toString() },
      { replace: true },
    );
  };

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<
    "identify" | "otp" | "profile" | "forgot"
  >("identify");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryDialingCode>(() =>
    storedCountry(),
  );
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [profile, setProfile] = useState({ name: "", email2: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && step !== "profile") {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect, step]);

  // ── Step 1: request the OTP ────────────────────────────────────────────
  const handlePhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const e164 = toE164(country.code, phone);
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      setError("Please enter a valid mobile number for the selected country.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("phone", e164);
      await signIn("phone-otp", formData);
      setStep("otp");
      toast.success(`Code sent to ${e164}`);
    } catch (err) {
      console.error("Phone sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send the verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setEmail(formData.get("email") as string);
      setStep("otp");
    } catch (err) {
      console.error("Email sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: verify the OTP ─────────────────────────────────────────────
  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (method === "phone") {
        formData.set("phone", toE164(country.code, phone));
      } else {
        formData.set("email", email);
      }
      formData.set("code", otp);
      await signIn(method === "phone" ? "phone-otp" : "email-otp", formData);
      setStep("profile");
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("The verification code you entered is incorrect or expired.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: capture sign-up details ────────────────────────────────────
  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const name = profile.name.trim();
      if (!name) {
        throw new Error("Please enter your name.");
      }
      await completeSignup({
        name,
        country: country.iso,
        email: profile.email2.trim() || undefined,
      });
      toast.success(`Welcome to the stage, ${name}!`);
      navigate(redirect);
    } catch (err) {
      console.error("Profile capture error:", err);
      setError(
        err instanceof Error ? err.message : "Could not save your details.",
      );
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (method === "phone") {
        formData.set("phone", toE164(country.code, phone));
        await signIn("phone-otp", formData);
      } else {
        formData.set("email", email);
        await signIn("email-otp", formData);
      }
      setOtp("");
      toast.success("A fresh code is on its way.");
    } catch (err) {
      console.error("Resend error:", err);
      setError("Could not resend the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (err) {
      console.error("Guest login error:", err);
      setError(
        `Failed to sign in as guest: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  const maskedPhone = toE164(country.code, phone);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="pointer-events-none absolute inset-0 bg-stage-grid opacity-40" />
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <VStarzLogo className="h-12 w-auto" glow={false} />
          </div>

          <Card className="card-spot shadow-2xl">
            {step === "identify" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl">
                    Step onto the stage
                  </CardTitle>
                  <CardDescription>
                    Sign up or sign in with your mobile number — we'll text you
                    a secure code. No passwords, ever.
                  </CardDescription>
                </CardHeader>

                <div className="px-6 pb-1">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    <Button
                      type="button"
                      variant={method === "phone" ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMethod("phone")}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Mobile
                    </Button>
                    <Button
                      type="button"
                      variant={method === "email" ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMethod("email")}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </Button>
                  </div>
                </div>

                {method === "phone" ? (
                  <form onSubmit={handlePhoneSubmit}>
                    <CardContent className="space-y-4">
                      <PhoneInput
                        value={phone}
                        onChange={(v) => setPhone(v)}
                        country={country}
                        onCountryChange={setCountry}
                        disabled={isLoading}
                      />
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <Button
                        type="submit"
                        className="w-full gap-2 font-semibold"
                        disabled={isLoading || phone.replace(/\D/g, "").length < 6}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Send SMS code
                      </Button>
                    </CardContent>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSubmit}>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          name="email"
                          placeholder="name@example.com"
                          type="email"
                          className="pl-9"
                          disabled={isLoading}
                          required
                        />
                      </div>
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <Button
                        type="submit"
                        className="w-full gap-2 font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Continue with email
                      </Button>
                    </CardContent>
                  </form>
                )}

                <CardContent className="space-y-3 pt-0">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <OAuthButtons redirectTo={redirect} autoStart={autoConnect} onAutoStarted={clearConnect} />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="h-4 w-4" />
                    Continue as guest
                  </Button>
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Connecting with Facebook or Instagram? Approve VStarz once
                    and you're in — your account links automatically.
                  </p>
                </CardContent>
              </>
            )}

            {step === "otp" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl">
                    {method === "phone" ? "Confirm your number" : "Check your email"}
                  </CardTitle>
                  <CardDescription>
                    {method === "phone"
                      ? `We sent a 6-digit code by SMS to ${maskedPhone}`
                      : `We sent a 6-digit code to ${email}`}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="text-sm text-red-400 text-center">{error}</p>
                    )}
                    <p className="text-sm text-muted-foreground text-center">
                      Didn't receive a code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={handleResend}
                        disabled={isLoading}
                      >
                        Resend
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Verify code
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep("identify");
                        setOtp("");
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Use a different {method === "phone" ? "number" : "email"}
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}

            {step === "profile" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl flex items-center justify-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    You're verified!
                  </CardTitle>
                  <CardDescription>
                    Tell us who you are so fans and judges can find you.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleProfileSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Stage or real name
                      </label>
                      <Input
                        value={profile.name}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Thandi M"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Country
                      </label>
                      <select
                        value={country.iso}
                        onChange={(e) => {
                          const next = COUNTRY_CODES.find(
                            (c) => c.iso === e.target.value,
                          );
                          if (next) setCountry(next);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        disabled={isLoading}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.iso} value={c.iso}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Email <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        type="email"
                        value={profile.email2}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, email2: e.target.value }))
                        }
                        placeholder="name@example.com"
                        disabled={isLoading}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add an email for backup sign-in and announcements.
                      </p>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full gap-2 font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Enter the stage
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}

            {step === "forgot" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl flex items-center justify-center gap-2">
                    <KeyRound className="size-5 text-primary" />
                    Reset access
                  </CardTitle>
                  <CardDescription>
                    VStarz uses passwordless codes — just re-enter your mobile
                    number or email and we'll send a fresh one. No password to
                    forget.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full font-semibold"
                    onClick={() => setStep("identify")}
                  >
                    Back to sign in
                  </Button>
                </CardContent>
              </>
            )}

            <div className="py-4 px-6 text-xs text-center text-muted-foreground border-t border-border/60 rounded-b-lg">
              New to VStarz? Creating an account takes under a minute.{" "}
              <Link
                to="/"
                className="underline hover:text-primary transition-colors"
              >
                Back to home
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
