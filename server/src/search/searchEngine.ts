import { IndexedDocument, SearchResult } from './searchTypes';
import { tokenize } from './textNormalizer';

type SearchOptions = {
  filter?: 'all' | 'digital' | 'ocr' | 'hybrid';
};

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((total, term) => {
    const matches = text.match(new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi'));
    return total + (matches?.length || 0);
  }, 0);
}

function generateSnippet(text: string, terms: string[]): string {
  const lowerText = text.toLowerCase();
  const firstTerm = terms.find(term => lowerText.includes(term));
  if (!firstTerm) return '';

  const position = lowerText.indexOf(firstTerm);
  const start = Math.max(0, position - 60);
  const end = Math.min(text.length, position + firstTerm.length + 60);
  let snippet = text.slice(start, end).trim();

  for (const term of terms) {
    snippet = snippet.replace(
      new RegExp(`(${escapeRegExp(term)})`, 'gi'),
      '[[MATCH]]$1[[/MATCH]]'
    );
  }

  return snippet;
}

function generateNameSnippet(name: string, terms: string[]): string {
  let snippet = name;
  for (const term of terms) {
    snippet = snippet.replace(
      new RegExp(`(${escapeRegExp(term)})`, 'gi'),
      '[[MATCH]]$1[[/MATCH]]'
    );
  }
  return snippet;
}

/**
 * Searches indexed documents with TF-IDF style frequency scoring and snippets.
 */
export function searchDocuments(
  documents: IndexedDocument[],
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const terms = tokenize(query);
  const phrase = query.toLowerCase().trim();
  const filter = options.filter || 'all';

  if (terms.length === 0) return [];

  const scored = documents
    .filter(document => filter === 'all' || document.type === filter)
    .map(document => {
      const termScore = terms.reduce((sum, term) => sum + (document.wordMap[term] || 0), 0);
      const phraseBonus = phrase && document.text.toLowerCase().includes(phrase) ? 30 : 0;
      const normalizedName = document.name.toLowerCase();
      const nameBonus = terms.reduce((sum, term) => normalizedName.includes(term) ? sum + 25 : sum, 0);
      const namePhraseBonus = phrase && normalizedName.includes(phrase) ? 30 : 0;
      const rawScore = termScore + phraseBonus + nameBonus + namePhraseBonus;

      return {
        document,
        rawScore,
        matchCount: countMatches(document.text, terms)
      };
    })
    .filter(item => item.rawScore > 0);

  const maxScore = Math.max(...scored.map(item => item.rawScore), 0);
  if (maxScore === 0) return [];

  return scored
    .map(item => ({
      docId: item.document.id,
      docName: item.document.name,
      docType: item.document.type,
      score: Math.round((item.rawScore / maxScore) * 100),
      snippet: generateSnippet(item.document.text, terms) || generateNameSnippet(item.document.name, terms),
      matchCount: item.matchCount,
      pages: item.document.pages
    }))
    .sort((a, b) => b.score - a.score);
}
