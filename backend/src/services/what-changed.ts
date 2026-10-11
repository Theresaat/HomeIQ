import type { SensorHistoryReading, SensorTrend, SensorType, WhatChangedInsight } from '../types.ts';

function isNumeric(reading: SensorHistoryReading): reading is SensorHistoryReading & { value: number } {
  return typeof reading.value === 'number' && Number.isFinite(reading.value);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function relativeChange(trend: SensorTrend): number {
  const scale = Math.max(Math.abs(trend.current), Math.abs(trend.previous));
  return scale === 0 ? 0 : Math.abs(trend.current - trend.previous) / scale;
}

// History is already ordered by event timestamp, then ingestion timestamp, newest first.
export function deriveWhatChanged(deviceId: string, history: SensorHistoryReading[]): WhatChangedInsight {
  const readings = history.filter(reading => reading.deviceId === deviceId);
  const groups = new Map<SensorType, SensorHistoryReading[]>();
  for (const reading of readings) {
    const group = groups.get(reading.sensorType) ?? [];
    group.push(reading);
    groups.set(reading.sensorType, group);
  }

  const trends: SensorTrend[] = [];
  for (const group of groups.values()) {
    const current = group[0];
    if (!isNumeric(current)) continue;
    const samples = group.filter(isNumeric).filter(reading => reading.unit === current.unit).slice(0, 5);
    const previous = samples[1];
    if (!previous) continue;
    const change = current.value - previous.value;
    const tolerance = Math.max(0.01, Math.abs(previous.value) * 0.001);
    trends.push({
      deviceId, sensorType: current.sensorType, label: current.label, unit: current.unit, status: current.status,
      current: current.value, previous: previous.value,
      recentAverage: round(samples.reduce((sum, reading) => sum + reading.value, 0) / samples.length),
      change: round(change), percentageChange: previous.value === 0 ? null : round(change / previous.value * 100),
      direction: Math.abs(change) <= tolerance ? 'stable' : change > 0 ? 'increasing' : 'decreasing',
      sampleSize: samples.length, currentTimestamp: current.timestamp, previousTimestamp: previous.timestamp,
      recentReadings: samples.map(({ value, status, timestamp, ingestedAt }) => ({ value, status, timestamp, ingestedAt })),
    });
  }

  const severity = { normal: 0, warning: 1, critical: 2 };
  trends.sort((a, b) => severity[b.status] - severity[a.status]
    || Number(b.direction !== 'stable') - Number(a.direction !== 'stable')
    || relativeChange(b) - relativeChange(a));
  return trends[0] ?? {
    deviceId, status: 'insufficient_history',
    message: 'At least two numeric readings of the same sensor type and unit are required within the latest 20 events.',
    numericReadingCount: readings.filter(isNumeric).length, historySampleSize: readings.length,
  };
}
