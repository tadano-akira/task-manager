import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { Issue } from './types';
import { normalizeReading } from './kanaUtils';

// title/memo/searchTokens 用と searchReading 用の2インデックスをFuse.jsで構築し、
// 双方の検索結果をスコア（低いほど一致度が高い）でマージして返す。
export function useIssueSearch(issues: Issue[], query: string): Issue[] {
  const textFuse = useMemo(
    () =>
      new Fuse(issues, {
        keys: [
          { name: 'title', weight: 0.5 },
          { name: 'memo', weight: 0.2 },
          { name: 'searchTokens', weight: 0.3 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [issues]
  );

  const readingFuse = useMemo(
    () =>
      new Fuse(issues, {
        keys: ['searchReading'],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [issues]
  );

  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return issues;

    const textMatches = textFuse.search(trimmed);
    const readingMatches = readingFuse.search(normalizeReading(trimmed));

    const bestScoreById = new Map<string, number>();
    const issueById = new Map<string, Issue>();
    for (const { item, score } of [...textMatches, ...readingMatches]) {
      issueById.set(item.id, item);
      const resolvedScore = score ?? 1;
      const prev = bestScoreById.get(item.id);
      if (prev === undefined || resolvedScore < prev) bestScoreById.set(item.id, resolvedScore);
    }

    return [...bestScoreById.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => issueById.get(id))
      .filter((issue): issue is Issue => !!issue);
  }, [query, textFuse, readingFuse, issues]);
}
