import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";

type SearchInputProps = {
  initialValue?: string;
  onSearch: (value: string | null) => void;
  placeholder?: string;
  debounceMs?: number;
};

/**
 * Search input with optional clear button and form submission
 */
export function SearchInput({ initialValue = "", onSearch, placeholder = "Search...", debounceMs }: SearchInputProps) {
  const [value, setValue] = useState(initialValue);

  // Use ref to keep onSearch stable in useEffect
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Sync with external value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Optional debounced search
  useEffect(() => {
    if (debounceMs === undefined) return;

    const timer = setTimeout(() => {
      onSearchRef.current(value || null);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceMs === undefined) {
        onSearchRef.current(value || null);
      }
    },
    [debounceMs, value],
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setValue("");
    onSearchRef.current(null);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative inline-block" data-testid="search-form">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="searchbox"
        aria-label="Search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="h-8 w-[150px] pr-8 pl-8 lg:w-[250px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute top-1/2 right-1 z-10 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
          aria-label="Clear search"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </form>
  );
}
