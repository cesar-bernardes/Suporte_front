export const OCCURRENCE_TIME_ZONE = "America/Cuiaba";

const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedDateTimeParts(date: Date): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OCCURRENCE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function timeZoneOffsetMilliseconds(timestamp: number) {
  const comparableTimestamp = Math.floor(timestamp / 1_000) * 1_000;
  const parts = zonedDateTimeParts(new Date(comparableTimestamp));
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - comparableTimestamp
  );
}

function validCalendarDate(parts: DateTimeParts, millisecond: number) {
  const value = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      millisecond,
    ),
  );
  return (
    value.getUTCFullYear() === parts.year &&
    value.getUTCMonth() + 1 === parts.month &&
    value.getUTCDate() === parts.day &&
    value.getUTCHours() === parts.hour &&
    value.getUTCMinutes() === parts.minute &&
    value.getUTCSeconds() === parts.second
  );
}

function localDateTimeToIso(value: string) {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const parts: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
  const millisecond = Number((match[7] || "").padEnd(3, "0") || 0);
  if (!validCalendarDate(parts, millisecond)) return null;

  const wallClockTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    millisecond,
  );
  let timestamp =
    wallClockTimestamp - timeZoneOffsetMilliseconds(wallClockTimestamp);
  timestamp = wallClockTimestamp - timeZoneOffsetMilliseconds(timestamp);

  const resolved = zonedDateTimeParts(new Date(timestamp));
  if (
    resolved.year !== parts.year ||
    resolved.month !== parts.month ||
    resolved.day !== parts.day ||
    resolved.hour !== parts.hour ||
    resolved.minute !== parts.minute ||
    resolved.second !== parts.second
  ) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

export function normalizeOccurrenceDateTime(value: string) {
  const cleaned = value.trim();
  if (EXPLICIT_TIME_ZONE_PATTERN.test(cleaned)) {
    const timestamp = Date.parse(cleaned);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
  }
  return localDateTimeToIso(cleaned);
}

export function toOccurrenceDateTimeInput(value: Date) {
  const parts = zonedDateTimeParts(value);
  return [
    String(parts.year).padStart(4, "0"),
    "-",
    String(parts.month).padStart(2, "0"),
    "-",
    String(parts.day).padStart(2, "0"),
    "T",
    String(parts.hour).padStart(2, "0"),
    ":",
    String(parts.minute).padStart(2, "0"),
  ].join("");
}

export function formatOccurrenceDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: OCCURRENCE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function occurrenceDateKey(value: string) {
  const parts = zonedDateTimeParts(new Date(value));
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}
