"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  Mail,
  X,
  Trash2,
  Edit3,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Can } from "@/app/components/Can";
import { PageError, PageLoading } from "@/app/components/page-state";
import { toast } from "@/app/components/toast";
import { useMeetings, useCreateMeeting, useCancelMeeting } from "@/app/hooks/use-meetings";

type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  type: string;
  color: string;
  scheduled_at: string;
};

const typeColors: Record<string, string> = {
  meeting: "purple",
  task: "green",
  call: "blue",
  email: "yellow",
};

function mapMeeting(row: Record<string, unknown>): CalendarEvent {
  const eventType = String(row.event_type || "meeting");
  return {
    id: String(row.id),
    title: String(row.title || "Untitled"),
    time: String(row.time || ""),
    type: eventType,
    color: typeColors[eventType] || "purple",
    scheduled_at: String(row.scheduled_at || ""),
  };
}

function eventOnDay(scheduledAt: string, year: number, month: number, day: number): boolean {
  if (!scheduledAt) return false;
  try {
    const dt = new Date(scheduledAt);
    return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day;
  } catch {
    return scheduledAt.slice(0, 10) === `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
}

export default function CalendarPage() {
  const { data, isLoading, isError, error, refetch } = useMeetings();
  const createMeeting = useCreateMeeting();
  const cancelMeeting = useCancelMeeting();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", type: "meeting" });

  const allEvents = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => mapMeeting(row as Record<string, unknown>));
  }, [data]);

  const events = useMemo(
    () =>
      allEvents.filter((e) =>
        eventOnDay(e.scheduled_at, currentDate.getFullYear(), currentDate.getMonth(), selectedDate)
      ),
    [allEvents, currentDate, selectedDate]
  );

  if (isLoading && allEvents.length === 0) {
    return <PageLoading label="Loading calendar..." />;
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.getDate());
  };

  const handleQuickAdd = (type: string) => {
    setNewEvent({ ...newEvent, type });
    setShowNewEventModal(true);
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.time) return;
    const [hours, minutes] = newEvent.time.split(":").map(Number);
    const scheduled = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDate,
      hours || 9,
      minutes || 0
    );
    createMeeting.mutate(
      {
        title: newEvent.title,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: 30,
        event_type: newEvent.type,
        lead_id: "calendar",
      },
      {
        onSuccess: () => {
          setShowNewEventModal(false);
          setNewEvent({ title: "", time: "", type: "meeting" });
          toast.success("Event created");
        },
        onError: () => toast.error("Failed to create event"),
      }
    );
  };

  const handleDeleteEvent = (id: string) => {
    cancelMeeting.mutate(id, {
      onSuccess: () => {
        setShowEventDetails(null);
        toast.delete("Event");
      },
      onError: () => toast.error("Failed to delete event"),
    });
  };

  return (
    <div className="space-y-6">
      {isError && (
        <PageError
          message={(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Could not load calendar."}
          onRetry={() => refetch()}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Calendar</h1>
          <p className="text-gray-400">Schedule and manage your outreach activities</p>
        </div>
        <Can permission="settings:update">
          <Button className="gap-2" onClick={() => setShowNewEventModal(true)}>
            <Plus className="w-4 h-4" />
            New Event
          </Button>
        </Can>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold">{monthName}</h2>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm text-gray-400 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => day && setSelectedDate(day)}
                disabled={!day}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-sm transition-all",
                  day
                    ? selectedDate === day
                      ? "bg-purple-600 text-white"
                      : "hover:bg-white/10 text-white"
                    : "text-transparent",
                  day === today.getDate() &&
                    currentDate.getMonth() === today.getMonth() &&
                    currentDate.getFullYear() === today.getFullYear() &&
                    selectedDate !== day &&
                    "ring-1 ring-purple-500"
                )}
              >
                {day}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold">May {selectedDate}</h2>
            </div>

            <div className="space-y-3">
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setShowEventDetails(event)}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        event.color === "purple" && "bg-purple-400",
                        event.color === "green" && "bg-green-400",
                        event.color === "blue" && "bg-blue-400",
                        event.color === "yellow" && "bg-yellow-400"
                      )}
                    />
                    <div>
                      <div className="font-medium mb-1">{event.title}</div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        {event.time}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {events.length === 0 && (
                <p className="text-center text-gray-400 py-4">No events for this day</p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <h3 className="font-bold mb-4">Quick Add</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleQuickAdd("meeting")}>
                <Video className="w-4 h-4" />
                Video Call
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleQuickAdd("call")}>
                <Phone className="w-4 h-4" />
                Phone Call
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleQuickAdd("email")}>
                <Mail className="w-4 h-4" />
                Schedule Email
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New Event</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewEventModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Title</label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Enter event title"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="flex gap-2">
                  {["meeting", "task", "call", "email"].map((type) => (
                    <Button
                      key={type}
                      variant={newEvent.type === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewEvent({ ...newEvent, type })}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewEventModal(false)}>Cancel</Button>
              <Button onClick={handleCreateEvent} disabled={createMeeting.isPending}>
                Create Event
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Event Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEventDetails(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Title</label>
                <p className="text-lg font-medium">{showEventDetails.title}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Time</label>
                <p className="text-lg font-medium">{showEventDetails.time}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Type</label>
                <p className="text-lg font-medium capitalize">{showEventDetails.type}</p>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" className="gap-2" onClick={() => setShowEventDetails(null)}>
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
              <Can permission="settings:update">
                <Button variant="outline" className="gap-2 text-red-400" onClick={() => handleDeleteEvent(showEventDetails.id)}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              </Can>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}