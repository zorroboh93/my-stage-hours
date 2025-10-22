import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

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
  const currentMonth = useMemo(() => new Date(), []);
  
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
      const dateString = date.toISOString().split("T")[0];
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
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendario - {monthName}
        </CardTitle>
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
