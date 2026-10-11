import type { SensorReading } from '../data/sensors';
import type { ApiHealth, ApiDevice, ApiAlert, ApiMaintenanceTask, ApiHomeSummary } from './api-types';

async function getJson<T>(path: string): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_BASE_URL in .env.local to the HomeIQ backend URL, then reload Expo.');
  }
  const url = `${baseUrl}/api/${path}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
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
    throw new Error(`HomeIQ API GET ${url} failed (HTTP ${response.status})${detail}.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(`HomeIQ API GET ${url} returned invalid JSON.`);
  }
}

export const getHealth = (): Promise<ApiHealth> => getJson('health');
export const getDevices = (): Promise<ApiDevice[]> => getJson('devices');
export const getReadings = (): Promise<SensorReading[]> => getJson('readings');
export const getAlerts = (): Promise<ApiAlert[]> => getJson('alerts');
export const getMaintenance = (): Promise<ApiMaintenanceTask[]> => getJson('maintenance');
export const getHomeSummary = (): Promise<ApiHomeSummary> => getJson('home');
