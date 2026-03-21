import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Mic } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsAdmin } from "../hooks/useQueries";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoggedIn = loginStatus === "success" && !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  useEffect(() => {
    if (!isLoggedIn || adminLoading) return;
    if (isAdmin) {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }, [isLoggedIn, isAdmin, adminLoading, navigate]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2
          className="w-8 h-8 animate-spin text-primary"
          data-ocid="login.loading_state"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Dot grid bg decoration */}
      <div className="dot-grid fixed inset-0 opacity-40 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-hero">
            <Mic className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            Pack Voice
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Daily reports for modern teams
          </p>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in with your Internet Identity to access your reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isLoggedIn ? (
              <Button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="login.primary_button"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in with Internet Identity"
                )}
              </Button>
            ) : (
              <div
                className="text-center space-y-3"
                data-ocid="login.success_state"
              >
                <p className="text-sm text-muted-foreground">
                  Redirecting you to the right dashboard...
                </p>
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            )}

            {loginStatus === "loginError" && (
              <p
                className="text-sm text-destructive text-center"
                data-ocid="login.error_state"
              >
                Login failed. Please try again.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <a href="/" className="hover:text-primary underline">
            ← Back to home
          </a>
        </p>
      </motion.div>
    </div>
  );
}
