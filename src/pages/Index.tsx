import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SlotInfo } from "react-big-calendar";
import { Header } from "@/components/scheduler/Header";
import { Footer } from "@/components/scheduler/Footer";
import { ScheduleCalendar } from "@/components/scheduler/ScheduleCalendar";
import { CourseFinder } from "@/components/scheduler/CourseFinder";
import { OffCalendarCoursesTable } from "@/components/scheduler/OffCalendarCoursesTable";
import { AddEventModal } from "@/components/scheduler/AddEventModal";
import { AuthModal } from "@/components/scheduler/AuthModal";
import { FeedbackModal } from "@/components/scheduler/FeedbackModal";
import { FundraiserModal } from "@/components/scheduler/FundraiserModal";
import { ScenarioSwitcher } from "@/components/scheduler/ScenarioSwitcher";
import { useCourses, getUniqueSubjects } from "@/hooks/useCourses";
import { useUserSchedule } from "@/hooks/useUserSchedule";
import { useScenarios } from "@/hooks/useScenarios";
import { useAuth } from "@/hooks/useAuth";
import { ScheduleStats, TimeSlotFilter, CalendarEvent, CustomEventType } from "@/types/scheduler";
import { getDay, getHours, getMinutes } from "date-fns";

const Index = () => {
  const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const {
    scenarios,
    activeScenarioId,
    isLoading: scenariosLoading,
    createScenario,
    duplicateScenario,
    renameScenario,
    deleteScenario,
    setActive,
  } = useScenarios(user?.id);
  const {
    selectedCourseIds,
    customEvents,
    toggleCourse,
    addCustomEvent,
    updateCustomEvent,
    removeCustomEvent,
    calculateStats,
    getOffCalendarCourses,
  } = useUserSchedule(user?.id, activeScenarioId);

  // First-time user has no scenarios row — auto-create "Plan A". The
  // ref guards against StrictMode double-fire; the unique constraint on
  // (user_id, name) makes the insert idempotent regardless.
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      autoCreatedRef.current = false;
      return;
    }
    if (scenariosLoading || scenarios.length > 0 || autoCreatedRef.current) return;
    autoCreatedRef.current = true;
    void createScenario("Plan A").catch(() => {
      autoCreatedRef.current = false;
    });
  }, [user, scenariosLoading, scenarios.length, createScenario]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [courseFinderCollapsed, setCourseFinderCollapsed] = useState(false);
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlotFilter | null>(null);

  const subjects = useMemo(() => getUniqueSubjects(courses), [courses]);
  const stats: ScheduleStats = useMemo(() => calculateStats(courses), [calculateStats, courses]);
  const offCalendarCourses = useMemo(() => getOffCalendarCourses(courses), [getOffCalendarCourses, courses]);

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
    setEditingEvent(null);
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowAddEventModal(true);
  }, [user]);

  // Handle event selection (double-click on existing custom event)
  const handleEventSelect = useCallback((event: CalendarEvent) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setEditingEvent(event);
    setSelectedSlot(null);
    setShowAddEventModal(true);
  }, [user]);

  // Handle drag and drop
  const handleEventDrop = useCallback((eventId: string, start: Date, end: Date) => {
    updateCustomEvent({ id: eventId, start, end });
  }, [updateCustomEvent]);

  // Handle resize
  const handleEventResize = useCallback((eventId: string, start: Date, end: Date) => {
    updateCustomEvent({ id: eventId, start, end });
  }, [updateCustomEvent]);

  // Handle update from modal (including type change)
  const handleUpdateEvent = useCallback((eventId: string, start: Date, end: Date, eventType?: CustomEventType) => {
    updateCustomEvent({ id: eventId, start, end, eventType });
  }, [updateCustomEvent]);

  // Handle delete from modal
  const handleDeleteEvent = useCallback((eventId: string) => {
    removeCustomEvent(eventId);
  }, [removeCustomEvent]);

  const handleClearTimeFilter = useCallback(() => {
    setTimeSlotFilter(null);
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const hasOffCalendarCourses = offCalendarCourses.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        stats={stats}
        isLoggedIn={!!user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
        onFeedbackClick={() => setShowFeedbackModal(true)}
        scenarioSwitcher={
          user ? (
            <ScenarioSwitcher
              scenarios={scenarios}
              activeId={activeScenarioId}
              isLoading={scenariosLoading}
              createScenario={createScenario}
              duplicateScenario={duplicateScenario}
              renameScenario={renameScenario}
              deleteScenario={deleteScenario}
              setActive={setActive}
            />
          ) : null
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar + Alternate Table Column - Dynamic Height */}
        <div className={`flex flex-col overflow-hidden ${courseFinderCollapsed ? "flex-1" : "w-[70%]"}`}>
          {/* Calendar - flex-grow to fill available space */}
          <div className="px-4 pt-2 pb-1 flex-1 min-h-0 overflow-hidden">
            <ScheduleCalendar
              courses={courses}
              selectedCourseIds={selectedCourseIds}
              customEvents={customEvents}
              onSlotSelect={handleSlotSelect}
              onSlotDoubleClick={handleSlotDoubleClick}
              onEventSelect={handleEventSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              hasOffCalendarCourses={hasOffCalendarCourses}
            />
          </div>

          {/* Off-Calendar Courses Table — only if any are selected */}
          {hasOffCalendarCourses && (
            <div className="px-4 pb-4 pt-1 shrink-0">
              <OffCalendarCoursesTable
                courses={offCalendarCourses}
                defaultOpen={true}
              />
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
            customEvents={customEvents}
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
        onClose={() => {
          setShowAddEventModal(false);
          setEditingEvent(null);
        }}
        onAdd={addCustomEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        slotStart={selectedSlot?.start ?? null}
        slotEnd={selectedSlot?.end ?? null}
        editingEvent={editingEvent}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      <FundraiserModal />
    </div>
  );
};

export default Index;
