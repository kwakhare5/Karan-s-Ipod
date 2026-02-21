import { useState, useCallback } from 'react';
import { MenuIDs, NavigationState } from '../types';

export const useNavigation = () => {
    const [savedIndices, setSavedIndices] = useState<Record<string, number>>({});
    const [navState, setNavState] = useState<NavigationState>({
        currentMenuId: MenuIDs.HOME,
        selectedIndex: 0,
        menuStack: []
    });

    const navigateTo = useCallback((targetMenuId: string) => {
        setNavState(prev => {
            // Save current index for the menu we are leaving
            setSavedIndices(saved => ({ ...saved, [prev.currentMenuId]: prev.selectedIndex }));
            
            // Restore saved index for target or default to 0
            const restoreIndex = savedIndices[targetMenuId] || 0;
            
            return {
                ...prev,
                menuStack: [...prev.menuStack, { menuId: prev.currentMenuId, selectedIndex: prev.selectedIndex }],
                currentMenuId: targetMenuId,
                selectedIndex: restoreIndex
            };
        });
    }, [savedIndices]);

    const goBack = useCallback(() => {
        setNavState(prev => {
            if (prev.menuStack.length === 0) return prev;
            
            // Save current index before going back
            setSavedIndices(saved => ({ ...saved, [prev.currentMenuId]: prev.selectedIndex }));
            
            const newStack = [...prev.menuStack];
            const lastState = newStack.pop();
            
            return {
                ...prev,
                menuStack: newStack,
                currentMenuId: lastState ? lastState.menuId : MenuIDs.HOME,
                selectedIndex: lastState ? lastState.selectedIndex : 0
            };
        });
    }, []);

    const selectIndex = useCallback((index: number) => {
        setNavState(prev => ({ ...prev, selectedIndex: index }));
        // Also update saved index for current menu immediately
        setNavState(prev => {
            setSavedIndices(saved => ({ ...saved, [prev.currentMenuId]: index }));
            return prev;
        });
    }, []);

    const scroll = useCallback((direction: 'cw' | 'ccw', listLength: number) => {
        if (listLength === 0) return;
        setNavState(prev => {
            let newIndex = prev.selectedIndex + (direction === 'cw' ? 1 : -1);
            if (newIndex < 0) newIndex = listLength - 1;
            if (newIndex >= listLength) newIndex = 0;
            return { ...prev, selectedIndex: newIndex };
        });
    }, []);

    // Helper to force navigation state (e.g., for external events like search results)
    const setNavigation = useCallback((updates: Partial<NavigationState>) => {
        setNavState(prev => ({ ...prev, ...updates }));
    }, []);

    return {
        navState,
        navigateTo,
        goBack,
        selectIndex,
        scroll,
        setNavigation
    };
};
