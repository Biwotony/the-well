import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export type PublicStorySeries = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  featuredQuote: string | null;
  coverUrl: string | null;
  sensitiveTopics: string[];
  publishedAt: string;
};

export type PublicStoryEpisode = {
  id: string;
  seriesId: string;
  episodeNumber: number;
  title: string;
  excerpt: string;
  body: string;
  readingMinutes: number;
  publishedAt: string;
};

export type PublicChallenge = {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  scriptureReference: string | null;
  estimatedMinutes: number;
  levelRequired: number;
  pointsReward: number;
  publishedAt: string;
};

export type PublicJourney = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  durationDays: number;
  publishedAt: string;
};

export type PublicJourneyStep = {
  id: string;
  journeyId: string;
  stepNumber: number;
  title: string;
  description: string;
  challengeId: string | null;
};

export type PublicContentCatalog = {
  series: PublicStorySeries[];
  challenges: PublicChallenge[];
  journeys: PublicJourney[];
};

export type PublicContentRepository = {
  loadCatalog(): Promise<PublicContentCatalog>;
  loadEpisodes(seriesId: string): Promise<PublicStoryEpisode[]>;
  loadJourneySteps(journeyId: string): Promise<PublicJourneyStep[]>;
};

type StorySeriesRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  featured_quote: string | null;
  cover_url: string | null;
  sensitive_topics: string[] | null;
  published_at: string;
};

type StoryEpisodeRow = {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  excerpt: string;
  body: string;
  reading_minutes: number;
  published_at: string;
};

type ChallengeRow = {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  scripture_reference: string | null;
  estimated_minutes: number;
  level_required: number;
  points_reward: number;
  published_at: string;
};

type JourneyRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  duration_days: number;
  published_at: string;
};

type JourneyStepRow = {
  id: string;
  journey_id: string;
  step_number: number;
  title: string;
  description: string;
  challenge_id: string | null;
};

const now = () => new Date().toISOString();

function requireData<T>(data: T[] | null, error: { message: string } | null): T[] {
  if (error) throw new Error(`Public content could not be loaded: ${error.message}`);
  return data ?? [];
}

export function createSupabasePublicContentRepository(client: SupabaseClient): PublicContentRepository {
  return {
    async loadCatalog() {
      const visibleAt = now();
      const [seriesResult, challengeResult, journeyResult] = await Promise.all([
        client
          .from("story_series")
          .select("id,slug,title,summary,featured_quote,cover_url,sensitive_topics,published_at")
          .eq("status", "published")
          .lte("published_at", visibleAt)
          .order("published_at", { ascending: false })
          .limit(24),
        client
          .from("challenges")
          .select("id,slug,title,prompt,scripture_reference,estimated_minutes,level_required,points_reward,published_at")
          .eq("status", "published")
          .lte("published_at", visibleAt)
          .order("published_at", { ascending: false })
          .limit(12),
        client
          .from("journeys")
          .select("id,slug,title,summary,duration_days,published_at")
          .eq("status", "published")
          .lte("published_at", visibleAt)
          .order("published_at", { ascending: false })
          .limit(12),
      ]);

      const series = requireData(seriesResult.data as StorySeriesRow[] | null, seriesResult.error).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        featuredQuote: row.featured_quote,
        coverUrl: row.cover_url,
        sensitiveTopics: row.sensitive_topics ?? [],
        publishedAt: row.published_at,
      }));
      const challenges = requireData(challengeResult.data as ChallengeRow[] | null, challengeResult.error).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        prompt: row.prompt,
        scriptureReference: row.scripture_reference,
        estimatedMinutes: row.estimated_minutes,
        levelRequired: row.level_required,
        pointsReward: row.points_reward,
        publishedAt: row.published_at,
      }));
      const journeys = requireData(journeyResult.data as JourneyRow[] | null, journeyResult.error).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        durationDays: row.duration_days,
        publishedAt: row.published_at,
      }));

      return { series, challenges, journeys };
    },

    async loadEpisodes(seriesId) {
      const result = await client
        .from("story_episodes")
        .select("id,series_id,episode_number,title,excerpt,body,reading_minutes,published_at")
        .eq("series_id", seriesId)
        .eq("status", "published")
        .lte("published_at", now())
        .order("episode_number", { ascending: true })
        .limit(50);

      return requireData(result.data as StoryEpisodeRow[] | null, result.error).map((row) => ({
        id: row.id,
        seriesId: row.series_id,
        episodeNumber: row.episode_number,
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        readingMinutes: row.reading_minutes,
        publishedAt: row.published_at,
      }));
    },

    async loadJourneySteps(journeyId) {
      const result = await client
        .from("journey_steps")
        .select("id,journey_id,step_number,title,description,challenge_id")
        .eq("journey_id", journeyId)
        .order("step_number", { ascending: true })
        .limit(60);

      return requireData(result.data as JourneyStepRow[] | null, result.error).map((row) => ({
        id: row.id,
        journeyId: row.journey_id,
        stepNumber: row.step_number,
        title: row.title,
        description: row.description,
        challengeId: row.challenge_id,
      }));
    },
  };
}

export async function getPublicContentRepository() {
  const client = await getSupabaseClient();
  return client ? createSupabasePublicContentRepository(client) : null;
}
