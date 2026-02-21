import { useState, useCallback, useEffect } from 'react';

export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'ipod_notes';

function loadNotes(): Note[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveNotes(notes: Note[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export const useNotes = () => {
    const [notes, setNotes] = useState<Note[]>(loadNotes);

    useEffect(() => {
        saveNotes(notes);
    }, [notes]);

    const addNote = useCallback((title: string, content: string) => {
        const now = Date.now();
        const newNote: Note = {
            id: `n_${now}_${Math.random().toString(36).slice(2, 8)}`,
            title: title || 'Untitled',
            content,
            createdAt: now,
            updatedAt: now,
        };
        setNotes(prev => [newNote, ...prev]);
        return newNote;
    }, []);

    const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
        setNotes(prev => prev.map(n => n.id === id
            ? { ...n, ...updates, updatedAt: Date.now() }
            : n
        ));
    }, []);

    const deleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const getNote = useCallback((id: string) => {
        return notes.find(n => n.id === id) || null;
    }, [notes]);

    return {
        notes,
        addNote,
        updateNote,
        deleteNote,
        getNote,
    };
};
