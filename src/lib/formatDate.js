import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const timeZone = import.meta.env.TIME_ZONE || 'America/Los_Angeles';

export function getCurrentDate() {
  return dayjs().tz(timeZone).format('YYYY-MM-DD');
}

export function formatDateMDY(dateString) {
  return dayjs(dateString).tz(timeZone).format('MM/DD/YYYY');
}

export function formatDateFull(dateString) {
  return dayjs(dateString).tz(timeZone).format('MMMM D, YYYY');
}

export function formatDateShort(dateString) {
  const date = dayjs(dateString).tz(timeZone);
  const formattedMonth = date.format('MMM');
  const day = date.date();

  // Function to add ordinal suffix
  const addOrdinalSuffix = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formattedDay = addOrdinalSuffix(day);

  return `${formattedMonth} ${formattedDay}`;
}

export function formatDateLong(dateString) {
  return dayjs(dateString).tz(timeZone).format('MMMM D, YYYY h:mmA');
}

// format the data like the following Friday February 07
export function formatDateDayMonthDate(dateString) {
  return `<div class="day">${dayjs(dateString).tz(timeZone).format('dddd')}</div><div class="month">${dayjs(dateString).tz(timeZone).format('MMMM')}</div><div class="date">${dayjs(dateString).tz(timeZone).format('DD')}</div>`;
}



// return just the time portion of a date string
export function formatTime(dateString) {
  return dayjs(dateString).tz(timeZone).format('h:mm A');
}

export function secondsToHMS(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const pad = (num) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  } else {
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  }
}

export function secondsToMinutes(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}
