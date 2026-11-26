import { useState } from './view.js';
export function useAttemptAnswers(kind) {
    const [answers, setAnswers] = useState({});
    const [key, setKey] = useState('');
    function restore(id) {
        const storageKey = `bimbel:${kind}:${id}`;
        setKey(storageKey);
        try {
            setAnswers(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}') ?? {});
        }
        catch {
            setAnswers({});
        }
    }
    function save(next) {
        setAnswers(next);
        sessionStorage.setItem(key, JSON.stringify(next));
    }
    return { answers, save, restore, clear: () => sessionStorage.removeItem(key) };
}
