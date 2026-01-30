import { useState, useEffect } from 'react';

/**
 * Custom hook for debounced values
 * Delays updating the value until after the specified delay
 * Useful for search inputs to avoid excessive filtering
 */
export const useDebounce = <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up timeout to update debounced value
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up timeout if value changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
