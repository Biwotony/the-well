import { getSupabaseClient } from "./supabase";

export type ContentStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type EditorialEntity = "story_series" | "story_episodes" | "journeys" | "challenges";

export type EditorialQueueItem = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "in_review";
  origin: "human" | "agent";
  updatedAt: string;
};

export type EditorialSeries = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  featuredQuote: string | null;
  coverUrl: string | null;
  sensitiveTopics: string[];
  status: ContentStatus;
  origin: "human" | "agent";
  updatedAt: string;
};

export type EditorialEpisode = {
  id: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  excerpt: string;
  body: string;
  readingMinutes: number;
  status: ContentStatus;
  origin: "human" | "agent";
  updatedAt: string;
};

export type EditorialJourney = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  durationDays: number;
  status: ContentStatus;
  origin: "human" | "agent";
  updatedAt: string;
};

export type EditorialJourneyStep = {
  id: string;
  journeyId: string;
  stepNumber: number;
  title: string;
  description: string;
  challengeId: string | null;
};

export type EditorialChallenge = {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  scriptureReference: string | null;
  estimatedMinutes: number;
  levelRequired: number;
  pointsReward: number;
  status: ContentStatus;
  origin: "human" | "agent";
  updatedAt: string;
};

export type EditorialAuditItem = {
  id: number;
  entityTable: EditorialEntity;
  entityId: string;
  action: string;
  oldStatus: ContentStatus | null;
  newStatus: ContentStatus | null;
  createdAt: string;
};

export type EditorialAgentRun = {
  id: string;
  agent: "story_intelligence" | "content_factory" | "growth_retention" | "chief_operator";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  model: string | null;
  actualCostUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  knowledgeCitations: Array<{ source_id: string; title: string; section?: string | null }>;
  errorMessage: string | null;
  createdAt: string;
};

export type EditorialWorkspace = {
  series: EditorialSeries[];
  episodes: EditorialEpisode[];
  journeys: EditorialJourney[];
  steps: EditorialJourneyStep[];
  challenges: EditorialChallenge[];
  audit: EditorialAuditItem[];
  agentRuns: EditorialAgentRun[];
  contentFactoryEnabled: boolean;
};

type SeriesInput = Pick<EditorialSeries, "slug" | "title" | "summary" | "featuredQuote" | "coverUrl" | "sensitiveTopics">;
type EpisodeInput = Pick<EditorialEpisode, "seriesId" | "episodeNumber" | "title" | "excerpt" | "body" | "readingMinutes">;
type JourneyInput = Pick<EditorialJourney, "slug" | "title" | "summary" | "durationDays">;
type JourneyStepInput = Pick<EditorialJourneyStep, "journeyId" | "stepNumber" | "title" | "description" | "challengeId">;
type ChallengeInput = Pick<EditorialChallenge, "slug" | "title" | "prompt" | "scriptureReference" | "estimatedMinutes" | "levelRequired" | "pointsReward">;

async function clientOrThrow() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Connect Supabase before managing editorial content.");
  return client;
}

function mutationError(message: string, error: { code?: string } | null) {
  if (error?.code === "23505") return new Error("That slug or sequence number is already in use.");
  return new Error(message);
}

export async function loadEditorialQueue(): Promise<EditorialQueueItem[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("story_series")
    .select("id,title,summary,status,origin,updated_at")
    .in("status", ["draft", "in_review"])
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw new Error("The editorial queue could not be loaded.");
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status as "draft" | "in_review",
    origin: row.origin,
    updatedAt: row.updated_at,
  }));
}

