import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, getDay, isSameDay, isBefore, startOfToday 
} from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

function Calendar({ selected, onSelect, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(new Date()));
  const today = startOfToday();

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayIndex = getDay(daysInMonth[0]);
  const paddingDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    if (onSelect) {
      onSelect(date); // triggers parent to close the popup
    }
  };

  return (
    <div className={cn("p-4 bg-background rounded-md shadow-sm w-[280px]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "size-7 p-0 flex items-center justify-center bg-transparent opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-sm font-medium">{format(currentMonth, "MMMM yyyy")}</h2>
        <button
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "size-7 p-0 flex items-center justify-center bg-transparent opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {paddingDays.map((_, i) => (
          <div key={`padding-${i}`} className="h-10" />
        ))}

        {daysInMonth.map((day) => {
          const isPast = isBefore(day, today);
          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPast && handleDateClick(day)}
              disabled={isPast}
              className={cn(
                "h-10 w-full flex items-center justify-center text-sm rounded-md",
                isSameDay(day, selected || new Date(0))
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
                isPast && "opacity-50 cursor-not-allowed"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar };
