import { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarRange,
  ChevronDown,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  LogIn,
  LogOut,
  MessageSquare,
  MousePointerClick,
  Plus,
  Search,
  Sparkles,
  User,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScheduleStats } from "@/types/scheduler";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HeaderProps {
  stats: ScheduleStats;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onFeedbackClick: () => void;
  scenarioSwitcher?: ReactNode;
}

export function Header({
  stats,
  isLoggedIn,
  onLoginClick,
  onLogoutClick,
  onFeedbackClick,
  scenarioSwitcher,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Title + (optional) Scenario switcher */}
        <div className="flex items-center gap-3">
          <img
            alt="Stern Scheduler"
            className="h-10 w-10 object-contain"
            style={{ aspectRatio: "1 / 1" }}
            src="/lovable-uploads/e287b438-2d2a-4de1-8854-36cfe5fa2caa.png"
          />
          <h1 className="text-2xl font-bold text-primary">Stern Scheduler</h1>
          {scenarioSwitcher && (
            <>
              <Separator orientation="vertical" className="h-6" />
              {scenarioSwitcher}
            </>
          )}
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Credits:</span>
            <span className="text-lg font-bold text-primary">{stats.totalCredits.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-event-internship-foreground" />
            <span className="text-sm font-medium">Internship:</span>
            <span className="text-lg font-bold" style={{ color: "hsl(var(--event-internship-foreground))" }}>
              {stats.internshipHours.toFixed(1)}h
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-event-recruiting-foreground" />
            <span className="text-sm font-medium">Recruiting:</span>
            <span className="text-lg font-bold" style={{ color: "hsl(var(--event-recruiting-foreground))" }}>
              {stats.recruitingHours.toFixed(1)}h
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-6">
            <Calculator className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Total Load:</span>
            <span className="text-lg font-bold text-primary">{stats.totalScheduledLoad.toFixed(1)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onFeedbackClick}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Feedback
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                User Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  How to Use Stern Scheduler
                </DialogTitle>
                <DialogDescription>
                  Build, swap, and stress-test your semester schedule on a single calendar.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {/* Card 1: Find courses */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Search className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Find courses</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Search by name or instructor; filter by subject, credits, duration, or meeting time.</li>
                    <li><strong className="text-foreground">Click any slot</strong> on the calendar to filter the right panel to courses meeting at that time.</li>
                    <li><strong className="text-foreground">Hover</strong> a course title for the catalog description; click <ExternalLink className="inline h-3 w-3 -mt-0.5" /> for the syllabus.</li>
                  </ul>
                </div>

                {/* Card 2: Add a course */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Plus className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Add a course</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Click the <Plus className="inline h-3 w-3 -mt-0.5 mx-0.5" /> button on any course in the right panel.</li>
                    <li>Or <strong className="text-foreground">double-click an empty slot</strong> and switch to the <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Pick a Course</span> tab.</li>
                  </ul>
                </div>

                {/* Card 3: Manage on calendar */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MousePointerClick className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Manage on the calendar</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li><strong className="text-foreground">Click a course block</strong> to see details, swap sections, or browse other courses at the same time.</li>
                    <li><strong className="text-foreground">Click a custom block</strong> to edit or delete it; drag or resize to adjust.</li>
                    <li>Conflicting options are flagged with a red <span className="inline-flex items-center rounded bg-destructive/15 text-destructive px-1.5 py-0 text-[10px] font-medium">Conflict</span> badge.</li>
                  </ul>
                </div>

                {/* Card 4: Custom blocks */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <CalendarRange className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Custom blocks</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-event-internship text-event-internship-foreground">
                      <Briefcase className="h-3 w-3" /> Internship
                    </span>
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-event-recruiting text-event-recruiting-foreground">
                      <BookOpen className="h-3 w-3" /> Recruiting
                    </span>
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-event-personal text-event-personal-foreground">
                      <User className="h-3 w-3" /> Personal
                    </span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li><strong className="text-foreground">Double-click an empty slot</strong>, pick the type and day chips (M T W R F Sa Su — multiple OK).</li>
                    <li>"Study MWF 2-4pm" is <strong className="text-foreground">one submit, three blocks</strong>.</li>
                  </ul>
                </div>

                {/* Card 5: Plan A / Plan B */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Plan A / Plan B</h4>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                    Plan A <ChevronDown className="h-3 w-3" />
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Use the switcher next to the logo (logged in) to keep parallel schedule drafts.</li>
                    <li><strong className="text-foreground">Duplicate</strong> the current scenario to branch off, then tweak it; <strong className="text-foreground">switch</strong> any time to compare.</li>
                  </ul>
                </div>

                {/* Card 6: Stats & off-calendar */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-sm">Stats &amp; off-calendar</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    <li>Header tracks credits, internship hrs, recruiting hrs, and total scheduled load — updating live.</li>
                    <li><strong className="text-foreground">Intensive</strong> (INS/INW) and <strong className="text-foreground">DBi</strong> (XTL) courses don't recur weekly; they appear in the <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Off-Calendar Courses</span> table below the calendar.</li>
                  </ul>
                </div>
              </div>

              <p className="text-muted-foreground text-xs italic pt-3 mt-4 border-t border-border">
                Note: Please double check course schedules and availability in Albert.
              </p>
            </DialogContent>
          </Dialog>

          {isLoggedIn ? (
            <Button variant="outline" size="sm" onClick={onLogoutClick}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button size="sm" onClick={onLoginClick}>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}