export async function loadEditorialWorkspace(): Promise<EditorialWorkspace> {
  const supabase = await clientOrThrow();
  const [series, episodes, journeys, steps, challenges, audit, agentRuns, contentFactoryBudget] = await Promise.all([
    supabase.from("story_series").select("id,slug,title,summary,featured_quote,cover_url,sensitive_topics,status,origin,updated_at").order("updated_at", { ascending: false }),
    supabase.from("story_episodes").select("id,series_id,episode_number,title,excerpt,body,reading_minutes,status,origin,updated_at").order("episode_number"),
    supabase.from("journeys").select("id,slug,title,summary,duration_days,status,origin,updated_at").order("updated_at", { ascending: false }),
    supabase.from("journey_steps").select("id,journey_id,step_number,title,description,challenge_id").order("step_number"),
    supabase.from("challenges").select("id,slug,title,prompt,scripture_reference,estimated_minutes,level_required,points_reward,status,origin,updated_at").order("updated_at", { ascending: false }),
    supabase.from("editorial_audit").select("id,entity_table,entity_id,action,old_status,new_status,created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("agent_runs").select("id,agent,status,model,actual_cost_usd,input_tokens,output_tokens,knowledge_citations,error_message,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("agent_budgets").select("enabled").eq("agent", "content_factory").maybeSingle(),
  ]);

  const failed = [series, episodes, journeys, steps, challenges, audit, agentRuns].find((result) => result.error);
  if (failed?.error) throw new Error("The editorial workspace could not be loaded. Confirm your editor role and try again.");

  return {
    series: (series.data ?? []).map((row) => ({ id: row.id, slug: row.slug, title: row.title, summary: row.summary, featuredQuote: row.featured_quote, coverUrl: row.cover_url, sensitiveTopics: row.sensitive_topics ?? [], status: row.status as ContentStatus, origin: row.origin, updatedAt: row.updated_at })),
    episodes: (episodes.data ?? []).map((row) => ({ id: row.id, seriesId: row.series_id, episodeNumber: row.episode_number, title: row.title, excerpt: row.excerpt, body: row.body, readingMinutes: row.reading_minutes, status: row.status as ContentStatus, origin: row.origin, updatedAt: row.updated_at })),
    journeys: (journeys.data ?? []).map((row) => ({ id: row.id, slug: row.slug, title: row.title, summary: row.summary, durationDays: row.duration_days, status: row.status as ContentStatus, origin: row.origin, updatedAt: row.updated_at })),
    steps: (steps.data ?? []).map((row) => ({ id: row.id, journeyId: row.journey_id, stepNumber: row.step_number, title: row.title, description: row.description, challengeId: row.challenge_id })),
    challenges: (challenges.data ?? []).map((row) => ({ id: row.id, slug: row.slug, title: row.title, prompt: row.prompt, scriptureReference: row.scripture_reference, estimatedMinutes: row.estimated_minutes, levelRequired: row.level_required, pointsReward: row.points_reward, status: row.status as ContentStatus, origin: row.origin, updatedAt: row.updated_at })),
    audit: (audit.data ?? []).map((row) => ({ id: row.id, entityTable: row.entity_table as EditorialEntity, entityId: row.entity_id, action: row.action, oldStatus: row.old_status as ContentStatus | null, newStatus: row.new_status as ContentStatus | null, createdAt: row.created_at })),
    agentRuns: (agentRuns.data ?? []).map((row) => ({ id: row.id, agent: row.agent, status: row.status, model: row.model, actualCostUsd: row.actual_cost_usd === null ? null : Number(row.actual_cost_usd), inputTokens: row.input_tokens, outputTokens: row.output_tokens, knowledgeCitations: Array.isArray(row.knowledge_citations) ? row.knowledge_citations : [], errorMessage: row.error_message, createdAt: row.created_at })),
    contentFactoryEnabled: Boolean(contentFactoryBudget.data?.enabled),
  };
}

export async function requestContentFactoryDraft(brief: string) {
  const supabase = await clientOrThrow();
  const trimmed = brief.trim();
  if (trimmed.length < 40 || trimmed.length > 4000) throw new Error("Use a focused editorial brief between 40 and 4,000 characters.");
  const idempotencyKey = crypto.randomUUID();
  const { data, error } = await supabase.functions.invoke("agent-runner", {
    headers: { "Idempotency-Key": idempotencyKey },
    body: {
      agent: "content_factory",
      idempotency_key: idempotencyKey,
      input: {
        brief: trimmed,
        audience: "Mature Christian women across different relationship and life seasons",
        constraints: "Create an original editorial draft, never a reader testimony. Treat abuse and coercion with explicit safety care. Publication remains human-only.",
        format: "One story series with one complete first episode and reflection questions",
        knowledge_query: trimmed,
      },
    },
  });
  if (error) throw new Error("The Content Factory request was rejected. Confirm that the owner enabled the approved model and budgets.");
  if (data?.error) throw new Error(`Content Factory did not run: ${String(data.error).replaceAll("_", " ")}.`);
  return data as { run_id: string; status: string; draft?: { series_id: string; episode_id: string } };
}

export async function saveSeries(input: SeriesInput, userId: string, id?: string) {
  const supabase = await clientOrThrow();
  const values = { slug: input.slug, title: input.title, summary: input.summary, featured_quote: input.featuredQuote || null, cover_url: input.coverUrl || null, sensitive_topics: input.sensitiveTopics };
  const result = id
    ? await supabase.from("story_series").update(values).eq("id", id).eq("status", "draft").select("id").maybeSingle()
    : await supabase.from("story_series").insert({ ...values, created_by: userId }).select("id").single();
  if (result.error || !result.data) throw mutationError("The story could not be saved. Only drafts can be edited.", result.error);
  return result.data.id as string;
}

export async function saveEpisode(input: EpisodeInput, userId: string, id?: string) {
  const supabase = await clientOrThrow();
  const values = { series_id: input.seriesId, episode_number: input.episodeNumber, title: input.title, excerpt: input.excerpt, body: input.body, reading_minutes: input.readingMinutes };
  const result = id
    ? await supabase.from("story_episodes").update(values).eq("id", id).eq("status", "draft").select("id").maybeSingle()
    : await supabase.from("story_episodes").insert({ ...values, created_by: userId }).select("id").single();
  if (result.error || !result.data) throw mutationError("The episode could not be saved. Only drafts can be edited.", result.error);
  return result.data.id as string;
}

export async function saveJourney(input: JourneyInput, userId: string, id?: string) {
  const supabase = await clientOrThrow();
  const values = { slug: input.slug, title: input.title, summary: input.summary, duration_days: input.durationDays };
  const result = id
    ? await supabase.from("journeys").update(values).eq("id", id).eq("status", "draft").select("id").maybeSingle()
    : await supabase.from("journeys").insert({ ...values, created_by: userId }).select("id").single();
  if (result.error || !result.data) throw mutationError("The journey could not be saved. Only drafts can be edited.", result.error);
  return result.data.id as string;
}

export async function saveJourneyStep(input: JourneyStepInput, id?: string) {
  const supabase = await clientOrThrow();
  const values = { journey_id: input.journeyId, step_number: input.stepNumber, title: input.title, description: input.description, challenge_id: input.challengeId || null };
  const result = id
    ? await supabase.from("journey_steps").update(values).eq("id", id).select("id").maybeSingle()
    : await supabase.from("journey_steps").insert(values).select("id").single();
  if (result.error || !result.data) throw mutationError("The journey step could not be saved. Steps lock when a journey enters review.", result.error);
  return result.data.id as string;
}

export async function saveChallenge(input: ChallengeInput, userId: string, id?: string) {
  const supabase = await clientOrThrow();
  const values = { slug: input.slug, title: input.title, prompt: input.prompt, scripture_reference: input.scriptureReference || null, estimated_minutes: input.estimatedMinutes, level_required: input.levelRequired, points_reward: input.pointsReward };
  const result = id
    ? await supabase.from("challenges").update(values).eq("id", id).eq("status", "draft").select("id").maybeSingle()
    : await supabase.from("challenges").insert({ ...values, created_by: userId }).select("id").single();
  if (result.error || !result.data) throw mutationError("The practice could not be saved. Only drafts can be edited.", result.error);
  return result.data.id as string;
}

export async function transitionEditorialItem(entity: EditorialEntity, itemId: string, from: ContentStatus, to: ContentStatus) {
  const supabase = await clientOrThrow();
  const { data, error } = await supabase.from(entity).update({ status: to }).eq("id", itemId).eq("status", from).select("id,status").maybeSingle();
  if (error) throw new Error("The lifecycle change was rejected by the human publication gate.");
  if (!data) throw new Error("This item changed elsewhere. Refresh the Studio before trying again.");
  return data;
}

export async function publishEditorialItem(itemId: string) {
  await transitionEditorialItem("story_series", itemId, "in_review", "approved");
  return transitionEditorialItem("story_series", itemId, "approved", "published");
}
