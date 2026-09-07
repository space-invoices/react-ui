"use client";

import { memo } from "react";

// Bound syntax-token DOM work for large logs; preserve the complete escaped text.
const MAX_HIGHLIGHTED_JSON_LENGTH = 50_000;

export const JsonHighlight = memo(function JsonHighlight({ json }: { json: string }) {
  if (json.length > MAX_HIGHLIGHTED_JSON_LENGTH) return <code>{`${json}\n`}</code>;
  // Parse JSON into tokens for safe rendering
  const tokens: { key: string; type: string; value: string }[] = [];
  const lines = json.split("\n");
  let tokenKey = 0;

  const pushToken = (type: string, value: string) => {
    tokens.push({ key: `${type}:${tokenKey}`, type, value });
    tokenKey += 1;
  };

  for (const line of lines) {
    // Match key-value patterns
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      const [, indent, key] = keyMatch;
      const rest = line.slice(keyMatch[0].length);
      pushToken("indent", indent);
      pushToken("key", `"${key}"`);
      pushToken("punctuation", ":");

      // Parse value
      const valueMatch = rest.match(/^\s*(.+?)(,?)$/);
      if (valueMatch) {
        const [, value, comma] = valueMatch;
        pushToken("space", " ");
        if (value.startsWith('"')) {
          pushToken("string", value.replace(/,$/, ""));
        } else if (value === "true" || value === "false") {
          pushToken("boolean", value);
        } else if (value === "null") {
          pushToken("null", value);
        } else if (!Number.isNaN(Number(value.replace(/,$/, "")))) {
          pushToken("number", value.replace(/,$/, ""));
        } else {
          pushToken("other", value.replace(/,$/, ""));
        }
        if (comma) pushToken("punctuation", comma);
      }
    } else {
      pushToken("other", line);
    }
    pushToken("newline", "\n");
  }

  const colorMap: Record<string, string> = {
    key: "text-blue-600 dark:text-blue-400",
    string: "text-green-600 dark:text-green-400",
    number: "text-orange-600 dark:text-orange-400",
    boolean: "text-purple-600 dark:text-purple-400",
    null: "text-gray-500",
  };

  return (
    <code>
      {tokens.map((token) => (
        <span key={token.key} className={colorMap[token.type] || ""}>
          {token.value}
        </span>
      ))}
    </code>
  );
});
