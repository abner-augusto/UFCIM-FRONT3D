/** GET /api/v1/spaces/:id/air-quality (backend docs/AIR-QUALITY-COLLECTOR.md). */
export type SensorStatus = 'ok' | 'unreachable' | 'auth_failed' | 'bad_payload';

export interface AirQualityReading {
  measuredAt: string;
  co2Ppm: number | null;
  pm1Ugm3: number | null;
  pm25Ugm3: number | null;
  pm10Ugm3: number | null;
  tvocMgm3: number | null;
  hchoMgm3: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  batteryPct: number | null;
}

export interface SpaceAirQuality {
  device: {
    id: string;
    label: string | null;
    model: string;
    status: SensorStatus | null;
    statusAt: string | null;
  } | null;
  latest: AirQualityReading | null;
  stale: boolean;
}

export type HistoryBucket = 'minute' | 'hour';

export interface AirQualityHistoryPoint extends AirQualityReading {
  co2PpmMax: number | null;
  pm25Ugm3Max: number | null;
  samples: number;
}

/** GET /api/v1/spaces/:id/air-quality/history */
export interface SpaceAirQualityHistory {
  device: SpaceAirQuality['device'];
  bucket: HistoryBucket;
  from: string;
  to: string;
  points: AirQualityHistoryPoint[];
}
