export function parseGatewayJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const candidates = [trimmed]
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced?.[1]) candidates.push(fenced[1].trim())

  const objectStart = trimmed.indexOf('{')
  const objectEnd = trimmed.lastIndexOf('}')
  if (trimmed[0] !== '[' && objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1))
  }

  for (const candidate of [...new Set(candidates)]) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Continue to the next tightly bounded representation.
    }
  }

  throw new Error('invalid_json')
}
