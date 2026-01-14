import { useState, useMemo, useCallback, useEffect } from "react";
import { SlotInfo } from "react-big-calendar";
import { Header } from "@/components/scheduler/Header";
import { Footer } from "@/components/scheduler/Footer";
import { ScheduleCalendar } from "@/components/scheduler/ScheduleCalendar";
import { CourseFinder } from "@/components/scheduler/CourseFinder";
import { AlternateSchedulesTable } from "@/components/scheduler/AlternateSchedulesTable";
import { AddEventModal } from "@/components/scheduler/AddEventModal";
import { AuthModal } from "@/components/scheduler/AuthModal";
import { useCourses, getUniqueSubjects } from "@/hooks/useCourses";
import { useUserSchedule } from "@/hooks/useUserSchedule";
import { useAuth } from "@/hooks/useAuth";
import { ScheduleStats, TimeSlotFilter } from "@/types/scheduler";
import { getDay, getHours, getMinutes } from "date-fns";

const Index = () => {
  const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const {
    selectedCourseIds,
    customEvents,
    toggleCourse,
    addCustomEvent,
    calculateStats,
    getAlternateScheduleCourses,
  } = useUserSchedule(user?.id);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [courseFinderCollapsed, setCourseFinderCollapsed] = useState(false);
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlotFilter | null>(null);

  const subjects = useMemo(() => getUniqueSubjects(courses), [courses]);
  const stats: ScheduleStats = useMemo(() => calculateStats(courses), [calculateStats, courses]);
  const alternateScheduleCourses = useMemo(() => getAlternateScheduleCourses(courses), [getAlternateScheduleCourses, courses]);

  // Auto-close auth modal when user logs in
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
    }
  }, [user]);

  // Handle single-click on slot - filter courses
  const handleSlotSelect = useCallback((slotInfo: SlotInfo) => {
    const day = getDay(slotInfo.start);
    const hour = getHours(slotInfo.start);
    const minute = getMinutes(slotInfo.start);
    
    setTimeSlotFilter({ day, hour, minute });
  }, []);

  // Handle double-click on slot - open modal
  const handleSlotDoubleClick = useCallback((slotInfo: SlotInfo) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowAddEventModal(true);
  }, [user]);

  const handleClearTimeFilter = useCallback(() => {
    setTimeSlotFilter(null);
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        stats={stats}
        isLoggedIn={!!user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar + Alternate Table Column */}
        <div className={`flex flex-col overflow-auto ${courseFinderCollapsed ? "flex-1" : "w-[70%]"}`}>
          {/* Calendar */}
          <div className="p-4 flex-shrink-0">
            <ScheduleCalendar
              courses={courses}
              selectedCourseIds={selectedCourseIds}
              customEvents={customEvents}
              onSlotSelect={handleSlotSelect}
              onSlotDoubleClick={handleSlotDoubleClick}
            />
          </div>
          
          {/* Alternate Schedule Table - directly under calendar */}
          {alternateScheduleCourses.length > 0 && (
            <div className="px-4 pb-4">
              <AlternateSchedulesTable courses={alternateScheduleCourses} />
            </div>
          )}
        </div>

        {/* Course Finder */}
        <div className={`overflow-hidden transition-all duration-300 ${courseFinderCollapsed ? "w-14" : "w-[30%]"}`}>
          <CourseFinder
            courses={courses}
            selectedCourseIds={selectedCourseIds}
            subjects={subjects}
            onToggleCourse={(course) => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              toggleCourse(course);
            }}
            isLoading={coursesLoading}
            isCollapsed={courseFinderCollapsed}
            onToggleCollapse={() => setCourseFinderCollapsed(!courseFinderCollapsed)}
            timeSlotFilter={timeSlotFilter}
            onClearTimeFilter={handleClearTimeFilter}
          />
        </div>
      </div>

      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />

      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onAdd={addCustomEvent}
        slotStart={selectedSlot?.start ?? null}
        slotEnd={selectedSlot?.end ?? null}
      />
    </div>
  );
};

export default Index;
