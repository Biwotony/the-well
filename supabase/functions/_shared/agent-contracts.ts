export type AgentType =
  | "story_intelligence"
  | "content_factory"
  | "growth_retention"
  | "chief_operator";

type JsonObject = Record<string, unknown>;

export const allowedAgents = new Set<AgentType>([
  "story_intelligence",
  "content_factory",
  "growth_retention",
  "chief_operator",
]);

export const agentPrompts: Record<AgentType, string> = {
  story_intelligence:
    "Analyze only approved published-story signals and permitted knowledge. Identify themes, overlap, gaps, sensitivities, and editorial opportunities without profiling readers or inferring private traits. Recommend actions for a human editor; never edit or publish content.",
  content_factory:
    "Create an original private editorial draft for mature Christian women. Use a warm, realistic voice, careful Scripture context, and explicit safety caveats where abuse, coercion, grief, sexuality, divorce, or mental health appear. Never present invented material as testimony, copy source prose, claim professional authority, or imply that faith requires remaining in danger.",
  growth_retention:
    "Use only supplied, verified aggregate signals. Recommend low-pressure discovery or editorial experiments without inventing metrics, targeting intimate vulnerabilities, creating spiritual scores, sending messages, or executing changes.",
  chief_operator:
    "Use only supplied verified system facts. Summarize health, costs, failures, risks, owners, and next actions. Never claim access you do not have, approve spending, change permissions, deploy, or direct another agent.",
};

const commonInputKeys = new Set(["knowledge_query", "knowledge_categories"]);
const inputKeys: Record<AgentType, Set<string>> = {
  story_intelligence: new Set([...commonInputKeys, "brief", "published_story_ids", "constraints"]),
  content_factory: new Set([...commonInputKeys, "brief", "audience", "constraints", "format"]),
  growth_retention: new Set(["objective", "verified_metrics", "constraints"]),
  chief_operator: new Set(["objective", "system_snapshot", "constraints"]),
};

const schemas: Record<AgentType, JsonObject> = {
  story_intelligence: {
    type: "object",
    additionalProperties: false,
    required: ["themes", "content_gaps", "overlap_risks", "safety_notes", "recommendations", "limitations"],
    properties: {
      themes: stringArraySchema(1, 10),
      content_gaps: stringArraySchema(1, 10),
      overlap_risks: stringArraySchema(0, 10),
      safety_notes: stringArraySchema(0, 10),
      recommendations: stringArraySchema(1, 10),
      limitations: stringArraySchema(1, 8),
    },
  },
  content_factory: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "featured_quote", "sensitive_topics", "episode", "reflection_questions", "scripture_references", "editorial_notes", "safety_notes", "limitations"],
    properties: {
      title: { type: "string", minLength: 3, maxLength: 140 },
      summary: { type: "string", minLength: 20, maxLength: 1000 },
      featured_quote: { type: "string", minLength: 1, maxLength: 300 },
      sensitive_topics: stringArraySchema(0, 12),
      episode: {
        type: "object",
        additionalProperties: false,
        required: ["title", "excerpt", "body", "reading_minutes"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 180 },
          excerpt: { type: "string", minLength: 20, maxLength: 600 },
          body: { type: "string", minLength: 800, maxLength: 16000 },
          reading_minutes: { type: "integer", minimum: 3, maximum: 20 },
        },
      },
      reflection_questions: stringArraySchema(2, 5),
      scripture_references: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["reference", "rationale"],
          properties: {
            reference: { type: "string", minLength: 3, maxLength: 80 },
            rationale: { type: "string", minLength: 10, maxLength: 400 },
          },
        },
      },
      editorial_notes: stringArraySchema(1, 10),
      safety_notes: stringArraySchema(1, 10),
      limitations: stringArraySchema(1, 8),
    },
  },
  growth_retention: {
    type: "object",
    additionalProperties: false,
    required: ["hypothesis", "verified_evidence", "experiment", "success_metric", "guardrails", "limitations"],
    properties: {
      hypothesis: { type: "string", minLength: 10, maxLength: 600 },
      verified_evidence: stringArraySchema(0, 10),
      experiment: { type: "string", minLength: 10, maxLength: 1200 },
      success_metric: { type: "string", minLength: 5, maxLength: 400 },
      guardrails: stringArraySchema(1, 10),
      limitations: stringArraySchema(1, 8),
    },
  },
  chief_operator: {
    type: "object",
    additionalProperties: false,
    required: ["health", "costs", "security_concerns", "failures", "priorities", "limitations"],
    properties: {
      health: { type: "string", minLength: 5, maxLength: 1000 },
      costs: stringArraySchema(1, 10),
      security_concerns: stringArraySchema(0, 10),
      failures: stringArraySchema(0, 10),
      priorities: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "owner", "urgency"],
          properties: {
            action: { type: "string", minLength: 5, maxLength: 500 },
            owner: { type: "string", minLength: 2, maxLength: 100 },
            urgency: { type: "string", enum: ["now", "next", "later"] },
          },
        },
      },
      limitations: stringArraySchema(1, 8),
    },
  },
};

