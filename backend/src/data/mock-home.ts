import type { Device, SensorReading, MaintenanceTask } from '../types.ts';

export const mockDevices: Omit<Device, 'status' | 'latestReadings'>[] = [
  {
    "id": "sink",
    "name": "Kitchen leak sensor",
    "room": "Kitchen · Under sink",
    "connection": "online",
    "powerSource": "battery",
    "battery": 86,
    "lastMaintenanceDate": "2026-09-26"
  },
  {
    "id": "hvac",
    "name": "HVAC system",
    "room": "Utility room",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2026-07-17"
  },
  {
    "id": "fridge",
    "name": "Refrigerator",
    "room": "Kitchen",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2026-08-12"
  },
  {
    "id": "dryer",
    "name": "Dryer vent",
    "room": "Laundry room",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2025-12-10"
  },
  {
    "id": "dishwasher",
    "name": "Dishwasher",
    "room": "Kitchen",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2026-08-20"
  },
  {
    "id": "smoke",
    "name": "Smoke detector",
    "room": "Upstairs hallway",
    "connection": "online",
    "powerSource": "battery",
    "battery": 94,
    "lastMaintenanceDate": "2026-10-01"
  },
  {
    "id": "heater",
    "name": "Water heater",
    "room": "Utility room",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2026-06-15"
  },
  {
    "id": "energy",
    "name": "Energy monitor",
    "room": "Electrical panel",
    "connection": "online",
    "powerSource": "mains",
    "battery": 100,
    "lastMaintenanceDate": "2026-08-30"
  },
  {
    "id": "garage",
    "name": "Garage door",
    "room": "Garage",
    "connection": "online",
    "powerSource": "battery",
    "battery": 78,
    "lastMaintenanceDate": "2026-09-18"
  },
  {
    "id": "air",
    "name": "Air quality monitor",
    "room": "Living room",
    "connection": "online",
    "powerSource": "battery",
    "battery": 91,
    "lastMaintenanceDate": "2026-09-22"
  },
  {
    "id": "bath",
    "name": "Bathroom leak sensor",
    "room": "Main bathroom",
    "connection": "online",
    "powerSource": "battery",
    "battery": 89,
    "lastMaintenanceDate": "2026-09-28"
  }
];

