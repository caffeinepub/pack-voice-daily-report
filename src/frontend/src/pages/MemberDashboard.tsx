import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  FileText,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Send,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Report } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useMyReports,
  useSubmitReport,
} from "../hooks/useQueries";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts / 1_000_000n));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { clear, identity } = useInternetIdentity();
  const { data: profile } = useCallerProfile();
  const { data: reports, isLoading: reportsLoading } = useMyReports();
  const { mutate: submitReport, isPending: submitting } = useSubmitReport();

  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const toggleVoice = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error("Voice recognition is not supported in your browser.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setUsedVoice(true);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      toast.error(`Voice error: ${e.error}`);
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [isRecording]);

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please write or record your daily report first.");
      return;
    }
    submitReport(
      { content: content.trim(), hasVoiceTranscript: usedVoice },
      {
        onSuccess: () => {
          toast.success("Report submitted successfully!");
          setContent("");
          setUsedVoice(false);
        },
        onError: () =>
          toast.error("Failed to submit report. Please try again."),
      },
    );
  };

  const handleLogout = () => {
    clear();
    navigate({ to: "/" });
  };

  const displayName =
    profile?.name ||
    `${identity?.getPrincipal().toString().slice(0, 8)}...` ||
    "Member";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-soft">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Pack Voice</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Hello, {displayName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-ocid="nav.logout.button"
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-extrabold text-foreground mb-1">
            Your Daily Report
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Submit form */}
          <Card className="border-border shadow-card mb-8">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Today's Update
              </CardTitle>
              <CardDescription>
                What did you work on today? Use voice or text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Share what you accomplished today, any blockers, and your plans for tomorrow..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-36 resize-none pr-14"
                  data-ocid="report.textarea"
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`absolute right-3 top-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-accent/60 text-foreground hover:bg-accent"
                  }`}
                  data-ocid="report.voice_toggle"
                  aria-label={
                    isRecording ? "Stop recording" : "Start voice input"
                  }
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
              {isRecording && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Recording... speak clearly, then click the mic to stop.
                </p>
              )}
              {usedVoice && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" /> Voice transcript
                  added
                </p>
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="report.submit_button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Past reports */}
          <h2 className="text-lg font-bold text-foreground mb-4">
            Past Reports
          </h2>
          {reportsLoading ? (
            <div
              className="flex justify-center py-12"
              data-ocid="reports.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !reports || reports.length === 0 ? (
            <Card className="border-border shadow-soft">
              <CardContent
                className="py-12 text-center"
                data-ocid="reports.empty_state"
              >
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No reports yet. Submit your first update above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {[...reports]
                  .sort((a, b) => Number(b.createdAt - a.createdAt))
                  .map((report: Report, idx) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      data-ocid={`reports.item.${idx + 1}`}
                    >
                      <Card className="border-border shadow-soft">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">
                              {formatDate(report.createdAt)}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {report.hasVoiceTranscript && (
                                <Badge variant="secondary" className="text-xs">
                                  <Mic className="w-3 h-3 mr-1" />
                                  Voice
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {report.content}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
