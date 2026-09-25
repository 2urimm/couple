import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCouple } from '@/store/couple-store';
import type { Question } from '@/types/models';

export default function QuestionsScreen() {
  const { questions, addQuestion } = useCouple();
  const [newQuestion, setNewQuestion] = useState('');

  return (
    <Screen subtitle="내가 먼저 답해야 상대방 답변을 볼 수 있어요">
      <Card>
        <TextField value={newQuestion} onChangeText={setNewQuestion} placeholder="궁금한 거 물어보기" />
        <Button
          label="질문하기"
          onPress={() => {
            if (!newQuestion.trim()) return;
            addQuestion(newQuestion.trim());
            setNewQuestion('');
          }}
        />
      </Card>
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </Screen>
  );
}

function QuestionCard({ question }: { question: Question }) {
  const { couple, answerQuestion } = useCouple();
  const [draft, setDraft] = useState('');
  const myAnswer = question.answers.me;
  const partnerAnswer = question.answers.partner;

  return (
    <Card>
      <ThemedText type="smallBold">Q. {question.text}</ThemedText>
      {myAnswer ? (
        <>
          <ThemedText>나: {myAnswer}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {couple.partnerName}: {partnerAnswer ?? '아직 답하지 않았어요'}
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {partnerAnswer ? `🔒 ${couple.partnerName}님은 답했어요. 내 답을 쓰면 열려요!` : '🔒 둘 다 답하면 공개돼요'}
          </ThemedText>
          <TextField value={draft} onChangeText={setDraft} placeholder="내 답변" multiline />
          <Button
            label="답변하기"
            variant="secondary"
            onPress={() => draft.trim() && answerQuestion(question.id, draft.trim())}
          />
        </>
      )}
    </Card>
  );
}
