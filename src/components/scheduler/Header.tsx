import { ReactNode } from "react";
import { BookOpen, Clock, Briefcase, HelpCircle, LogIn, LogOut, Calculator, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScheduleStats } from "@/types/scheduler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>How to Use Stern Scheduler</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">1. Find courses</h4>
                  <p className="text-muted-foreground mb-1">
                    a. Search by course name or professor in the right panel; filter by subject, credits, duration, or meeting time.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    b. <strong>Click any time slot</strong> on the calendar to filter the right panel to courses meeting at that day/time.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    c. <strong>Hover</strong> a course title for the full catalog description; click the link icon for the syllabus (NYU login required).
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">2. Add a course to your schedule</h4>
                  <p className="text-muted-foreground mb-1">
                    a. Click the <strong>+</strong> button on any course in the right panel.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    b. Or <strong>double-click an empty slot</strong> and switch to the <strong>"Pick a Course"</strong> tab to choose from courses that meet at that time.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">3. Manage a course on the calendar</h4>
                  <p className="text-muted-foreground mb-1">
                    Click any course block to open its details. From there you can <strong>remove it</strong> or <strong>swap to another section</strong> of the same course in one click. Conflicting sections are flagged with a red badge.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">4. Custom blocks (internship, recruiting, personal)</h4>
                  <p className="text-muted-foreground mb-1">
                    a. Double-click an empty slot. Pick the block type, the day chips (M T W R F Sa Su — <strong>select multiple at once</strong>), and start/end time.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    b. "Study MWF 2-4pm" is one submit, three blocks.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    c. <strong>Drag or resize</strong> a block on the calendar; <strong>click it</strong> to edit type, time, or delete.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">5. Multiple scenarios (Plan A / Plan B)</h4>
                  <p className="text-muted-foreground mb-1">
                    Use the <strong>scenario switcher</strong> next to the logo (visible when logged in) to keep parallel drafts.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    Create new scenarios, <strong>duplicate</strong> the current one to branch off, rename, or delete. Each scenario has its own courses and custom blocks — switch at any time to compare.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">6. Stats and off-calendar courses</h4>
                  <p className="text-muted-foreground mb-1">
                    The header tracks total credits, internship hours, recruiting hours, and total scheduled load — all updating live as you add or swap.
                  </p>
                  <p className="text-muted-foreground mb-1">
                    Intensive (INS/INW) and DBi (XTL) courses don't recur weekly; selected ones appear in the <strong>Off-Calendar Courses</strong> table below the calendar with their actual date range.
                  </p>
                </div>

                <p className="text-muted-foreground text-xs italic pt-2 border-t border-border">
                  Note: Please double check course schedules and availability in Albert.
                </p>
              </div>
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