import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  LogOut,
  Mic,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Report, ReportStatus } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useReportsByDate,
  useReportsForToday,
  useTeamStatus,
} from "../hooks/useQueries";

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts / 1_000_000n));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function dateToBigInt(dateStr: string): bigint {
  // Convert YYYY-MM-DD to nanoseconds timestamp (midnight UTC)
  const d = new Date(`${dateStr}T00:00:00Z`);
  return BigInt(d.getTime()) * 1_000_000n;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { clear } = useInternetIdentity();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateString());
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const { data: teamStatus, isLoading: teamLoading } = useTeamStatus();
  const { data: todayReports, isLoading: todayLoading } = useReportsForToday();
  const { data: dateReports, isLoading: dateLoading } = useReportsByDate(
    selectedDate ? dateToBigInt(selectedDate) : null,
  );

  const handleLogout = () => {
    clear();
    navigate({ to: "/" });
  };

  const submitted =
    teamStatus?.filter((m: ReportStatus) => m.hasSubmittedToday).length ?? 0;
  const total = teamStatus?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-soft">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Pack Voice</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Admin
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-ocid="nav.logout.button"
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-extrabold text-foreground mb-1">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="border-border shadow-soft">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {total}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Team Members
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-soft">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {submitted}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted Today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-soft">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {total - submitted}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="today" className="space-y-6">
            <TabsList className="bg-secondary" data-ocid="admin.tab">
              <TabsTrigger value="today" data-ocid="admin.today.tab">
                Today's Status
              </TabsTrigger>
              <TabsTrigger value="reports" data-ocid="admin.reports.tab">
                Browse Reports
              </TabsTrigger>
            </TabsList>

            {/* Today's team status tab */}
            <TabsContent value="today">
              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Team Status — Today
                  </CardTitle>
                  <CardDescription>
                    Who has submitted their daily report.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamLoading ? (
                    <div
                      className="flex justify-center py-12"
                      data-ocid="team.loading_state"
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !teamStatus || teamStatus.length === 0 ? (
                    <div
                      className="text-center py-12"
                      data-ocid="team.empty_state"
                    >
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No team members found.
                      </p>
                    </div>
                  ) : (
                    <Table data-ocid="team.table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamStatus.map((member: ReportStatus, idx: number) => (
                          <TableRow
                            key={member.user.toString()}
                            data-ocid={`team.row.${idx + 1}`}
                          >
                            <TableCell className="font-medium">
                              {member.userName || "Unknown"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {member.user.toString().slice(0, 16)}...
                            </TableCell>
                            <TableCell>
                              {member.hasSubmittedToday ? (
                                <Badge className="bg-green-100 text-green-700 border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-yellow-700 border-yellow-300"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Today's submitted reports */}
              <div className="mt-6">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Reports Submitted Today
                </h2>
                {todayLoading ? (
                  <div
                    className="flex justify-center py-8"
                    data-ocid="today_reports.loading_state"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !todayReports || todayReports.length === 0 ? (
                  <Card className="border-border shadow-soft">
                    <CardContent
                      className="py-10 text-center"
                      data-ocid="today_reports.empty_state"
                    >
                      <p className="text-muted-foreground">
                        No reports submitted yet today.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {todayReports.map((report: Report, idx: number) => (
                      <Card
                        key={report.id}
                        className="border-border shadow-soft"
                        data-ocid={`today_reports.item.${idx + 1}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm">
                                {formatDate(report.createdAt)}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {report.author.toString().slice(0, 20)}...
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {report.hasVoiceTranscript && (
                                <Badge variant="secondary" className="text-xs">
                                  <Mic className="w-3 h-3 mr-1" />
                                  Voice
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedReport(
                                    expandedReport === report.id
                                      ? null
                                      : report.id,
                                  )
                                }
                                data-ocid={`today_reports.edit_button.${idx + 1}`}
                              >
                                {expandedReport === report.id ? "Hide" : "View"}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {expandedReport === report.id && (
                          <>
                            <Separator />
                            <CardContent className="pt-3">
                              <p className="text-sm text-foreground whitespace-pre-wrap">
                                {report.content}
                              </p>
                            </CardContent>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Browse reports by date tab */}
            <TabsContent value="reports">
              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Reports by Date
                  </CardTitle>
                  <CardDescription>
                    Select a date to view all reports submitted on that day.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Label
                      htmlFor="date-picker"
                      className="text-sm font-medium mb-2 block"
                    >
                      Select Date
                    </Label>
                    <Input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="max-w-xs"
                      data-ocid="reports.date.input"
                    />
                  </div>

                  {dateLoading ? (
                    <div
                      className="flex justify-center py-12"
                      data-ocid="date_reports.loading_state"
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !dateReports || dateReports.length === 0 ? (
                    <div
                      className="text-center py-10"
                      data-ocid="date_reports.empty_state"
                    >
                      <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No reports found for this date.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dateReports.map((report: Report, idx: number) => (
                        <Card
                          key={report.id}
                          className="border-border shadow-soft"
                          data-ocid={`date_reports.item.${idx + 1}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm">
                                  {report.author.toString().slice(0, 20)}...
                                </CardTitle>
                              </div>
                              <div className="flex gap-2 items-center">
                                {report.hasVoiceTranscript && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Mic className="w-3 h-3 mr-1" />
                                    Voice
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedReport(
                                      expandedReport === report.id
                                        ? null
                                        : report.id,
                                    )
                                  }
                                  data-ocid={`date_reports.edit_button.${idx + 1}`}
                                >
                                  {expandedReport === report.id
                                    ? "Hide"
                                    : "View"}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {expandedReport === report.id && (
                            <>
                              <Separator />
                              <CardContent className="pt-3">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {report.content}
                                </p>
                              </CardContent>
                            </>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