export const mockSensorReadings: SensorReading[] = [
  {
    "id": "sink-reading-0",
    "deviceId": "sink",
    "sensorType": "water_detection",
    "label": "Water detection",
    "value": "Moisture detected",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "critical"
  },
  {
    "id": "sink-reading-1",
    "deviceId": "sink",
    "sensorType": "moisture",
    "label": "Surface moisture level",
    "value": 18,
    "unit": "%",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "critical"
  },
  {
    "id": "sink-reading-2",
    "deviceId": "sink",
    "sensorType": "water_flow",
    "label": "Water flow",
    "value": 0,
    "unit": "gal/min",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "hvac-reading-0",
    "deviceId": "hvac",
    "sensorType": "temperature",
    "label": "Indoor temperature",
    "value": 72,
    "unit": "°F",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "hvac-reading-1",
    "deviceId": "hvac",
    "sensorType": "airflow",
    "label": "Airflow",
    "value": 420,
    "unit": "CFM",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "fridge-reading-0",
    "deviceId": "fridge",
    "sensorType": "temperature",
    "label": "Internal temperature",
    "value": 46,
    "unit": "°F",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "warning"
  },
  {
    "id": "fridge-reading-1",
    "deviceId": "fridge",
    "sensorType": "door_position",
    "label": "Door position",
    "value": "Closed",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "fridge-reading-2",
    "deviceId": "fridge",
    "sensorType": "power_usage",
    "label": "Power draw",
    "value": 180,
    "unit": "W",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "fridge-reading-3",
    "deviceId": "fridge",
    "sensorType": "compressor_runtime",
    "label": "Compressor runtime (past hour)",
    "value": 52,
    "unit": "min",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "warning"
  },
  {
    "id": "dryer-reading-0",
    "deviceId": "dryer",
    "sensorType": "airflow",
    "label": "Airflow",
    "value": 68,
    "unit": "% of baseline",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "warning"
  },
  {
    "id": "dryer-reading-1",
    "deviceId": "dryer",
    "sensorType": "pressure",
    "label": "Vent pressure",
    "value": 1.2,
    "unit": "inH₂O",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "warning"
  },
  {
    "id": "dryer-reading-2",
    "deviceId": "dryer",
    "sensorType": "vibration",
    "label": "Drum vibration (RMS)",
    "value": 2.8,
    "unit": "mm/s",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dryer-reading-3",
    "deviceId": "dryer",
    "sensorType": "temperature",
    "label": "Exhaust temperature",
    "value": 145,
    "unit": "°F",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dryer-reading-4",
    "deviceId": "dryer",
    "sensorType": "runtime",
    "label": "Current cycle runtime",
    "value": 72,
    "unit": "min",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "warning"
  },
  {
    "id": "dryer-reading-5",
    "deviceId": "dryer",
    "sensorType": "power_usage",
    "label": "Power draw",
    "value": 4800,
    "unit": "W",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dishwasher-reading-0",
    "deviceId": "dishwasher",
    "sensorType": "water_flow",
    "label": "Water flow",
    "value": 1.8,
    "unit": "gal/min",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dishwasher-reading-1",
    "deviceId": "dishwasher",
    "sensorType": "cycle_state",
    "label": "Cycle state",
    "value": "Standby",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dishwasher-reading-2",
    "deviceId": "dishwasher",
    "sensorType": "water_usage",
    "label": "Water usage (last cycle)",
    "value": 3.5,
    "unit": "gal",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dishwasher-reading-3",
    "deviceId": "dishwasher",
    "sensorType": "power_usage",
    "label": "Standby power draw",
    "value": 4,
    "unit": "W",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "dishwasher-reading-4",
    "deviceId": "dishwasher",
    "sensorType": "runtime",
    "label": "Last cycle runtime",
    "value": 120,
    "unit": "min",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "smoke-reading-0",
    "deviceId": "smoke",
    "sensorType": "smoke_concentration",
    "label": "Smoke concentration",
    "value": 0,
    "unit": "ppm",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "smoke-reading-1",
    "deviceId": "smoke",
    "sensorType": "battery_level",
    "label": "Battery level",
    "value": 94,
    "unit": "%",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "heater-reading-0",
    "deviceId": "heater",
    "sensorType": "temperature",
    "label": "Water temperature",
    "value": 120,
    "unit": "°F",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "heater-reading-1",
    "deviceId": "heater",
    "sensorType": "tank_condition",
    "label": "Tank condition",
    "value": "Normal",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "heater-reading-2",
    "deviceId": "heater",
    "sensorType": "pressure",
    "label": "Water pressure",
    "value": 55,
    "unit": "psi",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "heater-reading-3",
    "deviceId": "heater",
    "sensorType": "water_usage",
    "label": "Hot water usage (today)",
    "value": 42,
    "unit": "gal",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "energy-reading-0",
    "deviceId": "energy",
    "sensorType": "power_usage",
    "label": "Current usage",
    "value": 1.8,
    "unit": "kW",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "energy-reading-1",
    "deviceId": "energy",
    "sensorType": "voltage",
    "label": "Supply voltage",
    "value": 120,
    "unit": "V",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "garage-reading-0",
    "deviceId": "garage",
    "sensorType": "door_position",
    "label": "Door position",
    "value": "Closed",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "garage-reading-1",
    "deviceId": "garage",
    "sensorType": "battery_level",
    "label": "Battery level",
    "value": 78,
    "unit": "%",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "air-reading-0",
    "deviceId": "air",
    "sensorType": "air_quality_index",
    "label": "Air quality index",
    "value": 22,
    "unit": "AQI",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "air-reading-1",
    "deviceId": "air",
    "sensorType": "humidity",
    "label": "Humidity",
    "value": 44,
    "unit": "%",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "bath-reading-0",
    "deviceId": "bath",
    "sensorType": "water_detection",
    "label": "Water detection",
    "value": "Dry",
    "unit": "",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  },
  {
    "id": "bath-reading-1",
    "deviceId": "bath",
    "sensorType": "battery_level",
    "label": "Battery level",
    "value": 89,
    "unit": "%",
    "timestamp": "2026-10-10T14:05:00Z",
    "status": "normal"
  }
];

export const mockMaintenanceTasks: MaintenanceTask[] = [
  {
    "id": "filter",
    "title": "Replace HVAC filter",
    "detail": "Improve air quality and system efficiency.",
    "dueDate": "2026-10-17",
    "priority": "medium",
    "deviceId": "hvac",
    "completed": false
  },
  {
    "id": "hose",
    "title": "Inspect dishwasher hose",
    "detail": "Check for wear or potential leaks.",
    "dueDate": "2026-10-24",
    "priority": "medium",
    "deviceId": "dishwasher",
    "completed": false
  },
  {
    "id": "sensor",
    "title": "Test leak sensor",
    "detail": "Ensure sensors are working properly.",
    "dueDate": "2026-11-09",
    "priority": "low",
    "deviceId": "sink",
    "completed": false
  }
];
