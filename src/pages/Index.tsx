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
import { ScheduleStats, TimeSlotFilter, CalendarEvent, CustomEventType } from "@/types/scheduler";
import { getDay, getHours, getMinutes } from "date-fns";

const Index = () => {
  const { user, isLoading: authLoading, signIn, signUp, signOut } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const {
    selectedCourseIds,
    customEvents,
    toggleCourse,
    addCustomEvent,
    updateCustomEvent,
    removeCustomEvent,
    calculateStats,
    getAlternateScheduleCourses,
  } = useUserSchedule(user?.id);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
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

  const hasAlternateSchedules = alternateScheduleCourses.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        stats={stats}
        isLoggedIn={!!user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar + Alternate Table Column - Dynamic Height */}
        <div className={`flex flex-col h-[calc(100vh-100px)] ${courseFinderCollapsed ? "flex-1" : "w-[70%]"}`}>
          {/* Calendar - flex-grow to fill available space */}
          <div className="px-4 pt-2 pb-1 flex-grow min-h-0">
            <ScheduleCalendar
              courses={courses}
              selectedCourseIds={selectedCourseIds}
              customEvents={customEvents}
              onSlotSelect={handleSlotSelect}
              onSlotDoubleClick={handleSlotDoubleClick}
              onEventSelect={handleEventSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              hasAlternateSchedules={hasAlternateSchedules}
            />
          </div>
          
          {/* Alternate Schedule Table - only if there are alternate courses */}
          {hasAlternateSchedules && (
            <div className="px-4 pb-4 pt-1 flex-shrink-0 max-h-[300px] overflow-auto">
              <AlternateSchedulesTable 
                courses={alternateScheduleCourses} 
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
    </div>
  );
};

export default Index;
