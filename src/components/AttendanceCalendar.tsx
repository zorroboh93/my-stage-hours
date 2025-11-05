import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceEntry {
  id: string;
  date: string;
  hours: number;
}

interface AttendanceCalendarProps {
  entries: AttendanceEntry[];
  theoreticalHoursPerDay: number;
}

const AttendanceCalendar = ({ entries, theoreticalHoursPerDay }: AttendanceCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Inizia dal mese corrente o ottobre 2024 se siamo prima
    const now = new Date();
    const stageStart = new Date(2024, 9); // Ottobre 2024
    return now < stageStart ? stageStart : now;
  });

  // Limiti del periodo stage
  const minDate = new Date(2024, 9); // Ottobre 2024
  const maxDate = new Date(2025, 5); // Giugno 2025

  const canGoPrevious = useMemo(() => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    return prevMonth >= minDate;
  }, [currentMonth]);

  const canGoNext = useMemo(() => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    return nextMonth <= maxDate;
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    if (canGoPrevious) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    }
  };

  const goToNextMonth = () => {
    if (canGoNext) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    }
  };
  
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, hours: 0, isWorkDay: false });
    }
    
    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Crea dateString senza timezone
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === dateString);
      const dayOfWeek = date.getDay();
      const isWorkDay = dayOfWeek !== 0 && dayOfWeek !== 6;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = date < today;
      
      days.push({
        date: day,
        dateString,
        hours: entry?.hours || 0,
        isWorkDay,
        hasEntry: !!entry,
        isPast,
      });
    }
    
    return days;
  }, [currentMonth, entries]);

  const monthName = currentMonth.toLocaleDateString("it-IT", { 
    month: "long", 
    year: "numeric" 
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario - {monthName}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}
          
          {calendarData.map((day, index) => {
            if (day.date === null) {
              return <div key={`empty-${index}`} className="p-2" />;
            }
            
            let bgColor = "bg-muted/20";
            let textColor = "text-foreground";
            let borderColor = "border-transparent";
            
            if (day.hasEntry) {
              if (day.hours === 0) {
                bgColor = "bg-destructive/20";
                textColor = "text-destructive";
                borderColor = "border-destructive/30";
              } else if (day.hours < theoreticalHoursPerDay) {
                bgColor = "bg-warning/20";
                textColor = "text-warning-foreground";
                borderColor = "border-warning/30";
              } else {
                bgColor = "bg-success/20";
                textColor = "text-success";
                borderColor = "border-success/30";
              }
            } else if (day.isWorkDay && day.isPast) {
              bgColor = "bg-muted/40";
              borderColor = "border-muted";
            }
            
            return (
              <div
                key={day.dateString}
                className={`p-2 text-center rounded-lg border transition-all hover:scale-105 ${bgColor} ${borderColor}`}
              >
                <div className={`text-sm font-medium ${textColor}`}>
                  {day.date}
                </div>
                {day.hasEntry && (
                  <div className="text-xs mt-1 font-semibold">
                    {day.hours}h
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success/20 border border-success/30" />
            <span>Presente (8h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/20 border border-warning/30" />
            <span>Parziale (&lt;8h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
            <span>Assente (0h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/40 border border-muted" />
            <span>Non registrato</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendar;
