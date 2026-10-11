import type { ApiAskRequest } from './api-types';

export type AssistantScope = { deviceId: string; deviceName: string } | null;

export function openDeviceAssistant(
  device: { id: string; name: string },
  setScope: (scope: AssistantScope) => void,
  navigate: (href: '/(tabs)/assistant') => void,
) {
  setScope({ deviceId: device.id, deviceName: device.name });
  navigate('/(tabs)/assistant');
}

export function createAssistantSubmission(question: string, scope: AssistantScope): {
  request: ApiAskRequest;
  scopeLabel: string;
} {
  return {
    request: { question: question.trim(), ...(scope ? { deviceId: scope.deviceId } : {}) },
    scopeLabel: scope?.deviceName ?? 'Whole home',
  };
}

export function previewInsightEvidence(evidence: string[], deviceId?: string): string[] {
  const rank = (line: string) => {
    const relevant = deviceId && (line.includes(` ${deviceId}/`) || line.includes(` ${deviceId}:`));
    return (relevant ? 100 : 0)
      + (line.startsWith('Current ') && line.includes('status critical') ? 50
        : line.startsWith('Active alert ') ? 40
          : line.startsWith('Current ') && line.includes('status warning') ? 35
            : line.startsWith('Trend ') && !line.startsWith('Trend sample ') ? 30
              : line.startsWith('Maintenance ') ? 20 : 0);
  };
  return [...new Set(evidence)].sort((a, b) => rank(b) - rank(a)).slice(0, 3);
}
