import { parseISO, subDays } from "date-fns";

// Function to calculate Easter Sunday
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Function to generate festive periods for a given year
export const getFestivePeriods = (year: number) => {
  const easterSunday = getEasterSunday(year);
  const goodFriday = subDays(easterSunday, 2);
  
  return [
    { 
      name: "Christmas", 
      start: parseISO(`${year}-12-24`), 
      end: parseISO(`${year}-12-26`) 
    },
    { 
      name: "New Year", 
      start: parseISO(`${year}-12-31`), 
      end: parseISO(`${year + 1}-01-01`) 
    },
    { 
      name: "Easter Sunday", 
      start: easterSunday, 
      end: easterSunday 
    },
    { 
      name: "Good Friday", 
      start: goodFriday, 
      end: goodFriday 
    }
  ];
};
