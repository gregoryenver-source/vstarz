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

import { VStarzLogo } from "@/components/VStarzLogo";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Star, Loader2, Mail, ArrowRight, UserX, KeyRound } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

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

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | "otp" | "forgot">("signIn");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setEmail(formData.get("email") as string);
      setStep("otp");
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="pointer-events-none absolute inset-0 bg-stage-grid opacity-40" />
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <VStarzLogo className="size-12" glow={false} />
            <div className="leading-none">
              <span className="font-display text-3xl font-bold">
                VStarz
              </span>
              <span className="block font-mont text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Powered by Roc Nation Africa
              </span>
            </div>
          </div>

          <Card className="card-spot shadow-2xl">
            {step === "signIn" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl">
                    Step onto the stage
                  </CardTitle>
                  <CardDescription>
                    Enter your email to sign in or create your account — new
                    members can post an audition in minutes.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleEmailSubmit}>
                  <CardContent className="space-y-4">
                    <div className="relative flex-1">
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

                    <div className="grid gap-2">
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
                        Google &amp; Apple sign-in arrive with the mobile apps.
                      </p>
                    </div>
                  </CardContent>
                </form>
              </>
            )}

            {step === "otp" && (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl">
                    Check your email
                  </CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to {email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="space-y-4">
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="code" value={otp} />
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
                        onClick={() => setStep("signIn")}
                      >
                        Try again
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
                          Verify code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Use a different email
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
                    vStarz uses passwordless codes — just re-enter your email
                    and we'll send a fresh sign-in code. No password to forget.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full font-semibold"
                    onClick={() => setStep("signIn")}
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
