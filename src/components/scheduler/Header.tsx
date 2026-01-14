import { BookOpen, Clock, Briefcase, HelpCircle, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleStats } from "@/types/scheduler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
interface HeaderProps {
  stats: ScheduleStats;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}
export function Header({
  stats,
  isLoggedIn,
  onLoginClick,
  onLogoutClick
}: HeaderProps) {
  return <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img alt="Stern Scheduler" className="h-10 w-10 object-contain" style={{
          aspectRatio: "1 / 1"
        }} src="/lovable-uploads/e287b438-2d2a-4de1-8854-36cfe5fa2caa.png" />
          <h1 className="text-2xl font-bold text-primary">Stern Scheduler</h1>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Total Credits:</span>
            <span className="text-lg font-bold text-primary">{stats.totalCredits.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-event-internship-foreground" />
            <span className="text-sm font-medium">Internship Hours:</span>
            <span className="text-lg font-bold" style={{
            color: "hsl(var(--event-internship-foreground))"
          }}>
              {stats.internshipHours.toFixed(1)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-event-recruiting-foreground" />
            <span className="text-sm font-medium">Recruiting/Study Hours:</span>
            <span className="text-lg font-bold" style={{
            color: "hsl(var(--event-recruiting-foreground))"
          }}>
              {stats.recruitingHours.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                User Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How to Use Stern Scheduler</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">1. Search & Add Courses</h4>
                  <p className="text-muted-foreground mb-2">
                    a. Use the search bar and filters on the right panel to find courses. Search by course name or professor.
                  </p>
                  <p className="text-muted-foreground mb-2">
                    b. <strong>Filter by Time Slot:</strong> Single-click a time slot on the calendar to filter courses in the course finder.
                  </p>
                  <p className="text-muted-foreground mb-2">
                    c. Click "Add" to add a course to your schedule.
                  </p>
                  <p className="text-muted-foreground text-xs italic">
                    Note: Courses with "Alternate Schedule" timing appear in the table below the calendar instead.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Add Custom Blocks</h4>
                  <p className="text-muted-foreground">
                    Double-click any empty time slot on the calendar to add custom blocks like Internships, Recruiting/Study time, or Personal blocks.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Review Summary Stats</h4>
                  <p className="text-muted-foreground">
                    Review the summary statistics at the top of the calendar.
                  </p>
                </div>
                <p className="text-muted-foreground text-xs italic pt-2 border-t border-border">
                  Note: Please double check course schedules and availability in Albert.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {isLoggedIn ? <Button variant="outline" size="sm" onClick={onLogoutClick}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button> : <Button size="sm" onClick={onLoginClick}>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>}
        </div>
      </div>
    </header>;
}