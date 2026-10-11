import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Copy, IconTile, Screen } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { PreventiveInsight } from '@/components/homeiq/preventive-insight';
import { askHomeIQ } from '@/services/api';
import { createAssistantSubmission } from '@/services/assistant-scope';
import type { ApiPreventiveInsight } from '@/services/api-types';
import { useDemo } from '@/state/demo-context';

type AssistantMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  insight?: ApiPreventiveInsight;
  scopeLabel?: string;
  deviceId?: string;
};

export default function Assistant() {
  const { assistantScope, setAssistantScope } = useDemo();
  const deviceId = assistantScope?.deviceId;
  const scopeLabel = assistantScope?.deviceName ?? 'Whole home';
  useFocusEffect(useCallback(() => () => setAssistantScope(null), [setAssistantScope]));
  const suggestedQuestions = deviceId
    ? ['What changed for this device?', 'How urgently should I act?', 'What should I check next?']
    : ['What should I fix first?', 'Is anything getting worse?', 'What needs my attention today?'];
  const scrollRef = useRef<ScrollView>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([{
    id: 0, role: 'assistant', text: 'Ask what changed, why it matters, and what to check next. HomeIQ uses your current readings and recent history when available.',
  }]);
  const [input, setInput] = useState('');

  async function send(question: string) {
    const text = question.trim();
    if (!text || sendingRef.current) return;
    const submission = createAssistantSubmission(text, assistantScope);
    sendingRef.current = true;
    setSending(true);
    const conversation: AssistantMessage[] = [
      ...messages, { id: messages.length, role: 'user', text, scopeLabel: submission.scopeLabel },
    ];
    setMessages(conversation);
    setInput('');
    try {
      const response = await askHomeIQ(submission.request);
      setMessages(current => [...current, { id: current.length, role: 'assistant', text: response.answer,
        insight: response, scopeLabel: submission.scopeLabel, deviceId: submission.request.deviceId }]);
    } catch {
      setMessages(current => [...current, {
        id: current.length, role: 'assistant', scopeLabel: submission.scopeLabel,
        text: 'HomeIQ couldn’t load an insight right now. Please try asking again. You can still review your devices and alerts.',
      }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen title="Ask HomeIQ" subtitle="Preventive insights for your home" scrollRef={scrollRef}
        footer={
          <View style={s.composer}>
            <Card>
              <TextInput accessibilityLabel="Ask HomeIQ a question" placeholder="Ask about your home…"
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
              <Copy muted>Current readings · Historical changes · Practical next steps</Copy>
            </View>
          </View>
          <Copy muted>Asking about: {scopeLabel}</Copy>
          {deviceId && <Button label="Ask about the whole home" secondary disabled={sending}
            onPress={() => setAssistantScope(null)} />}
        </Card>
        {messages.map(message => (
          <View key={message.id} style={[s.bubble, message.role === 'user' && s.user]}>
            <Text style={[s.label, message.role === 'user' && { color: '#DCE6FF' }]}>
              {message.role === 'assistant' ? 'HomeIQ' : 'You'}
            </Text>
            {message.scopeLabel && <Copy style={[s.scope, message.role === 'user' && { color: '#DCE6FF' }]}>{message.scopeLabel}</Copy>}
            {message.insight ? <PreventiveInsight insight={message.insight} deviceId={message.deviceId} /> :
              <Copy style={message.role === 'user' ? { color: palette.white } : undefined}>{message.text}</Copy>}
          </View>
        ))}
        <View style={s.suggestions}>
          {suggestedQuestions.map(question => (
            <Pressable accessibilityRole="button" disabled={sending} accessibilityState={{ disabled: sending }} onPress={() => { void send(question); }} key={question} style={s.suggestion}>
              <Text style={{ color: palette.blue, fontSize: 12 }}>{question}</Text>
            </Pressable>
          ))}
        </View>
        {sending && <Copy muted>HomeIQ is reviewing sensor evidence…</Copy>}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scope: { color: palette.muted, fontSize: 11, lineHeight: 17 },
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
