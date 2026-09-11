import { useRef } from "react";
import { Input } from "../components/ui/input";

/**
 * Characters a formatter is not allowed to move around: the ones the user actually
 * typed a value with. Everything else — separators, a dialling `+`, whitespace — is
 * presentation the formatter owns, so the caret is anchored to the significant
 * characters that follow it rather than to a raw offset.
 */
const SIGNIFICANT_CHARACTER_REGEX = /[\p{L}\p{N}]/u;

function isSignificant(character: string): boolean {
  return SIGNIFICANT_CHARACTER_REGEX.test(character);
}

function countSignificant(text: string): number {
  let count = 0;
  for (const character of text) {
    if (isSignificant(character)) count += 1;
  }

  return count;
}

/**
 * Where the caret belongs in the formatted text, counted from the end.
 *
 * Counting the significant characters *after* the caret survives anything the
 * formatter adds or removes in front of it — a `+351` it prepended, a `PT` prefix or
 * the spaces it dropped — which an offset-based mapping cannot.
 */
export function mapCaretToFormattedValue(rawValue: string, caret: number, formattedValue: string): number {
  const remaining = countSignificant(rawValue.slice(caret));
  if (remaining === 0) return formattedValue.length;

  let seen = 0;
  for (let index = formattedValue.length; index > 0; index -= 1) {
    if (!isSignificant(formattedValue[index - 1])) continue;
    seen += 1;
    if (seen === remaining) return index - 1;
  }

  return 0;
}

/** The native event behind a React change, when the browser gave us a typed one. */
function getInputEvent(event: Event): InputEvent | null {
  return typeof InputEvent !== "undefined" && event instanceof InputEvent ? event : null;
}

export type FormattedInputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  value: string | number;
  /**
   * The spelling this field shows for what the user has typed so far. It runs on
   * every input and paste, so it has to leave partial and rejected entries alone:
   * formatting is presentation, and validation still decides what is acceptable.
   * Omitted, the field is an ordinary controlled input.
   */
  formatter?: (value: string) => string;
  /** The formatted value, for the form to hold. Fires for every edit, formatted or not. */
  onValueChange: (value: string) => void;
};

/**
 * A text input that formats what the user types as they type it, without taking the
 * caret away from them.
 *
 * The formatting rules themselves live with the field's domain (see
 * `pt-entity-input.ts`); this only owns the mechanics every live-formatted field
 * needs: run the formatter on each edit, keep the caret on the character the user
 * was working on, and let a deletion that only removes a generated separator get
 * past it instead of reinserting it forever. An in-progress IME composition is left
 * untouched until it finishes.
 */
export function FormattedInput({
  value,
  formatter,
  onValueChange,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: FormattedInputProps) {
  const isComposingRef = useRef(false);

  const applyFormatting = (input: HTMLInputElement, inputType: string | undefined) => {
    const rawValue = input.value;
    if (!formatter) {
      onValueChange(rawValue);
      return;
    }

    // `null` for input types with no selection API (email, number); those simply
    // keep the caret the browser gave them.
    const selectionStart = input.selectionStart;
    const caret = selectionStart ?? rawValue.length;
    const selectionEnd = input.selectionEnd ?? caret;
    const selectionDirection = input.selectionDirection ?? undefined;
    const previousValue = String(value ?? "");
    const formattedValue = formatter(rawValue);

    if (formattedValue === rawValue) {
      onValueChange(rawValue);
      return;
    }

    let nextCaret = mapCaretToFormattedValue(rawValue, caret, formattedValue);
    let nextSelectionEnd = mapCaretToFormattedValue(rawValue, selectionEnd, formattedValue);
    if (formattedValue === previousValue && inputType?.startsWith("delete")) {
      // The edit removed only characters the formatter puts straight back, so the
      // field cannot change. Move the caret past them instead, leaving the next
      // keystroke to delete a character that counts.
      nextCaret =
        inputType === "deleteContentForward"
          ? Math.min(caret + (previousValue.length - rawValue.length), formattedValue.length)
          : caret;
      nextSelectionEnd = nextCaret;
    }

    input.value = formattedValue;
    if (selectionStart !== null) {
      input.setSelectionRange(nextCaret, nextSelectionEnd, selectionDirection);
    }

    onValueChange(formattedValue);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputEvent = getInputEvent(event.nativeEvent);
    if (isComposingRef.current || inputEvent?.isComposing) {
      // Half-composed text is not a value yet; formatting it would end the composition.
      onValueChange(event.currentTarget.value);
      return;
    }

    applyFormatting(event.currentTarget, inputEvent?.inputType);
  };

  const handleCompositionStart = (event: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = true;
    onCompositionStart?.(event);
  };

  const handleCompositionEnd = (event: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    applyFormatting(event.currentTarget, undefined);
    onCompositionEnd?.(event);
  };

  return (
    <Input
      {...props}
      value={value ?? ""}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
}
