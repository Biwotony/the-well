import type {
  PublicChallenge,
  PublicContentRepository,
  PublicJourney,
  PublicJourneyStep,
  PublicStoryEpisode,
  PublicStorySeries,
} from "./public-content";

const publishedAt = "2026-10-20T12:00:00.000Z";

export const demoSeries: PublicStorySeries[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "learning-to-stay",
    title: "Learning to Stay",
    summary: "Maya and Jordan learned that repair began when they stopped defending their intentions and became curious about each other’s experience.",
    featuredQuote: "We stopped trying to win and started trying to understand.",
    coverUrl: "/assets/the-well/hero-learning-to-stay.webp",
    sensitiveTopics: ["conflict", "marriage"],
    publishedAt,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "grace-in-the-quiet",
    title: "Grace in the Quiet",
    summary: "A season of silence became an invitation to listen more carefully, speak more honestly, and receive one another with patience.",
    featuredQuote: "The quiet became less frightening when we learned to stay present inside it.",
    coverUrl: "/assets/the-well/story-grace-in-the-quiet.webp",
    sensitiveTopics: ["communication", "repair"],
    publishedAt,
  },
];

export const demoEpisodes: PublicStoryEpisode[] = [
  {
    id: "31111111-1111-4111-8111-111111111111",
    seriesId: demoSeries[0].id,
    episodeNumber: 1,
    title: "The argument beneath the argument",
    excerpt: "For years, Maya and Jordan thought conflict was proof they had chosen wrong. Then they learned to listen for the fear underneath the facts.",
    body: "It started, as these things often do, with a small question carrying too much weight.\n\n“Did you call them back?” Maya asked from the kitchen. Jordan heard disappointment. Maya heard avoidance. Neither heard what the other was trying to protect.\n\n“We kept defending our intentions while the other person was describing the impact.”\n\nThe shift was not dramatic. They began with one practice: before answering, name what you think the other person is feeling, and ask if you are right.",
    readingMinutes: 8,
    publishedAt,
  },
  {
    id: "31111111-1111-4111-8111-222222222222",
    seriesId: demoSeries[0].id,
    episodeNumber: 2,
    title: "Making room for the answer",
    excerpt: "Their conversations changed when curiosity became more important than a quick defense.",
    body: "At first, listening felt like surrender. Maya and Jordan slowly discovered that understanding did not require agreement, and that a patient question could make room for both people to remain present.\n\nThey practiced returning to difficult conversations after rest, naming what they had heard, and asking what they had missed.\n\nRepair became less like a perfect apology and more like a faithful habit of returning.",
    readingMinutes: 6,
    publishedAt,
  },
  {
    id: "32222222-2222-4222-8222-111111111111",
    seriesId: demoSeries[1].id,
    episodeNumber: 1,
    title: "When quiet carried meaning",
    excerpt: "They discovered that silence could hold tenderness when neither person rushed to fill it.",
    body: "The room was quiet, but the quiet no longer meant abandonment. They began to notice the difference between withdrawing from one another and resting beside one another.\n\nThe practice was simple: stay near, ask gently, and let the answer arrive in its own time.",
    readingMinutes: 5,
    publishedAt,
  },
];

export const demoChallenges: PublicChallenge[] = [
  {
    id: "41111111-1111-4111-8111-111111111111",
    slug: "listen-before-answering",
    title: "Listen for what is underneath",
    prompt: "In one conversation today, ask a curious question before offering advice or correction.",
    scriptureReference: "James 1:19",
    estimatedMinutes: 6,
    levelRequired: 1,
    pointsReward: 20,
    publishedAt,
  },
  {
    id: "42222222-2222-4222-8222-222222222222",
    slug: "return-with-gentleness",
    title: "Return with gentleness",
    prompt: "Revisit one unfinished conversation and name what you understand more clearly now.",
    scriptureReference: "Proverbs 15:1",
    estimatedMinutes: 8,
    levelRequired: 1,
    pointsReward: 20,
    publishedAt,
  },
];

export const demoJourneys: PublicJourney[] = [
  {
    id: "51111111-1111-4111-8111-111111111111",
    slug: "a-more-generous-listening",
    title: "A More Generous Listening",
    summary: "Four gentle practices for slowing down, hearing what matters, and returning to difficult conversations with care.",
    durationDays: 14,
    publishedAt,
  },
];

export const demoJourneySteps: PublicJourneyStep[] = [
  { id: "61111111-1111-4111-8111-111111111111", journeyId: demoJourneys[0].id, stepNumber: 1, title: "Notice", description: "Slow down enough to see what is here.", challengeId: demoChallenges[0].id },
  { id: "62222222-2222-4222-8222-222222222222", journeyId: demoJourneys[0].id, stepNumber: 2, title: "Listen", description: "Make room before preparing an answer.", challengeId: demoChallenges[0].id },
  { id: "63333333-3333-4333-8333-333333333333", journeyId: demoJourneys[0].id, stepNumber: 3, title: "Name", description: "Speak needs without accusation.", challengeId: demoChallenges[1].id },
  { id: "64444444-4444-4444-8444-444444444444", journeyId: demoJourneys[0].id, stepNumber: 4, title: "Repair", description: "Return with honesty and gentleness.", challengeId: demoChallenges[1].id },
];

export const demoPublicContentRepository: PublicContentRepository = {
  async loadCatalog() {
    return { series: demoSeries, challenges: demoChallenges, journeys: demoJourneys };
  },
  async loadEpisodes(seriesId) {
    return demoEpisodes.filter((episode) => episode.seriesId === seriesId);
  },
  async loadJourneySteps(journeyId) {
    return demoJourneySteps.filter((step) => step.journeyId === journeyId);
  },
};
