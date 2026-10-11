import { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Copy, IconTile, Screen } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { getAssistantGreeting, getAssistantResponse, suggestedQuestions, type AssistantMessage } from '@/data/mock-assistant';
import { useDemo } from '@/state/demo-context';

export default function Assistant() {
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const { completed, homeHealthScore, devices, insight } = useDemo();
  const scrollRef = useRef<ScrollView>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([{
    id: 0, role: 'assistant', text: getAssistantGreeting(devices, insight, deviceId),
  }]);
  const [input, setInput] = useState('');

  async function send(question: string) {
    const text = question.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const conversation: AssistantMessage[] = [
      ...messages, { id: messages.length, role: 'user', text },
    ];
    setMessages(conversation);
    setInput('');
    try {
      const response = await getAssistantResponse({ messages: conversation, deviceId, completedTaskIds: completed, homeHealthScore, devices, insight });
      setMessages(current => [...current, { id: current.length, role: 'assistant', text: response }]);
    } catch {
      setMessages(current => [...current, {
        id: current.length, role: 'assistant', text: 'I couldn’t respond just now. Please try asking again.',
      }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen title="AI Assistant" subtitle="Your home care companion" scrollRef={scrollRef}
        footer={
          <View style={s.composer}>
            <Card>
              <TextInput accessibilityLabel="Message HomeIQ demo assistant" placeholder="Ask about your home…"
                placeholderTextColor={palette.muted} value={input} onChangeText={setInput}
                multiline scrollEnabled style={s.input} />
              <Button label={sending ? 'Responding…' : 'Send message'} disabled={!input.trim() || sending}
                onPress={() => { void send(input); }} />
            </Card>
          </View>
        }>
        <Card>
          <View style={s.heading}>
            <IconTile name="assistant" />
            <View style={{ flex: 1 }}>
              <Copy style={{ fontWeight: '700' }}>Meet HomeIQ</Copy>
              <Copy muted>Demo assistant · Scripted replies</Copy>
            </View>
          </View>
        </Card>
        {messages.map(message => (
          <View key={message.id} style={[s.bubble, message.role === 'user' && s.user]}>
            <Text style={[s.label, message.role === 'user' && { color: '#DCE6FF' }]}>
              {message.role === 'assistant' ? 'HomeIQ' : 'You'}
            </Text>
            <Copy style={message.role === 'user' ? { color: palette.white } : undefined}>
              {message.text}
            </Copy>
          </View>
        ))}
        <View style={s.suggestions}>
          {suggestedQuestions.map(question => (
            <Pressable accessibilityRole="button" disabled={sending} accessibilityState={{ disabled: sending }} onPress={() => { void send(question); }} key={question} style={s.suggestion}>
              <Text style={{ color: palette.blue, fontSize: 12 }}>{question}</Text>
            </Pressable>
          ))}
        </View>
        {sending && <Copy muted>HomeIQ is responding…</Copy>}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  composer: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 12 },
  heading: {
    flexDirection: 'row', alignItems: 'center', gap: 12
  }, bubble: {
    backgroundColor: palette.white, borderRadius: 20, padding: 16, gap: 8, maxWidth: '95%', borderWidth: 1, borderColor: palette.border, alignSelf: 'flex-start'
  }, user: {
    backgroundColor: palette.blue, alignSelf: 'flex-end', borderColor: palette.blue
  }, label: {
    fontSize: 11, fontWeight: '700', color: palette.blue
  }, suggestions: { gap: 8, alignItems: 'flex-start' }, suggestion: {
    padding: 13, borderRadius: 15, backgroundColor: palette.blueSoft, maxWidth: '100%'
  }, input: {
    color: palette.ink, minHeight: 50, maxHeight: 130, fontSize: 14, textAlignVertical: 'top'
  }
});
