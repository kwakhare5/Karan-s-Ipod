import { useState, useCallback, useEffect } from 'react';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
}

const STORAGE_KEY = 'ipod_contacts';

function loadContacts(): Contact[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveContacts(contacts: Contact[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export const useContacts = () => {
    const [contacts, setContacts] = useState<Contact[]>(loadContacts);

    useEffect(() => {
        saveContacts(contacts);
    }, [contacts]);

    const addContact = useCallback((contact: Omit<Contact, 'id'>) => {
        const newContact: Contact = {
            ...contact,
            id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };
        setContacts(prev => [...prev, newContact].sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
        ));
        return newContact;
    }, []);

    const updateContact = useCallback((id: string, updates: Partial<Omit<Contact, 'id'>>) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)
            .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
        );
    }, []);

    const deleteContact = useCallback((id: string) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    }, []);

    const getContact = useCallback((id: string) => {
        return contacts.find(c => c.id === id) || null;
    }, [contacts]);

    // Always sorted alphabetically
    const sortedContacts = contacts.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );

    return {
        contacts: sortedContacts,
        addContact,
        updateContact,
        deleteContact,
        getContact,
    };
};
