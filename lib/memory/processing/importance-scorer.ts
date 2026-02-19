const DECISION_KEYWORDS = [
  'recommend', 'suggest', 'decide', 'chose', 'selected', 'will use', 'going with',
  'strategy', 'plan', 'approach', 'solution', 'resolved', 'concluded', 'agreed',
  'determined', 'confirmed', 'approved', 'rejected',
]

const HIGH_VALUE_KEYWORDS = [
  'important', 'critical', 'urgent', 'deadline', 'budget', 'contract', 'deal',
  'launch', 'release', 'migration', 'issue', 'problem', 'blocked', 'risk',
  'security', 'compliance', 'legal', 'revenue', 'customer',
]

export function scoreImportance(text: string): number {
  let score = 0.3 // base score

  const lower = text.toLowerCase()

  // Decision language — highest signal
  const decisionHits = DECISION_KEYWORDS.filter(k => lower.includes(k)).length
  score += Math.min(decisionHits * 0.08, 0.3)

  // High-value keywords
  const highValueHits = HIGH_VALUE_KEYWORDS.filter(k => lower.includes(k)).length
  score += Math.min(highValueHits * 0.05, 0.15)

  // Length factor — longer content tends to be more meaningful
  const wordCount = text.split(/\s+/).length
  score += Math.min(Math.log10(wordCount + 1) / 5, 0.1)

  // Question + answer pattern
  if (lower.includes('?')) score += 0.05

  // Positive feedback signals
  if (/thank|great|perfect|exactly|confirmed|approved|works/.test(lower)) score += 0.05

  return Math.min(score, 1.0)
}
