import { useState, type ChangeEvent } from "react";

/**
 * A name field that may stand empty while the person types. The document
 * never holds an empty name (core keeps the old one, or rejects it), so a
 * field bound straight to the document could not be cleared: backspacing
 * always left one letter. The field keeps its own draft, commits every
 * non-blank value as it is typed, and on blur falls back to the committed
 * name if it was left blank. A change from elsewhere (the watcher, another
 * tab) replaces the draft unless the person is mid-edit of the same value.
 */
export function useNameField(committed: string, commit: (name: string) => void) {
  const [draft, setDraft] = useState(committed);
  // Adjusting state during render, React's own pattern for "reset when a
  // prop changes": the last committed value seen tells whether it moved.
  const [seen, setSeen] = useState(committed);
  if (committed !== seen) {
    setSeen(committed);
    if (draft.trim() !== "" && draft.trim() !== committed) setDraft(committed);
  }
  return {
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      if (next.trim() !== "") commit(next);
    },
    onBlur: () => {
      if (draft.trim() === "") setDraft(committed);
    },
  };
}
