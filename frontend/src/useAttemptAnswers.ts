import { useState } from 'react';

type Answers = Record<number, string>;

export function useAttemptAnswers(kind: 'test' | 'cbt') {
  const [answers, setAnswers] = useState<Answers>({});
  const [key, setKey] = useState('');

  function restore(id: number) {
    const storageKey = `bimbel:${kind}:${id}`;
    setKey(storageKey);
    try {
      setAnswers(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}') ?? {});
    } catch {
      setAnswers({});
    }
  }

  function save(next: Answers) {
    setAnswers(next);
    sessionStorage.setItem(key, JSON.stringify(next));
  }

  return { answers, save, restore, clear: () => sessionStorage.removeItem(key) };
}