export function responseSchema(agent: AgentType) {
  return schemas[agent];
}

export function validateAgentInput(agent: AgentType, value: unknown) {
  const errors: string[] = [];
  if (!isObject(value)) return { errors: ["input_must_be_object"], input: {} };

  const entries = Object.entries(value);
  if (entries.length > 12) errors.push("too_many_input_fields");
  for (const [key, field] of entries) {
    if (!inputKeys[agent].has(key)) errors.push(`unsupported_input_field:${key}`);
    if (key === "knowledge_categories") {
      if (!Array.isArray(field) || field.length > 8 || field.some((item) => typeof item !== "string" || item.length > 80)) {
        errors.push("invalid_knowledge_categories");
      }
      continue;
    }
    if (key === "published_story_ids") {
      if (!Array.isArray(field) || field.length > 25 || field.some((item) => typeof item !== "string" || item.length > 80)) {
        errors.push("invalid_published_story_ids");
      }
      continue;
    }
    if (key === "verified_metrics" || key === "system_snapshot") {
      if (!isObject(field) || JSON.stringify(field).length > 8000) errors.push(`invalid_${key}`);
      continue;
    }
    if (typeof field !== "string" || field.trim().length === 0 || field.length > 6000 || field.includes("\u0000")) {
      errors.push(`invalid_${key}`);
    }
  }

  if (agent === "content_factory" && typeof value.brief !== "string") errors.push("content_factory_brief_required");
  if (agent === "growth_retention" && typeof value.objective !== "string") errors.push("growth_objective_required");
  if (agent === "chief_operator" && !isObject(value.system_snapshot)) errors.push("verified_system_snapshot_required");
  if (JSON.stringify(value).length > 16000) errors.push("input_too_large");

  return { errors: [...new Set(errors)], input: value };
}

export function validateAgentOutput(agent: AgentType, value: unknown) {
  const errors: string[] = [];
  if (!isObject(value)) return ["output_must_be_object"];
  validateAgainstSchema(value, schemas[agent], "$", errors);
  return errors;
}

export function contentFactoryDraft(value: JsonObject) {
  const episode = value.episode as JsonObject;
  return {
    title: String(value.title),
    summary: String(value.summary),
    featuredQuote: String(value.featured_quote),
    sensitiveTopics: (value.sensitive_topics as unknown[]).map(String),
    episodeTitle: String(episode.title),
    episodeExcerpt: String(episode.excerpt),
    episodeBody: String(episode.body),
    readingMinutes: Number(episode.reading_minutes),
  };
}

function stringArraySchema(minItems: number, maxItems: number): JsonObject {
  return {
    type: "array",
    minItems,
    maxItems,
    items: { type: "string", minLength: 1, maxLength: 600 },
  };
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateAgainstSchema(value: unknown, schema: JsonObject, path: string, errors: string[]) {
  const type = schema.type;
  if (type === "object") {
    if (!isObject(value)) { errors.push(`${path}:expected_object`); return; }
    const properties = schema.properties as Record<string, JsonObject>;
    const required = new Set((schema.required as string[]) ?? []);
    for (const name of required) if (!(name in value)) errors.push(`${path}.${name}:required`);
    if (schema.additionalProperties === false) {
      for (const name of Object.keys(value)) if (!(name in properties)) errors.push(`${path}.${name}:unsupported`);
    }
    for (const [name, child] of Object.entries(value)) if (properties[name]) validateAgainstSchema(child, properties[name], `${path}.${name}`, errors);
    return;
  }
  if (type === "array") {
    if (!Array.isArray(value)) { errors.push(`${path}:expected_array`); return; }
    if (value.length < Number(schema.minItems ?? 0)) errors.push(`${path}:too_few_items`);
    if (value.length > Number(schema.maxItems ?? Infinity)) errors.push(`${path}:too_many_items`);
    value.forEach((item, index) => validateAgainstSchema(item, schema.items as JsonObject, `${path}[${index}]`, errors));
    return;
  }
  if (type === "string") {
    if (typeof value !== "string") { errors.push(`${path}:expected_string`); return; }
    if (value.length < Number(schema.minLength ?? 0)) errors.push(`${path}:too_short`);
    if (value.length > Number(schema.maxLength ?? Infinity)) errors.push(`${path}:too_long`);
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) errors.push(`${path}:invalid_choice`);
    return;
  }
  if (type === "integer") {
    if (!Number.isInteger(value)) { errors.push(`${path}:expected_integer`); return; }
    if (Number(value) < Number(schema.minimum ?? -Infinity)) errors.push(`${path}:too_small`);
    if (Number(value) > Number(schema.maximum ?? Infinity)) errors.push(`${path}:too_large`);
  }
}
