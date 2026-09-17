import assert from "node:assert/strict";
import test from "node:test";

import {
  formatOccurrenceDateTime,
  normalizeOccurrenceDateTime,
  occurrenceDateKey,
  toOccurrenceDateTimeInput,
} from "../app/occurrence-date-time.ts";

test("envia o horário digitado como um instante ISO de Cuiabá", () => {
  assert.equal(
    normalizeOccurrenceDateTime("2026-09-14T22:15"),
    "2026-09-15T02:15:00.000Z",
  );
});

test("recupera o mesmo dia e horário após o round-trip", () => {
  const storedValue = "2026-09-15T02:15:00.000Z";
  assert.equal(
    toOccurrenceDateTimeInput(new Date(storedValue)),
    "2026-09-14T22:15",
  );
  assert.equal(occurrenceDateKey(storedValue), "2026-09-14");
  assert.match(formatOccurrenceDateTime(storedValue), /22:15/);
});

test("mantém horários próximos da mudança de dia", () => {
  assert.equal(
    normalizeOccurrenceDateTime("2026-09-14T23:30"),
    "2026-09-15T03:30:00.000Z",
  );
  assert.equal(
    normalizeOccurrenceDateTime("2026-09-15T00:15"),
    "2026-09-15T04:15:00.000Z",
  );
});
