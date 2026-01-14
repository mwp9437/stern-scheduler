import { BookOpen, Clock, Briefcase, HelpCircle, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleStats } from "@/types/scheduler";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HeaderProps {
  stats: ScheduleStats;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export function Header({ stats, isLoggedIn, onLoginClick, onLogoutClick }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="Stern Scheduler" className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-primary">Stern Scheduler</h1>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Total Credits:</span>
            <span className="text-lg font-bold text-primary">{stats.totalCredits}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-event-internship-foreground" />
            <span className="text-sm font-medium">Internship Hours:</span>
            <span className="text-lg font-bold" style={{ color: "hsl(var(--event-internship-foreground))" }}>
              {stats.internshipHours.toFixed(1)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-event-recruiting-foreground" />
            <span className="text-sm font-medium">Recruiting/Study Hours:</span>
            <span className="text-lg font-bold" style={{ color: "hsl(var(--event-recruiting-foreground))" }}>
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
                  <p className="text-muted-foreground">
                    Use the search bar and filters on the right panel to find courses. 
                    Click "Add" to add them to your schedule.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">2. Add Custom Blocks</h4>
                  <p className="text-muted-foreground">
                    Double-click any empty time slot on the calendar to add custom events 
                    like Internships, Recruiting/Study time, or Personal blocks.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">3. Alternate Schedule Courses</h4>
                  <p className="text-muted-foreground">
                    Courses with "Alternate Schedule" timing appear in the table below 
                    the calendar instead of on the calendar grid.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">4. Adjust Events</h4>
                  <p className="text-muted-foreground">
                    Drag the edges of custom events to adjust their start and end times.
                  </p>
                </div>
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
