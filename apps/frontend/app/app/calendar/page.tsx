"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";

const currentDate = new Date(2026, 4, 14);

const events = [
  { id: 1, title: "Demo with Sarah Chen", time: "10:00 AM", type: "meeting", color: "purple" },
  { id: 2, title: "Campaign Review", time: "2:00 PM", type: "task", color: "green" },
  { id: 3, title: "Team Sync", time: "4:00 PM", type: "meeting", color: "blue" },
];

const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(14);
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Calendar</h1>
          <p className="text-gray-400">Schedule and manage your outreach activities</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Event
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold">{monthName}</h2>
              <Button variant="ghost" size="icon">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm">
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
                  day === 14 && selectedDate !== 14 && "ring-1 ring-purple-500"
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
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        event.color === "purple" && "bg-purple-400",
                        event.color === "green" && "bg-green-400",
                        event.color === "blue" && "bg-blue-400"
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
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <h3 className="font-bold mb-4">Quick Add</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Video className="w-4 h-4" />
                Video Call
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Phone className="w-4 h-4" />
                Phone Call
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Mail className="w-4 h-4" />
                Schedule Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}