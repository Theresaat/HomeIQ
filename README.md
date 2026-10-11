# HomeIQ

**Home Intelligence That Sees Trouble Coming**

HomeIQ is a preventive home intelligence platform designed to help homeowners and property managers detect potential household problems before they become expensive repairs.

Instead of waiting until something breaks, HomeIQ combines smart sensor data, historical trends, maintenance reminders, Snowflake-backed data storage and Gemini-powered insights to help users understand what is happening in their home and what they should do next.

## What HomeIQ Does

HomeIQ monitors household systems and appliances such as:

- Water systems
- Leak sensors
- Refrigerators
- Dryers
- Dishwashers
- Water heaters
- Energy usage
- Other major home systems

The app provides:

- Real-time sensor monitoring
- Device health status
- Home Health Score
- Alerts for warning and critical conditions
- Maintenance reminders
- Historical sensor trends
- "What Changed?" insights
- AI-powered explanations and recommendations
- Preventive home-care guidance
- Energy intelligence

Our core idea is simple:

**Detect problems early + take action sooner = fewer costly repairs**

## Technology Stack

HomeIQ is built with:

### Frontend

- React Native
- Expo
- Expo Router
- TypeScript

### Backend

- Node.js
- Express.js
- TypeScript
- REST APIs

### Cloud and AI

- Snowflake
- Gemini API

Snowflake acts as HomeIQ's historical memory by storing device and sensor data over time.

Gemini uses that context to turn sensor readings and historical changes into clear explanations, risk indicators and recommended next steps.

## Project Structure

```text
HomeIQ/
├── src/                 # Expo / React Native application
├── backend/             # Node.js + Express backend
├── assets/              # Images and app assets
├── tests/               # Frontend tests
├── package.json
└── README.md
