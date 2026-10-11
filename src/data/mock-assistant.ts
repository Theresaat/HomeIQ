import { home, tasks, waterUsage, type Device } from './mock-home';

export type AssistantMessage = { id: number; role: 'assistant' | 'user'; text: string };

export const suggestedQuestions = [
  'Why is my water usage high?',
  'What needs maintenance this week?',
  'Is my refrigerator working normally?',
  'What should I check before calling a repair company?',
];

export function getAssistantGreeting(devices: Device[], insight: string, deviceId?: string): string {
  const device = devices.find(item => item.id === deviceId);
  return device
    ? `Let's look at your ${device.name.toLowerCase()}. ${device.description}`
    : `Hi ${home.owner.split(' ')[0]}! ${insight} How can I help you care for your home?`;
}

// The UI passes conversation history and context, and awaits plain response text.
export async function getAssistantResponse({ messages, deviceId, completedTaskIds, homeHealthScore, devices, insight }: {
  messages: AssistantMessage[];
  devices: Device[];
  insight: string;
  deviceId?: string;
  completedTaskIds: string[];
  homeHealthScore: number;
}): Promise<string> {
  const question = messages.filter(message => message.role === 'user').at(-1)?.text.toLowerCase() ?? '';
  if (/repair|company/.test(question)) {
    const device = devices.find(item => item.id === deviceId);
    return device
      ? `Before calling a repair company about ${device.name.toLowerCase()}: ${device.recommendedAction.detail} Note the latest readings and alert history to share with the technician. These are sample recommendations.`
      : 'Before calling a repair company, review the affected device’s alerts and latest readings, note when the issue started, and check visible connections or settings without dismantling the device. Share those observations with the technician. These are sample recommendations.';
  }
  if (/maintenance|filter|hvac/.test(question)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const due = tasks.filter(task => !completedTaskIds.includes(task.id) && new Date(`${task.dueDate}T00:00:00`) <= weekEnd);
    return due.length
      ? `Your sample plan has these tasks due within the next seven days or overdue: ${due.map(task => `${task.title} (due ${task.dueDate}, ${task.priority.toLowerCase()} priority)`).join('; ')}. Open Maintenance to review and check them off.`
      : 'No incomplete sample maintenance tasks are due within the next seven days. Open Maintenance to see upcoming tasks.';
  }
  if (/fridge|refrigerator|temperature/.test(question)) {
    const fridge = devices.find(device => device.id === 'fridge');
    return fridge ? `Your refrigerator’s sample reading is ${fridge.reading}, with status ${fridge.status.toLowerCase()}. ${fridge.description} ${fridge.recommendedAction.detail}` : 'No refrigerator readings are available in this demo.';
  }
  if (/leak|water|sink/.test(question)) {
    const sink = devices.find(device => device.id === 'sink');
    return `The sample water usage is ${waterUsage.today} ${waterUsage.unit}, ${waterUsage.changePercent}% ${waterUsage.comparison}, with a daily goal of ${waterUsage.dailyGoal} ${waterUsage.unit}. It is currently ${waterUsage.status.toLowerCase()}. Higher usage can come from longer showers, appliance cycles, or leaks. ${sink?.recommendedAction.detail ?? ''}`;
  }
  return `Your sample home health score is ${homeHealthScore} out of 100. ${insight} Try asking about water usage, refrigerator health, or maintenance.`;
}
