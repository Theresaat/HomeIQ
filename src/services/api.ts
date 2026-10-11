import type { SensorReading } from '../data/sensors';
import type { ApiHealth, ApiDevice, ApiAlert, ApiMaintenanceTask, ApiHomeSummary, ApiWhatChangedInsight, ApiAskRequest, ApiPreventiveInsight } from './api-types';

async function requestJson<T>(path: string, body?: ApiAskRequest): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_BASE_URL in .env.local to the HomeIQ backend URL, then reload Expo.');
  }
  const url = `${baseUrl}/api/${path}`;
  const method = body ? 'POST' : 'GET';
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Could not reach HomeIQ API at ${url}.${detail} Check the backend and API base URL.`);
  }
  if (!response.ok) {
    let detail = '';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        detail = `: ${body.error}`;
      }
    } catch {
      // Keep the HTTP error useful even when the server returns a non-JSON body.
    }
    throw new Error(`HomeIQ API ${method} ${url} failed (HTTP ${response.status})${detail}.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(`HomeIQ API ${method} ${url} returned invalid JSON.`);
  }
}

export const getHealth = (): Promise<ApiHealth> => requestJson('health');
export const getDevices = (): Promise<ApiDevice[]> => requestJson('devices');
export const getReadings = (): Promise<SensorReading[]> => requestJson('readings');
export const getAlerts = (): Promise<ApiAlert[]> => requestJson('alerts');
export const getMaintenance = (): Promise<ApiMaintenanceTask[]> => requestJson('maintenance');
export const getHomeSummary = (): Promise<ApiHomeSummary> => requestJson('home');
export const getWhatChanged = (deviceId: string): Promise<ApiWhatChangedInsight> =>
  requestJson(`insights/what-changed/${encodeURIComponent(deviceId)}`);

export async function askHomeIQ(request: ApiAskRequest): Promise<ApiPreventiveInsight> {
  const response = await requestJson<unknown>('ai/ask', request);
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('HomeIQ API returned an invalid insight.');
  }
  const value = response as Record<string, unknown>;
  const strings = (items: unknown): items is string[] => Array.isArray(items)
    && items.length > 0 && items.every(item => typeof item === 'string' && item.trim());
  if (typeof value.answer !== 'string' || !value.answer.trim()
    || !['normal', 'warning', 'critical'].includes(value.severity as string)
    || !['low', 'moderate', 'high'].includes(value.riskLevel as string)
    || !['improving', 'stable', 'worsening', 'unknown'].includes(value.trend as string)
    || !['Act now', 'Check within 24 hours', 'Monitor this week', 'Routine maintenance'].includes(value.recommendedTimeframe as string)
    || !strings(value.recommendedActions) || !strings(value.basedOn)) {
    throw new Error('HomeIQ API returned an invalid insight.');
  }
  return value as ApiPreventiveInsight;
}
