import { router } from 'expo-router';
import { Badge, Card, Copy, Button, ItemRow, Screen, SectionHeading } from '@/components/homeiq/ui';
import { useDemo } from '@/state/demo-context';

export default function Maintenance() {
  const { devices, tasks, completed, toggleTask } = useDemo();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = tasks.map(task => ({
    ...task,
    status: completed.includes(task.id) ? 'Completed' :
      new Date(`${task.dueDate}T00:00:00`) < today ? 'Overdue' : 'Upcoming',
  }));
  const groups = ['Upcoming', 'Overdue', 'Completed'] as const;

  return (
    <Screen title="Maintenance" subtitle="Small steps for a healthier home." back>
      <Card>
        <SectionHeading title="Your home care plan" icon="calendar" />
        <Copy>{items.filter(task => task.status === 'Completed').length} of {tasks.length} tasks completed</Copy>
        <Copy muted>Check off a task when you&apos;re done. Changes stay in this demo session.</Copy>
      </Card>
      {groups.map(status => {
        const group = items.filter(task => task.status === status)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        const tone = status === 'Completed' ? 'green' : status === 'Overdue' ? 'red' : 'blue';
        return (
          <Card key={status}>
            <SectionHeading title={status} icon={status === 'Completed' ? 'check' : 'calendar'} tone={tone} count={group.length} />
            {group.length === 0 && <Copy muted>No {status.toLowerCase()} tasks.</Copy>}
            {group.map(task => {
              const device = devices.find(device => device.id === task.deviceId);
              const done = task.status === 'Completed';
              return (
                <Card key={task.id}>
                  <ItemRow title={task.title} detail={device ? `${device.name} · ${device.room}` : 'Device unavailable'}
                    icon={done ? 'check' : task.icon} tone={tone} badge={task.status}
                    onPress={device ? () => router.push({ pathname: '/device/[id]', params: { id: device.id } }) : undefined} />
                  <Copy muted>Due {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}</Copy>
                  <Badge label={`${task.priority} priority`} tone={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'green'} />
                  <Copy muted>{task.detail}</Copy>
                  <Button label={done ? 'Mark incomplete' : 'Mark complete'} secondary={done}
                    onPress={() => toggleTask(task.id)} />
                </Card>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}
