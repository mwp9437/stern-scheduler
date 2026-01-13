import { useState, useMemo } from "react";
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
import { ScheduleStats } from "@/types/scheduler";

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

  const subjects = useMemo(() => getUniqueSubjects(courses), [courses]);
  const stats: ScheduleStats = useMemo(() => calculateStats(courses), [calculateStats, courses]);
  const alternateScheduleCourses = useMemo(() => getAlternateScheduleCourses(courses), [getAlternateScheduleCourses, courses]);

  const handleSlotSelect = (slotInfo: SlotInfo) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowAddEventModal(true);
  };

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
        {/* Calendar - 70% */}
        <div className="w-[70%] p-4 overflow-auto">
          <ScheduleCalendar
            courses={courses}
            selectedCourseIds={selectedCourseIds}
            customEvents={customEvents}
            onSlotSelect={handleSlotSelect}
          />
        </div>

        {/* Course Finder - 30% */}
        <div className="w-[30%] overflow-hidden">
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
          />
        </div>
      </div>

      <AlternateSchedulesTable courses={alternateScheduleCourses} />
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
