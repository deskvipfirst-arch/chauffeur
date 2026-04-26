export type FlightStatusInfo = {
  flightNumber: string;
  status: string;
  terminal: string | null;
  lastUpdated: string;
  source: "fallback" | "remote";
};

export function normalizeFlightNumber(flightNumber?: string | null) {
  return String(flightNumber || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function getPrimaryFlightNumber(booking: {
  flight_number_arrival?: string | null;
  flight_number_departure?: string | null;
  arrival_flight?: string | null;
  departure_flight?: string | null;
}) {
  return (
    normalizeFlightNumber(booking.flight_number_arrival) ||
    normalizeFlightNumber(booking.arrival_flight) ||
    normalizeFlightNumber(booking.flight_number_departure) ||
    normalizeFlightNumber(booking.departure_flight)
  );
}

export function buildFallbackFlightStatus(flightNumber: string): FlightStatusInfo {
  const normalized = normalizeFlightNumber(flightNumber);
  const seed = normalized.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const states = ["Scheduled", "Boarding", "Landed", "Delayed"];
  const terminals = ["T2", "T3", "T4", "T5"];

  return {
    flightNumber: normalized,
    status: states[seed % states.length],
    terminal: terminals[seed % terminals.length],
    lastUpdated: new Date().toISOString(),
    source: "fallback",
  };
}

export function parseFlightStatusResponse(payload: unknown, fallbackFlightNumber?: string): FlightStatusInfo | null {
  const payloadObj = payload as { data?: Array<Record<string, any>> } | Array<Record<string, any>> | Record<string, any>;
  let row: Record<string, any> | undefined;
  
  if (Array.isArray(payloadObj)) {
    row = payloadObj[0];
  } else if (typeof payloadObj === 'object' && payloadObj !== null && 'data' in payloadObj && Array.isArray((payloadObj as any).data)) {
    row = (payloadObj as any).data[0];
  } else if (typeof payloadObj === 'object' && payloadObj !== null) {
    row = payloadObj as Record<string, any>;
  }

  if (!row) return null;

  const flightNumber = normalizeFlightNumber(
    row?.flight?.iata ||
      row?.flight?.number ||
      row?.flightNumber ||
      fallbackFlightNumber
  );

  if (!flightNumber) return null;

  const status = String(
    row?.status || row?.flight_status || row?.departure?.status || "Scheduled"
  );

  const terminalValue = row?.departure?.terminal || row?.arrival?.terminal || row?.terminal || null;

  return {
    flightNumber,
    status,
    terminal: terminalValue ? String(terminalValue) : null,
    lastUpdated: String(row?.lastUpdated || row?.last_updated || row?.updated_at || new Date().toISOString()),
    source: "remote",
  };
}

export function buildFlightStatusRequestUrl(template: string, flightNumber: string) {
  const encodedFlight = encodeURIComponent(normalizeFlightNumber(flightNumber));
  if (template.includes("{flight}")) {
    return template.replaceAll("{flight}", encodedFlight);
  }

  const separator = template.includes("?") ? "&" : "?";
  return `${template}${separator}flight=${encodedFlight}`;
}
