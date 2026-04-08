import { memo } from 'react';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/** Normalize for accent-insensitive matching */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Renders text with matching substrings highlighted in yellow.
 * Accent-insensitive and case-insensitive.
 */
export const HighlightedText = memo(function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;

  let searchStart = 0;
  while (searchStart < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, searchStart);
    if (matchIndex === -1) break;

    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, matchIndex), highlight: false });
    }

    // Add matched text (use original casing)
    parts.push({
      text: text.slice(matchIndex, matchIndex + normalizedQuery.length),
      highlight: true,
    });

    lastIndex = matchIndex + normalizedQuery.length;
    searchStart = lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="bg-[hsl(var(--warning)/0.35)] dark:bg-[hsl(var(--warning)/0.25)] text-inherit rounded-sm px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
});
