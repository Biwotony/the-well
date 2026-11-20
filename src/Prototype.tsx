import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/dm-serif-display/latin-400.css";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircledIcon,
  Cross2Icon,
  DashboardIcon,
  HamburgerMenuIcon,
  HomeIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  ReaderIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import {
  BottomSheet,
  Carousel,
  FlowStack,
  KeyboardInput,
  MobileScroll,
  useKeyboard,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import {
  isSupabaseConfigured,
  loadEditorialAuthState,
  requestMagicLink,
  signOut,
  subscribeToAuthChanges,
  type EditorialAuthState,
} from "./lib/supabase";
import {
  loadEditorialQueue,
  loadEditorialWorkspace,
  publishEditorialItem,
  requestContentFactoryDraft,
  saveChallenge,
  saveEpisode,
  saveJourney,
  saveJourneyStep,
  saveSeries,
  transitionEditorialItem,
  type ContentStatus,
  type EditorialChallenge,
  type EditorialEntity,
  type EditorialEpisode,
  type EditorialJourney,
  type EditorialJourneyStep,
  type EditorialQueueItem,
  type EditorialSeries,
  type EditorialWorkspace,
} from "./lib/editorial";
import {
  getPublicContentRepository,
  type PublicChallenge,
  type PublicContentCatalog,
  type PublicContentRepository,
  type PublicJourney,
  type PublicJourneyStep,
  type PublicStoryEpisode,
  type PublicStorySeries,
} from "./lib/public-content";
import { demoChallenges, demoEpisodes, demoJourneys, demoJourneySteps, demoPublicContentRepository, demoSeries } from "./lib/public-content-fixtures";

type RootScreen = "home" | "stories" | "journey" | "studio";
type WebsiteScreen = RootScreen | "story" | "practice" | "submission";
type PrototypeMode = "website" | "device";

type WebsiteRoute =
  | { screen: "home" }
  | { screen: "stories" }
  | { screen: "story"; seriesSlug: string; episodeNumber: number }
  | { screen: "journey"; journeySlug?: string }
  | { screen: "practice"; challengeSlug: string }
  | { screen: "studio" }
  | { screen: "submission" };

type PublicContentState = {
  catalog: PublicContentCatalog;
  loading: boolean;
  error: string | null;
};

const storyCards = [
  {
    eyebrow: "Repair after conflict",
    title: "Grace in the Quiet",
    detail: "3 parts · 18 min",
    image: "/assets/the-well/story-grace-in-the-quiet.webp",
  },
  {
    eyebrow: "Faith through change",
    title: "The Middle of Becoming",
    detail: "4 parts · 24 min",
    image: "/assets/the-well/hero-learning-to-stay.webp",
  },
  {
    eyebrow: "Honest intimacy",
    title: "What We Could Finally Say",
    detail: "2 parts · 12 min",
    image: "/assets/the-well/story-grace-in-the-quiet.webp",
  },
];

export default function Prototype({ mode = "device" }: { mode?: PrototypeMode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [editorialAuth, setEditorialAuth] = useState<EditorialAuthState>({ status: "loading" });
  const [editorialQueue, setEditorialQueue] = useState<EditorialQueueItem[]>([]);
  const [editorialQueueLoading, setEditorialQueueLoading] = useState(false);
  const [editorialQueueError, setEditorialQueueError] = useState("");
  const [pendingApproval, setPendingApproval] = useState<EditorialQueueItem | null>(null);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const practiceCompleteRef = useRef(false);
  const [approvalBusy, setApprovalBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    const refresh = async () => {
      const state = await loadEditorialAuthState();
      if (active) setEditorialAuth(state);
    };

    void refresh();
    void subscribeToAuthChanges(() => void refresh()).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (editorialAuth.status !== "authorized") {
      setEditorialQueue([]);
      setEditorialQueueLoading(false);
      return;
    }

    let active = true;
    setEditorialQueueLoading(true);
    setEditorialQueueError("");
    void loadEditorialQueue().then(
      (items) => {
        if (!active) return;
        setEditorialQueue(items);
        setEditorialQueueLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        setEditorialQueueError(error instanceof Error ? error.message : "The editorial queue could not be loaded.");
        setEditorialQueueLoading(false);
      },
    );
    return () => { active = false; };
  }, [editorialAuth]);

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setAuthBusy(true);
    setAuthMessage("");
    try {
      const result = await requestMagicLink(email.trim());
      setAuthMessage(result.message);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Magic Link could not be sent.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleApproval() {
    setApprovalBusy(true);
    try {
      if (editorialAuth.status !== "authorized") throw new Error("Sign in with an editor account to publish.");
      if (!pendingApproval) throw new Error("Choose an in-review item before publishing.");

      await publishEditorialItem(pendingApproval.id);

      setEditorialQueue((items) => items.filter((item) => item.id !== pendingApproval.id));
      setPendingApproval(null);
      setApprovalOpen(false);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Approval failed.");
      setApprovalOpen(false);
      setAuthOpen(true);
    } finally {
      setApprovalBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await signOut();
      setEditorialAuth({ status: "signed_out" });
      setAuthMessage("You are signed out.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Sign out could not be completed.");
    } finally {
      setAuthBusy(false);
    }
  }

  if (mode === "website") {
    return (
      <ResponsiveWebsite
        approvalBusy={approvalBusy}
        approvalOpen={approvalOpen}
        authBusy={authBusy}
        editorialAuth={editorialAuth}
        editorialQueue={editorialQueue}
        editorialQueueError={editorialQueueError}
        editorialQueueLoading={editorialQueueLoading}
        authMessage={authMessage}
        authOpen={authOpen}
        email={email}
        onApproval={handleApproval}
        onApprovalOpenChange={setApprovalOpen}
        onAuthOpenChange={setAuthOpen}
        onEmailChange={setEmail}
        onMagicLink={handleMagicLink}
        onReview={(item) => {
          setPendingApproval(item);
          setApprovalOpen(true);
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  function rootScreen(kind: RootScreen): FlowScreen {
    return {
      id: kind,
      footerHeight: 74,
      footer: (flow) => (
        <BottomNav
          current={kind}
          onNavigate={(next) => flow.replace(rootScreen(next))}
        />
      ),
      render: (flow) => {
        if (kind === "stories") return <StoriesScreen flow={flow} />;
        if (kind === "journey") {
          return (
            <JourneyScreen
              complete={practiceCompleteRef.current}
              onComplete={() => {
                practiceCompleteRef.current = true;
                setPracticeComplete(true);
              }}
            />
          );
        }
        if (kind === "studio") {
          return (
            <StudioScreen
              auth={editorialAuth}
              queue={editorialQueue}
              queueError={editorialQueueError}
              queueLoading={editorialQueueLoading}
              onReview={(item) => {
                setPendingApproval(item);
                setApprovalOpen(true);
              }}
              onSignIn={() => setAuthOpen(true)}
              onSignOut={handleSignOut}
            />
          );
        }

        return (
          <HomeScreen
            flow={flow}
            practiceComplete={practiceCompleteRef.current}
            onPractice={() => flow.push(practiceScreen())}
            onSignIn={() => setAuthOpen(true)}
          />
        );
      },
    };
  }

  function storyScreen(): FlowScreen {
    return {
      id: "learning-to-stay",
      headerHeight: 58,
      header: (flow) => <ScreenHeader title="Learning to Stay" onBack={flow.pop} />,
      render: () => <StoryReader />,
    };
  }

  function practiceScreen(): FlowScreen {
    return {
      id: "daily-practice",
      headerHeight: 58,
      header: (flow) => <ScreenHeader title="Week 2 · Listening" onBack={flow.pop} />,
      render: (flow) => (
        <PracticeScreen
          complete={practiceCompleteRef.current}
          onComplete={() => {
            practiceCompleteRef.current = true;
            setPracticeComplete(true);
          }}
          onDone={flow.pop}
        />
      ),
    };
  }

  function submissionScreen(): FlowScreen {
    return {
      id: "share-story",
      headerHeight: 58,
      header: (flow) => <ScreenHeader title="Share your story" onBack={flow.pop} />,
      render: (flow) => <SubmissionScreen onDone={flow.pop} />,
    };
  }

  function HomeScreen({
    flow,
    practiceComplete: isComplete,
    onPractice,
    onSignIn,
  }: {
    flow: FlowControls;
    practiceComplete: boolean;
    onPractice: () => void;
    onSignIn: () => void;
  }) {
    return (
      <MobileScroll className="app-screen well-screen">
        <main className="home-content screen-content" data-testid="home-screen">
          <header className="brand-header">
            <div>
              <p className="wordmark">OUR HONEST DAYS</p>
              <p className="brand-note">Stories for the becoming</p>
            </div>
            <button className="icon-button" onClick={onSignIn} aria-label="Sign in">
              <PersonIcon />
            </button>
          </header>

          <section className="quote-section" aria-labelledby="featured-quote">
            <p className="kicker">Featured story</p>
            <blockquote id="featured-quote">
              “We stopped trying to win and started trying to understand.”
            </blockquote>
          </section>

          <img
            className="hero-photo"
            src="/assets/the-well/hero-learning-to-stay.webp"
            srcSet="/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w"
            sizes="390px"
            alt="A couple sharing a warm, knowing look"
            draggable={false}
          />

          <section className="featured-copy">
            <h1>Learning to Stay</h1>
            <p className="story-meta">A 5-part story · Part 1</p>
            <button className="primary-button clay" onClick={() => flow.push(storyScreen())}>
              Read their story <ArrowRightIcon />
            </button>
          </section>

          <section className="path-section" aria-labelledby="path-title">
            <div className="section-heading-row">
              <div>
                <p className="kicker moss">Your path today</p>
                <h2 id="path-title">Week 2 · Listening</h2>
              </div>
              <span className="level-pill">Level 3</span>
            </div>
            <p className="practice-prompt">Ask: What have I missed lately?</p>
            <button className="secondary-button" onClick={onPractice}>
              {isComplete ? <CheckCircledIcon /> : <LightningBoltIcon />}
              {isComplete ? "Practice complete" : "Begin practice"}
            </button>
          </section>

          <section className="discover-section" aria-labelledby="discover-title">
            <div className="section-heading-row">
              <div>
                <p className="kicker mineral">You are not alone</p>
                <h2 id="discover-title">More honest stories</h2>
              </div>
              <button className="text-button" onClick={() => flow.replace(rootScreen("stories"))}>
                See all
              </button>
            </div>
            <Carousel ariaLabel="More stories" className="story-carousel" contentClassName="story-carousel-track">
              {storyCards.map((story) => (
                <button className="story-card" key={story.title} onClick={() => flow.push(storyScreen())}>
                  <img src={story.image} alt="" draggable={false} />
                  <span className="story-card-copy">
                    <span className="story-card-eyebrow">{story.eyebrow}</span>
                    <strong>{story.title}</strong>
                    <span>{story.detail}</span>
                  </span>
                </button>
              ))}
            </Carousel>
          </section>

          <button className="share-story-button" onClick={() => flow.push(submissionScreen())}>
            <ReaderIcon /> Share a story safely
          </button>
        </main>
      </MobileScroll>
    );
  }

  function StoriesScreen({ flow }: { flow: FlowControls }) {
    return (
      <MobileScroll className="app-screen well-screen">
        <main className="root-screen-content screen-content" data-testid="stories-screen">
          <PageIntro
            kicker="Discover"
            title="Stories that make room for truth."
            body="Every published story is human-reviewed for consent, care, and safety."
          />
          <div className="search-field" role="search">
            <MagnifyingGlassIcon aria-hidden="true" />
            <span>Search stories and topics</span>
          </div>
          <div className="topic-row" aria-label="Story topics">
            <button className="topic-chip active">All stories</button>
            <button className="topic-chip">Marriage</button>
            <button className="topic-chip">Singleness</button>
            <button className="topic-chip">Repair</button>
          </div>
          <div className="story-list">
            {storyCards.map((story, index) => (
              <button className="story-list-item" key={story.title} onClick={() => flow.push(storyScreen())}>
                <img src={story.image} alt="" draggable={false} />
                <span>
                  <small>{story.eyebrow}</small>
                  <strong>{index === 0 ? "Grace in the Quiet" : story.title}</strong>
                  <em>{story.detail}</em>
                </span>
                <ArrowRightIcon />
              </button>
            ))}
          </div>
          <button className="share-story-button" onClick={() => flow.push(submissionScreen())}>
            <ReaderIcon /> Submit your story for review
          </button>
        </main>
      </MobileScroll>
    );
  }

  function JourneyScreen({ complete, onComplete }: { complete: boolean; onComplete: () => void }) {
    return (
      <MobileScroll className="app-screen well-screen">
        <main className="root-screen-content screen-content" data-testid="journey-screen">
          <PageIntro
            kicker="Your journey"
            title="A More Present Love"
            body="Four gentle weeks of listening, naming needs, repair, and shared spiritual rhythm."
          />
          <div className="journey-overview">
            <div className="journey-level-row">
              <span>Level 3 · Deepening</span>
              <strong>620 points</strong>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Journey 43 percent complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={43}>
              <span style={{ width: "43%" }} />
            </div>
            <p>6 of 14 practices complete</p>
          </div>
          <ol className="journey-steps">
            <JourneyStep number="01" title="Notice" description="Slow down enough to see what is here." state="done" />
            <JourneyStep number="02" title="Listen" description="Make room before preparing an answer." state="current" />
            <JourneyStep number="03" title="Name" description="Speak needs without accusation." state="upcoming" />
            <JourneyStep number="04" title="Repair" description="Return with honesty and gentleness." state="upcoming" />
          </ol>
          <section className="today-practice-card">
            <p className="kicker moss">Today · 6 minutes</p>
            <h2>Listen for what is underneath</h2>
            <p>Ask one curious question before offering advice.</p>
            <button className="secondary-button" onClick={onComplete}>
              {complete ? <CheckCircledIcon /> : <LightningBoltIcon />}
              {complete ? "Completed · +20 points" : "Mark today complete"}
            </button>
          </section>
        </main>
      </MobileScroll>
    );
  }

  function StudioScreen({
    auth,
    queue,
    queueError,
    queueLoading,
    onReview,
    onSignIn,
    onSignOut,
  }: {
    auth: EditorialAuthState;
    queue: EditorialQueueItem[];
    queueError: string;
    queueLoading: boolean;
    onReview: (item: EditorialQueueItem) => void;
    onSignIn: () => void;
    onSignOut: () => void;
  }) {
    if (auth.status !== "authorized") {
      const message = auth.status === "loading"
        ? "Checking your editorial session…"
        : auth.status === "unauthorized"
          ? `This account has the ${auth.role} role and cannot open the editorial studio.`
          : auth.status === "error"
            ? auth.message
            : auth.message ?? "Sign in with an approved editor or administrator account to continue.";

      return (
        <MobileScroll className="app-screen well-screen">
          <main className="root-screen-content screen-content" data-testid="studio-screen">
            <PageIntro kicker="Editorial studio" title="Editorial access is protected." body={message} />
            <div className="studio-banner"><LockClosedIcon /><p><strong>Human approval is required</strong><span>Every public release is tied to an authorized editor session.</span></p></div>
            {auth.status === "loading" ? <p role="status">Checking access…</p> : null}
            {auth.status === "unauthorized" ? <button className="secondary-button studio-login" onClick={onSignOut}>Sign out</button> : null}
            {auth.status === "signed_out" || auth.status === "error" ? <button className="primary-button clay studio-login" onClick={onSignIn}><PersonIcon /> Sign in as an editor</button> : null}
          </main>
        </MobileScroll>
      );
    }

    return (
      <MobileScroll className="app-screen well-screen">
        <main className="root-screen-content screen-content" data-testid="studio-screen">
          <PageIntro
            kicker="Editorial studio"
            title="Nothing publishes itself."
            body="AI can research, recommend, and draft. A human editor must approve every public change."
          />
          <div className="studio-banner">
            <LockClosedIcon />
            <p><strong>Approval gate active</strong><span>Draft → review → human approval → publish</span></p>
          </div>
          <section className="studio-section">
            <div className="section-heading-row">
              <div><p className="kicker clay-text">Review queue</p><h2>Ready for a human</h2></div>
              <span className="count-pill">{queue.length}</span>
            </div>
            {queueLoading ? <p role="status">Loading the editorial queue…</p> : null}
            {queueError ? <p className="form-message" role="alert">{queueError}</p> : null}
            {!queueLoading && !queueError && queue.length === 0 ? <p className="web-session-note">There are no drafts or in-review stories in the production queue.</p> : null}
            {queue.map((item) => <EditorialQueueCard item={item} key={item.id} onReview={onReview} />)}
          </section>
          <section className="studio-section agent-section">
            <p className="kicker mineral">Four-agent desk</p>
            <h2>Affordable by default</h2>
            <AgentRow name="Story Intelligence" state="Disabled" detail="Themes, risk flags, story insights" />
            <AgentRow name="Content Factory" state="Disabled" detail="Episodes, prompts, challenges" />
            <AgentRow name="Growth & Retention" state="Disabled" detail="Experiments, never direct messages" />
            <AgentRow name="Chief Operator" state="Disabled" detail="Health, costs, recommendations" />
          </section>
          <button className="secondary-button studio-login" onClick={onSignOut}>Sign out</button>
        </main>
      </MobileScroll>
    );
  }

  return (
    <>
      <FlowStack initial={rootScreen("home")} />

      <BottomSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to Our Honest Days"
        description="We’ll email you one secure sign-in link. No password needed."
        snap={0.62}
      >
        <form className="sheet-form" onSubmit={handleMagicLink}>
          <label htmlFor="magic-email">Email address</label>
          <KeyboardInput
            id="magic-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <button className="primary-button clay" type="submit" disabled={authBusy || !email.trim()}>
            {authBusy ? "Sending…" : "Email my Magic Link"}
          </button>
          {authMessage ? <p className="form-message" role="status">{authMessage}</p> : null}
          <p className="privacy-note"><LockClosedIcon /> Your email is used only for account access and essential service messages.</p>
          {!isSupabaseConfigured() ? <p className="demo-note">Authentication is unavailable in this environment.</p> : null}
        </form>
      </BottomSheet>

      <BottomSheet
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Approve public release?"
        description="This is the final human checkpoint. The action is written to the immutable editorial audit log."
        snap={0.68}
      >
        <div className="approval-sheet">
          <div className="approval-summary">
            <p className="kicker clay-text">{pendingApproval?.title ?? "Editorial review"}</p>
            <h3>All required checks are complete</h3>
            <ul>
              <li><CheckCircledIcon /> Contributor consent recorded</li>
              <li><CheckCircledIcon /> Safety and privacy review passed</li>
              <li><CheckCircledIcon /> Theology and citations reviewed</li>
              <li><CheckCircledIcon /> Editor preview approved</li>
            </ul>
          </div>
          <button className="primary-button clay" onClick={handleApproval} disabled={approvalBusy}>
            {approvalBusy ? "Recording approval…" : "Approve and publish"}
          </button>
          <button className="secondary-button" onClick={() => setApprovalOpen(false)}>Return to review</button>
        </div>
      </BottomSheet>
    </>
  );
}

type ResponsiveWebsiteProps = {
  approvalBusy: boolean;
  approvalOpen: boolean;
  authBusy: boolean;
  editorialAuth: EditorialAuthState;
  editorialQueue: EditorialQueueItem[];
  editorialQueueError: string;
  editorialQueueLoading: boolean;
  authMessage: string;
  authOpen: boolean;
  email: string;
  onApproval: () => void;
  onApprovalOpenChange: (open: boolean) => void;
  onAuthOpenChange: (open: boolean) => void;
  onEmailChange: (email: string) => void;
  onMagicLink: (event: FormEvent) => void;
  onReview: (item: EditorialQueueItem) => void;
  onSignOut: () => void;
};

const rooms = [
  {
    name: "The Marriage Room",
    description: "Communication, intimacy, conflict, companionship, and the seasons that change us.",
    accent: "clay",
    number: "01",
  },
  {
    name: "The Becoming Room",
    description: "Identity, confidence, purpose, aging, and the brave work of beginning again.",
    accent: "marigold",
    number: "02",
  },
  {
    name: "The Connection Room",
    description: "Singlehood, friendship, family, divorce, widowhood, and the places we belong.",
    accent: "mineral",
    number: "03",
  },
  {
    name: "The Faith Room",
    description: "Scripture, prayer, reflection, and faith sturdy enough for honest questions.",
    accent: "moss",
    number: "04",
  },
];

const emptyCatalog: PublicContentCatalog = { series: [], challenges: [], journeys: [] };

function publicCoverSources(url: string) {
  if (url === "/assets/the-well/hero-learning-to-stay.webp") return "/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w";
  if (url === "/assets/the-well/story-grace-in-the-quiet.webp") return "/assets/the-well/story-grace-in-the-quiet-640.webp 640w, /assets/the-well/story-grace-in-the-quiet.webp 960w";
  if (url.startsWith("/assets/the-well/stories/") && url.endsWith(".jpg")) {
    return `${url.slice(0, -4)}-640.jpg 640w, ${url} 1440w`;
  }
  return undefined;
}

function isLocalDemoRequested() {
  const localHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return localHost && new URLSearchParams(window.location.search).get("content") === "demo";
}

function readWebsiteRoute(): WebsiteRoute {
  const parts = window.location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "stories" && parts[1] && parts[2] === "episodes" && Number(parts[3])) {
    return { screen: "story", seriesSlug: parts[1], episodeNumber: Number(parts[3]) };
  }
  if (parts[0] === "stories") return { screen: "stories" };
  if (parts[0] === "journeys") return { screen: "journey", journeySlug: parts[1] };
  if (parts[0] === "challenges" && parts[1]) return { screen: "practice", challengeSlug: parts[1] };
  if (parts[0] === "studio") return { screen: "studio" };
  if (parts[0] === "share") return { screen: "submission" };
  return { screen: "home" };
}

function websiteRoutePath(route: WebsiteRoute) {
  if (route.screen === "stories") return "/stories";
  if (route.screen === "story") return `/stories/${encodeURIComponent(route.seriesSlug)}/episodes/${route.episodeNumber}`;
  if (route.screen === "journey") return route.journeySlug ? `/journeys/${encodeURIComponent(route.journeySlug)}` : "/journeys";
  if (route.screen === "practice") return `/challenges/${encodeURIComponent(route.challengeSlug)}`;
  if (route.screen === "studio") return "/studio";
  if (route.screen === "submission") return "/share";
  return "/";
}

function routeScreen(route: WebsiteRoute): WebsiteScreen {
  return route.screen;
}

function ResponsiveWebsite({
  approvalBusy,
  approvalOpen,
  authBusy,
  editorialAuth,
  editorialQueue,
  editorialQueueError,
  editorialQueueLoading,
  authMessage,
  authOpen,
  email,
  onApproval,
  onApprovalOpenChange,
  onAuthOpenChange,
  onEmailChange,
  onMagicLink,
  onReview,
  onSignOut,
}: ResponsiveWebsiteProps) {
  const demoMode = isLocalDemoRequested();
  const [route, setRoute] = useState<WebsiteRoute>(() => readWebsiteRoute());
  const [menuOpen, setMenuOpen] = useState(false);
  const [repository, setRepository] = useState<PublicContentRepository | null | undefined>(demoMode ? demoPublicContentRepository : undefined);
  const [content, setContent] = useState<PublicContentState>(() => demoMode
    ? { catalog: { series: demoSeries, challenges: demoChallenges, journeys: demoJourneys }, loading: false, error: null }
    : { catalog: emptyCatalog, loading: true, error: null });
  const [episodesBySeries, setEpisodesBySeries] = useState<Record<string, PublicStoryEpisode[]>>(() => demoMode
    ? Object.fromEntries(demoSeries.map((series) => [series.id, demoEpisodes.filter((episode) => episode.seriesId === series.id)]))
    : {});
  const [stepsByJourney, setStepsByJourney] = useState<Record<string, PublicJourneyStep[]>>(() => demoMode
    ? Object.fromEntries(demoJourneys.map((journey) => [journey.id, demoJourneySteps.filter((step) => step.journeyId === journey.id)]))
    : {});
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(() => new Set());
  const completeChallenge = (id: string) => setCompletedChallenges((current) => new Set(current).add(id));

  useEffect(() => {
    const onPopState = () => setRoute(readWebsiteRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    void getPublicContentRepository().then(setRepository);
  }, [demoMode]);

  useEffect(() => {
    if (repository === undefined || demoMode) return;
    if (repository === null) {
      setContent({ catalog: emptyCatalog, loading: false, error: null });
      return;
    }
    let active = true;
    setContent((current) => ({ ...current, loading: true, error: null }));
    void repository.loadCatalog().then(
      (catalog) => active && setContent({ catalog, loading: false, error: null }),
      (error: unknown) => active && setContent({ catalog: emptyCatalog, loading: false, error: error instanceof Error ? error.message : "Public content could not be loaded." }),
    );
    return () => { active = false; };
  }, [demoMode, repository]);

  const selectedSeries = route.screen === "story"
    ? content.catalog.series.find((series) => series.slug === route.seriesSlug)
    : undefined;
  const selectedJourney = route.screen === "journey" && route.journeySlug
    ? content.catalog.journeys.find((journey) => journey.slug === route.journeySlug)
    : undefined;

  useEffect(() => {
    if (!repository || !selectedSeries || episodesBySeries[selectedSeries.id]) return;
    void repository.loadEpisodes(selectedSeries.id).then((episodes) => {
      setEpisodesBySeries((current) => ({ ...current, [selectedSeries.id]: episodes }));
    }).catch(() => setEpisodesBySeries((current) => ({ ...current, [selectedSeries.id]: [] })));
  }, [episodesBySeries, repository, selectedSeries]);

  useEffect(() => {
    if (!repository || !selectedJourney || stepsByJourney[selectedJourney.id]) return;
    void repository.loadJourneySteps(selectedJourney.id).then((steps) => {
      setStepsByJourney((current) => ({ ...current, [selectedJourney.id]: steps }));
    }).catch(() => setStepsByJourney((current) => ({ ...current, [selectedJourney.id]: [] })));
  }, [repository, selectedJourney, stepsByJourney]);

  const navigate = (next: WebsiteRoute) => {
    const query = demoMode ? "?content=demo" : "";
    window.history.pushState({}, "", `${websiteRoutePath(next)}${query}`);
    setRoute(next);
    setMenuOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };

  const screen = routeScreen(route);
  const featuredChallenge = content.catalog.challenges[0];
  const featuredJourney = content.catalog.journeys[0];
  const selectedChallenge = route.screen === "practice"
    ? content.catalog.challenges.find((item) => item.slug === route.challengeSlug)
    : undefined;
  const selectedEpisode = route.screen === "story" && selectedSeries
    ? episodesBySeries[selectedSeries.id]?.find((episode) => episode.episodeNumber === route.episodeNumber)
    : undefined;

  useEffect(() => {
    if (demoMode) return;
    const names: Record<WebsiteScreen, string> = {
      home: "Our Honest Days — Real stories rooted in faith",
      stories: "Stories — Our Honest Days",
      story: selectedEpisode ? `${selectedEpisode.title} — Our Honest Days` : "Story — Our Honest Days",
      journey: selectedJourney ? `${selectedJourney.title} — Our Honest Days` : "Guided journeys — Our Honest Days",
      practice: selectedChallenge ? `${selectedChallenge.title} — Our Honest Days` : "Practice — Our Honest Days",
      studio: "Editorial Studio — Our Honest Days",
      submission: "Story submissions — Our Honest Days",
    };
    const canonical = `https://ourhonestdays.com${websiteRoutePath(route)}`;
    document.title = names[screen];
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonical);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute("content", names[screen]);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute("content", canonical);
  }, [demoMode, route, screen, selectedChallenge, selectedEpisode, selectedJourney]);

  return (
    <div className="web-app">
      <a className="web-skip-link" href="#main-content">Skip to content</a>
      {demoMode ? <div className="web-demo-banner" role="status">Local demonstration content · Nothing on this page is published production data.</div> : null}
      <SiteHeader
        active={screen}
        auth={editorialAuth}
        menuOpen={menuOpen}
        onMenuChange={setMenuOpen}
        onNavigate={navigate}
        onSignIn={() => onAuthOpenChange(true)}
        onSignOut={onSignOut}
      />

      <div id="main-content">
        {screen === "home" ? (
          <WebsiteHome
            catalog={content.catalog}
            error={content.error}
            loading={content.loading}
            onNavigate={navigate}
            onSignIn={() => onAuthOpenChange(true)}
            practiceComplete={Boolean(featuredChallenge && completedChallenges.has(featuredChallenge.id))}
          />
        ) : null}
        {screen === "stories" ? <WebsiteStories catalog={content.catalog} error={content.error} loading={content.loading} onNavigate={navigate} /> : null}
        {screen === "journey" ? (
          <WebsiteJourney
            challenges={content.catalog.challenges}
            completedChallenges={completedChallenges}
            journey={selectedJourney}
            journeys={content.catalog.journeys}
            loading={content.loading}
            onComplete={(id) => completeChallenge(id)}
            onNavigate={navigate}
            steps={selectedJourney ? stepsByJourney[selectedJourney.id] : undefined}
          />
        ) : null}
        {screen === "studio" ? (
          <WebsiteStudio
            auth={editorialAuth}
            queue={editorialQueue}
            queueError={editorialQueueError}
            queueLoading={editorialQueueLoading}
            onReview={onReview}
            onSignIn={() => onAuthOpenChange(true)}
            onSignOut={onSignOut}
          />
        ) : null}
        {screen === "story" ? (
          <WebsiteStoryReader
            key={route.screen === "story" ? `${route.seriesSlug}-${route.episodeNumber}` : "reader"}
            currentEpisodeNumber={route.screen === "story" ? route.episodeNumber : 1}
            episodes={selectedSeries ? episodesBySeries[selectedSeries.id] : undefined}
            loading={content.loading}
            onNavigate={navigate}
            series={selectedSeries}
          />
        ) : null}
        {screen === "practice" ? (
          <WebsitePractice
            challenge={selectedChallenge}
            complete={Boolean(selectedChallenge && completedChallenges.has(selectedChallenge.id))}
            onComplete={() => { if (selectedChallenge) completeChallenge(selectedChallenge.id); }}
            onDone={() => navigate(featuredJourney ? { screen: "journey", journeySlug: featuredJourney.slug } : { screen: "home" })}
          />
        ) : null}
        {screen === "submission" ? (
          <WebsiteSubmission onDone={() => navigate({ screen: "home" })} />
        ) : null}
      </div>

      <SiteFooter onNavigate={navigate} />
      <WebsiteTabBar active={screen} onNavigate={navigate} />

      <WebsiteDialog
        description="We’ll email you one secure sign-in link. No password needed."
        onOpenChange={onAuthOpenChange}
        open={authOpen}
        title="Sign in to Our Honest Days"
      >
        <form className="web-dialog-form" onSubmit={onMagicLink}>
          <label htmlFor="web-magic-email">Email address</label>
          <input
            id="web-magic-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
          />
          <button className="primary-button clay" type="submit" disabled={authBusy || !email.trim()}>
            {authBusy ? "Sending…" : "Email my Magic Link"}
          </button>
          {authMessage ? <p className="form-message" role="status">{authMessage}</p> : null}
          <p className="privacy-note"><LockClosedIcon /> Your email is used only for account access and essential service messages.</p>
          {!isSupabaseConfigured() ? <p className="demo-note">Authentication is unavailable in this environment.</p> : null}
        </form>
      </WebsiteDialog>

      <WebsiteDialog
        description="This is the final human checkpoint. The action is written to the immutable editorial audit log."
        onOpenChange={onApprovalOpenChange}
        open={approvalOpen}
        title="Approve public release?"
      >
        <div className="approval-sheet">
          <div className="approval-summary">
            <p className="kicker clay-text">Editorial review</p>
            <h3>All required checks are complete</h3>
            <ul>
              <li><CheckCircledIcon /> Contributor consent recorded</li>
              <li><CheckCircledIcon /> Safety and privacy review passed</li>
              <li><CheckCircledIcon /> Theology and citations reviewed</li>
              <li><CheckCircledIcon /> Editor preview approved</li>
            </ul>
          </div>
          <button className="primary-button clay" onClick={onApproval} disabled={approvalBusy}>
            {approvalBusy ? "Recording approval…" : "Approve and publish"}
          </button>
          <button className="secondary-button" onClick={() => onApprovalOpenChange(false)}>Return to review</button>
        </div>
      </WebsiteDialog>
    </div>
  );
}

function SiteHeader({
  active,
  auth,
  menuOpen,
  onMenuChange,
  onNavigate,
  onSignIn,
  onSignOut,
}: {
  active: WebsiteScreen;
  auth: EditorialAuthState;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  onNavigate: (route: WebsiteRoute) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const navigation = [
    { id: "home" as const, label: "Discover", route: { screen: "home" } as WebsiteRoute },
    { id: "stories" as const, label: "Stories", route: { screen: "stories" } as WebsiteRoute },
    { id: "journey" as const, label: "Journeys", route: { screen: "journey" } as WebsiteRoute },
    { id: "studio" as const, label: "Studio", route: { screen: "studio" } as WebsiteRoute },
  ];
  const signedIn = auth.status === "authorized" || auth.status === "unauthorized";
  const checkingAccess = auth.status === "loading";
  const authLabel = checkingAccess ? "Checking access…" : signedIn ? "Sign out" : "Sign in";
  const handleAuthAction = signedIn ? onSignOut : onSignIn;

  return (
    <header className="web-header">
      <div className="web-container web-header-inner">
        <button className="web-brand" onClick={() => onNavigate({ screen: "home" })}>
          <span>OUR HONEST DAYS</span>
          <small>Stories for the becoming</small>
        </button>
        <nav className="web-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : undefined}
              onClick={() => onNavigate(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="web-header-actions">
          <button className="web-sign-in" disabled={checkingAccess} onClick={handleAuthAction}><PersonIcon /> {authLabel}</button>
          <button
            className="web-menu-button"
            aria-controls="web-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => onMenuChange(!menuOpen)}
          >
            {menuOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
          </button>
        </div>
      </div>
      <nav id="web-mobile-menu" className="web-mobile-menu" data-open={menuOpen ? "true" : "false"} aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button key={item.id} onClick={() => onNavigate(item.route)}>{item.label}</button>
        ))}
        <button disabled={checkingAccess} onClick={handleAuthAction}>{authLabel}</button>
      </nav>
    </header>
  );
}

function WebsiteHome({ catalog, error, loading, onNavigate, onSignIn, practiceComplete }: {
  catalog: PublicContentCatalog;
  error: string | null;
  loading: boolean;
  onNavigate: (route: WebsiteRoute) => void;
  onSignIn: () => void;
  practiceComplete: boolean;
}) {
  const featured = catalog.series[0];
  const challenge = catalog.challenges[0];
  const journey = catalog.journeys[0];

  return (
    <main className="web-home" data-testid="home-screen">
      <section className="web-hero web-section">
        <div className="web-container web-hero-grid">
          <div className="web-hero-copy">
            <p className="kicker">{featured ? "Featured published story" : "Stories for the becoming"}</p>
            <blockquote>{featured?.featuredQuote ? `“${featured.featuredQuote}”` : "Honest stories can make room for faith, tenderness, and the courage to keep growing."}</blockquote>
            <p className="web-hero-intro">Honest stories for relationships, identity, intimacy, faith, and the chapters no one prepared you for.</p>
            <div className="web-hero-actions">
              {featured ? <button className="primary-button clay" onClick={() => onNavigate({ screen: "story", seriesSlug: featured.slug, episodeNumber: 1 })}>Read this story <ArrowRightIcon /></button> : null}
              <button className="web-text-button" onClick={() => onNavigate({ screen: "stories" })}>Explore published stories</button>
            </div>
          </div>
          {featured ? (
            <article className="web-featured-story">
              <div className="web-featured-image-wrap">
                <img className="web-featured-image" src={featured.coverUrl ?? "/assets/the-well/hero-learning-to-stay.webp"} srcSet={publicCoverSources(featured.coverUrl ?? "/assets/the-well/hero-learning-to-stay.webp")} sizes="(max-width: 860px) 100vw, 52vw" alt="" width={1430} height={895} fetchPriority="high" />
                <span className="web-image-note">{featured.summary}</span>
              </div>
              <div className="web-featured-caption">
                <div><p className="kicker">Published story</p><h1>{featured.title}</h1></div>
                <p>Read at your own pace</p>
                <button className="primary-button clay web-featured-mobile-action" onClick={() => onNavigate({ screen: "story", seriesSlug: featured.slug, episodeNumber: 1 })}>Read this story <ArrowRightIcon /></button>
              </div>
            </article>
          ) : <PublicContentEmptyState compact error={error} loading={loading} onBrowse={() => onNavigate({ screen: "stories" })} />}
        </div>
      </section>

      <section className="web-section web-rooms-section" aria-labelledby="rooms-title">
        <div className="web-container">
          <div className="web-section-heading"><div><p className="kicker mineral">Find your room</p><h2 id="rooms-title">There is space here for your whole story.</h2></div><p>Begin with the conversation that feels closest to where you are now.</p></div>
          <div className="web-rooms-grid">{rooms.map((room) => <article className={`web-room-card ${room.accent}`} key={room.name}><span>{room.number}</span><h3>{room.name}</h3><p>{room.description}</p></article>)}</div>
        </div>
      </section>

      {challenge ? <section className="web-section web-path-section" aria-labelledby="path-title-web">
        <div className="web-container web-path-grid">
          <div className="web-path-copy"><p className="kicker moss">A practice for today</p><h2 id="path-title-web">{challenge.title}</h2><p>{challenge.prompt}</p><button className="primary-button mineral-button" onClick={() => onNavigate({ screen: "practice", challengeSlug: challenge.slug })}>{practiceComplete ? <CheckCircledIcon /> : <LightningBoltIcon />}{practiceComplete ? "Completed for this session" : "Begin this practice"}</button></div>
          <div className="web-path-card"><div className="web-path-topline"><span>{challenge.estimatedMinutes} minute practice</span><strong>Level {challenge.levelRequired}</strong></div><p className="web-path-question"><em>Reflect:</em> {challenge.scriptureReference ?? "Take a quiet moment before you begin."}</p><p className="web-session-note">Completion stays in this browser session and resets when you reload the page.</p>{journey ? <button className="web-text-button" onClick={() => onNavigate({ screen: "journey", journeySlug: journey.slug })}>View the related journey <ArrowRightIcon /></button> : null}</div>
        </div>
      </section> : null}

      <section className="web-section web-stories-section" aria-labelledby="stories-title-web">
        <div className="web-container">
          <div className="web-section-heading compact"><div><p className="kicker">You are not alone</p><h2 id="stories-title-web">More honest stories</h2></div><button className="web-text-button" onClick={() => onNavigate({ screen: "stories" })}>See all stories <ArrowRightIcon /></button></div>
          {catalog.series.length ? <div className="web-story-grid">{catalog.series.slice(0, 3).map((story) => <button className="web-story-card" key={story.id} onClick={() => onNavigate({ screen: "story", seriesSlug: story.slug, episodeNumber: 1 })}><img src={story.coverUrl ?? "/assets/the-well/story-grace-in-the-quiet.webp"} srcSet={publicCoverSources(story.coverUrl ?? "/assets/the-well/story-grace-in-the-quiet.webp")} sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 860px) 50vw, 33vw" alt="" width={960} height={720} loading="lazy" /><span className="web-story-card-copy"><small>Published story</small><strong>{story.title}</strong><em>{story.summary}</em></span></button>)}</div> : <PublicContentEmptyState compact error={error} loading={loading} onBrowse={() => onNavigate({ screen: "stories" })} />}
        </div>
      </section>

      <section className="web-section web-invitation-section"><div className="web-container web-invitation"><div><p className="kicker marigold">Your story is still yours</p><h2>Share what happened. Keep control of what happens next.</h2></div><div><p>Every submission is reviewed privately. Publication requires a separate, recorded consent and a human editor.</p><button className="secondary-button" onClick={() => onNavigate({ screen: "submission" })}><ReaderIcon /> Share a story safely</button></div><button className="web-invitation-signin" onClick={onSignIn}>Already a member? Sign in</button></div></section>
    </main>
  );
}

function PublicContentEmptyState({ compact = false, error, loading, onBrowse }: { compact?: boolean; error: string | null; loading: boolean; onBrowse?: () => void }) {
  return (
    <section className={`web-content-state ${compact ? "compact" : ""}`} aria-live="polite" data-testid="public-content-state">
      <p className="kicker mineral">{loading ? "Checking the library" : error ? "The library is unavailable" : "The library is being prepared"}</p>
      <h2>{loading ? "Published stories are on their way." : error ? "We could not open the public library right now." : "The first public stories are still in human review."}</h2>
      <p>{error ? "Please try again later. No draft or private material has been shown." : "Nothing appears here until consent, safety, editorial, and publication checks are complete."}</p>
      {onBrowse && !loading ? <button className="secondary-button" onClick={onBrowse}>Check the story library</button> : null}
    </section>
  );
}

function WebsiteStories({ catalog, error, loading, onNavigate }: { catalog: PublicContentCatalog; error: string | null; loading: boolean; onNavigate: (route: WebsiteRoute) => void }) {
  const [query, setQuery] = useState("");
  const visibleStories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return catalog.series;
    return catalog.series.filter((story) => `${story.title} ${story.summary}`.toLocaleLowerCase().includes(normalized));
  }, [catalog.series, query]);

  return (
    <main className="web-page web-container web-story-library" data-testid="stories-screen">
      <div className="web-page-intro"><p className="kicker">Story library</p><h1>Read honest stories of real lives where faith does not require easy endings.</h1><p>Every published story is human-reviewed for consent, care, and safety.</p></div>
      {catalog.series.length ? <label className="web-story-search" htmlFor="story-search"><MagnifyingGlassIcon /><span className="sr-only">Search published stories</span><input id="story-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles and summaries" /></label> : null}
      <p className="sr-only" role="status">{!loading && !error ? `${visibleStories.length} published ${visibleStories.length === 1 ? "story" : "stories"} found.` : ""}</p>
      {visibleStories.length ? <div className="web-library-grid">
        {visibleStories.map((story, index) => (
          <button className={`web-library-card ${index === 0 ? "featured" : ""}`} key={story.id} onClick={() => onNavigate({ screen: "story", seriesSlug: story.slug, episodeNumber: 1 })}>
            <img src={story.coverUrl ?? "/assets/the-well/story-grace-in-the-quiet.webp"} srcSet={publicCoverSources(story.coverUrl ?? "/assets/the-well/story-grace-in-the-quiet.webp")} sizes="(max-width: 860px) calc(100vw - 40px), 45vw" alt="" width={960} height={720} loading="lazy" />
            <span><small>Published story</small><strong>{story.title}</strong><em>{story.summary}</em><b>Read story <ArrowRightIcon /></b></span>
          </button>
        ))}
      </div> : catalog.series.length ? <section className="web-content-state compact"><p className="kicker mineral">No matching stories</p><h2>Try a broader word or clear the search.</h2><button className="secondary-button" onClick={() => setQuery("")}>Clear search</button></section> : <PublicContentEmptyState error={error} loading={loading} />}
      <button className="secondary-button web-page-action" onClick={() => onNavigate({ screen: "submission" })}><ReaderIcon /> Submit your story for review</button>
    </main>
  );
}

function WebsiteStoryReader({ currentEpisodeNumber, episodes, loading, onNavigate, series }: {
  currentEpisodeNumber: number;
  episodes: PublicStoryEpisode[] | undefined;
  loading: boolean;
  onNavigate: (route: WebsiteRoute) => void;
  series: PublicStorySeries | undefined;
}) {
  const [reflection, setReflection] = useState("");
  const episode = episodes?.find((item) => item.episodeNumber === currentEpisodeNumber);
  const currentIndex = episode ? episodes?.findIndex((item) => item.id === episode.id) ?? -1 : -1;
  const previous = currentIndex > 0 ? episodes?.[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 ? episodes?.[currentIndex + 1] : undefined;

  if (!series) {
    return <main className="web-page web-container"><PublicContentEmptyState error={null} loading={loading} onBrowse={() => onNavigate({ screen: "stories" })} /></main>;
  }
  if (!episodes) {
    return <main className="web-page web-container"><PublicContentEmptyState error={null} loading /></main>;
  }
  if (!episode) {
    return <main className="web-page web-container"><section className="web-content-state"><p className="kicker mineral">Episode unavailable</p><h1>This episode is not published.</h1><p>Only approved episodes can be opened from the public reader.</p><button className="secondary-button" onClick={() => onNavigate({ screen: "stories" })}>Return to stories</button></section></main>;
  }

  return (
    <main className="web-reader" data-testid="story-reader">
      <div className="web-container web-reader-topbar"><button className="web-back-button" onClick={() => onNavigate({ screen: "stories" })} aria-label="Back to Stories"><ArrowLeftIcon /> Back to Stories</button><span>{series.title} · Part {episode.episodeNumber}</span></div>
      <article>
        <header className="web-reader-header web-container">
          <div><p className="kicker clay-text">Part {episode.episodeNumber} of {episodes.length} · {episode.readingMinutes} min read</p><h1>{episode.title}</h1><p className="web-reader-deck">{episode.excerpt}</p></div>
          <img src={series.coverUrl ?? "/assets/the-well/hero-learning-to-stay.webp"} srcSet={publicCoverSources(series.coverUrl ?? "/assets/the-well/hero-learning-to-stay.webp")} sizes="(max-width: 860px) 100vw, 52vw" alt="" width={1430} height={895} fetchPriority="high" />
        </header>
        <div className="web-reader-body">
          <details className="web-series-index">
            <summary>{series.title} · {episodes.length} published parts</summary>
            <p>{series.summary}</p>
            <ol>
              {episodes.map((item) => <li key={item.id}><button aria-current={item.id === episode.id ? "page" : undefined} onClick={() => onNavigate({ screen: "story", seriesSlug: series.slug, episodeNumber: item.episodeNumber })}><span>Part {item.episodeNumber}</span>{item.title}</button></li>)}
            </ol>
          </details>
          {episode.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={`${episode.id}-${index}`}>{paragraph}</p>)}
          <div className="reader-reflection web-reader-checkin"><p className="kicker moss">A private pause</p><h2>What would help you receive this story with care?</h2><p>Your choice stays only in this browser session and is never sent to the database.</p><div className="web-reflection-options">{["I want to sit with this", "I want to talk with someone", "I am ready to keep reading"].map((option) => <button className={reflection === option ? "selected" : ""} key={option} onClick={() => setReflection(option)} aria-pressed={reflection === option}>{option}</button>)}</div>{reflection ? <p className="web-reflection-response" role="status">Your pause is noted for this session. Move at the pace that feels safe.</p> : null}</div>
          <nav className="web-episode-nav" aria-label="Story episodes">
            {previous ? <button className="secondary-button" onClick={() => onNavigate({ screen: "story", seriesSlug: series.slug, episodeNumber: previous.episodeNumber })}><ArrowLeftIcon /> Part {previous.episodeNumber}</button> : <span />}
            {next ? <button className="primary-button clay" onClick={() => onNavigate({ screen: "story", seriesSlug: series.slug, episodeNumber: next.episodeNumber })}>Continue to Part {next.episodeNumber} <ArrowRightIcon /></button> : <button className="primary-button clay" onClick={() => onNavigate({ screen: "stories" })}>Explore another story <ArrowRightIcon /></button>}
          </nav>
        </div>
      </article>
    </main>
  );
}

function WebsiteJourney({ challenges, completedChallenges, journey, journeys, loading, onComplete, onNavigate, steps }: {
  challenges: PublicChallenge[];
  completedChallenges: Set<string>;
  journey: PublicJourney | undefined;
  journeys: PublicJourney[];
  loading: boolean;
  onComplete: (id: string) => void;
  onNavigate: (route: WebsiteRoute) => void;
  steps: PublicJourneyStep[] | undefined;
}) {
  if (!journey) {
    return (
      <main className="web-page web-container" data-testid="journey-screen">
        <div className="web-page-intro"><p className="kicker moss">Guided journeys</p><h1>Practice steady growth through small, thoughtful steps.</h1><p>Every public journey is reviewed before it becomes available.</p></div>
        {journeys.length ? <div className="web-journey-library">{journeys.map((item) => <button key={item.id} onClick={() => onNavigate({ screen: "journey", journeySlug: item.slug })}><span><small>{item.durationDays} days</small><strong>{item.title}</strong><em>{item.summary}</em></span><ArrowRightIcon /></button>)}</div> : <PublicContentEmptyState error={null} loading={loading} />}
      </main>
    );
  }

  const firstChallenge = steps?.map((step) => challenges.find((item) => item.id === step.challengeId)).find(Boolean);

  const complete = Boolean(firstChallenge && completedChallenges.has(firstChallenge.id));

  return (
    <main className="web-page web-container" data-testid="journey-screen">
      <button className="web-back-button" onClick={() => onNavigate({ screen: "journey" })}><ArrowLeftIcon /> All journeys</button>
      <div className="web-page-intro"><p className="kicker moss">{journey.durationDays} day journey</p><h1>{journey.title}</h1><p>{journey.summary}</p></div>
      <div className="web-journey-grid">
        <section className="web-journey-overview">
          <div className="web-path-topline"><span>{steps?.length ?? 0} guided steps</span><strong>Progress stays private</strong></div>
          <p>Take these steps at your own pace. Completed practices stay private for this visit and reset when you reload the page.</p>
          {firstChallenge ? <button className="primary-button mineral-button" onClick={() => onNavigate({ screen: "practice", challengeSlug: firstChallenge.slug })}>Open the first practice <ArrowRightIcon /></button> : null}
        </section>
        {steps ? <ol className="web-journey-steps">{steps.map((step, index) => <JourneyStep key={step.id} number={String(step.stepNumber).padStart(2, "0")} title={step.title} description={step.description} state={step.challengeId && completedChallenges.has(step.challengeId) ? "done" : index === 0 ? "current" : "upcoming"} />)}</ol> : <p role="status">Loading the journey steps…</p>}
      </div>
      {firstChallenge ? <section className="web-today-card"><div><p className="kicker moss">Suggested practice · {firstChallenge.estimatedMinutes} minutes</p><h2>{firstChallenge.title}</h2><p>{firstChallenge.prompt}</p></div><button className="secondary-button" onClick={() => onComplete(firstChallenge.id)} aria-pressed={complete}>{complete ? <CheckCircledIcon /> : <LightningBoltIcon />}{complete ? "Completed for this session" : `Mark complete · +${firstChallenge.pointsReward} points`}</button></section> : null}
    </main>
  );
}

function WebsiteStudio({
  auth,
  queue,
  queueError,
  queueLoading,
  onReview,
  onSignIn,
  onSignOut,
}: {
  auth: EditorialAuthState;
  queue: EditorialQueueItem[];
  queueError: string;
  queueLoading: boolean;
  onReview: (item: EditorialQueueItem) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (auth.status !== "authorized") {
    const message = auth.status === "loading"
      ? "Checking your editorial session…"
      : auth.status === "unauthorized"
        ? `This signed-in account has the ${auth.role} role, which does not include editorial access.`
        : auth.status === "error"
          ? auth.message
          : auth.message ?? "Sign in with an approved editor or administrator account to continue.";

    return (
      <main className="web-page web-container" data-testid="studio-screen">
        <div className="web-page-intro"><p className="kicker mineral">Editorial studio</p><h1>Editorial access is protected.</h1><p>{message}</p></div>
        <section className="web-studio-access" aria-live="polite">
          <LockClosedIcon />
          <div><h2>Every public release requires an authorized human.</h2><p>The studio checks the current Supabase session and the database-backed role before it loads private drafts.</p></div>
          {auth.status === "loading" ? <p role="status">Checking access…</p> : null}
          {auth.status === "unauthorized" ? <button className="secondary-button" onClick={onSignOut}>Sign out</button> : null}
          {auth.status === "signed_out" || auth.status === "error" ? <button className="primary-button clay" onClick={onSignIn}><PersonIcon /> Sign in as an editor</button> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="web-page web-container" data-testid="studio-screen">
      <div className="web-page-intro"><p className="kicker mineral">Our Honest Days Studio</p><h1>Every public story passes through human hands.</h1><p>Create and revise original work here, then move it through review, approval, and publication without exposing drafts to readers.</p></div>
      <EditorialWorkspaceManager userId={auth.userId} />
      <section className="web-studio-panel web-studio-operations"><div><p className="kicker mineral">Automation status</p><h2>The agent runtime is active within a controlled daily budget.</h2><p className="web-session-note">Story Intelligence, Content Factory, Growth &amp; Retention, and Chief Operator share a $0.60 daily ceiling. Scheduled execution and automatic publication remain unavailable.</p></div><button className="secondary-button web-studio-login" onClick={onSignOut}>Sign out</button></section>
    </main>
  );
}

type StudioTab = "stories" | "journeys" | "practices" | "history";
type StudioForm =
  | { kind: "series"; item?: EditorialSeries }
  | { kind: "episode"; item?: EditorialEpisode; parentId?: string }
  | { kind: "journey"; item?: EditorialJourney }
  | { kind: "step"; item?: EditorialJourneyStep; parentId?: string }
  | { kind: "challenge"; item?: EditorialChallenge };

function EditorialWorkspaceManager({ userId }: { userId: string }) {
  const [workspace, setWorkspace] = useState<EditorialWorkspace | null>(null);
  const [tab, setTab] = useState<StudioTab>("stories");
  const [form, setForm] = useState<StudioForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [agentBrief, setAgentBrief] = useState("A difficult conversation in a long marriage: show how honesty, respect, faith, and safety can coexist without presenting the story as a real reader testimony.");
  const [agentBusy, setAgentBusy] = useState(false);

  const refresh = async () => {
    setError("");
    try {
      setWorkspace(await loadEditorialWorkspace());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The editorial workspace could not be loaded.");
    }
  };

  useEffect(() => { void refresh(); }, []);

  const transition = async (entity: EditorialEntity, id: string, from: ContentStatus, to: ContentStatus) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await transitionEditorialItem(entity, id, from, to);
      setMessage(to === "published" ? "Published after human approval." : `Moved to ${statusLabel(to).toLowerCase()}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The lifecycle change failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!workspace && !error) return <section className="web-studio-panel"><p role="status">Loading the protected editorial workspace…</p></section>;

  return (
    <section className="web-studio-workspace" aria-busy={busy}>
      <div className="web-studio-tabs" role="tablist" aria-label="Editorial content types">
        {(["stories", "journeys", "practices", "history"] as StudioTab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setForm(null); }}>{item === "practices" ? "Practices" : item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      {message ? <p className="studio-message" role="status">{message}</p> : null}
      {error ? <p className="form-message studio-error" role="alert">{error} <button type="button" className="web-text-button" onClick={() => void refresh()}>Try again</button></p> : null}

      {workspace && tab === "stories" ? <div className="web-studio-section">
        <section className="studio-agent-control" aria-busy={agentBusy}>
          <div><p className="kicker mineral">Human-supervised assistance</p><h2>Content Factory</h2><p>Generate one private story and episode draft from an editor brief. The result is labeled as generated content and cannot bypass review, approval, or publication controls.</p></div>
          <label>Editorial brief<textarea value={agentBrief} maxLength={4000} rows={5} onChange={(event) => setAgentBrief(event.target.value)} /></label>
          <div className="studio-agent-actions"><button className="primary-button clay" disabled={agentBusy || !workspace.contentFactoryEnabled || agentBrief.trim().length < 40} onClick={async () => { setAgentBusy(true); setError(""); setMessage(""); try { const result = await requestContentFactoryDraft(agentBrief); setMessage(`Private agent draft created. Run ${result.run_id.slice(0, 8)} is ready for human review.`); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Content Factory could not run."); } finally { setAgentBusy(false); } }}>{agentBusy ? "Creating private draft…" : "Create private draft"}</button><span>{workspace.contentFactoryEnabled ? "One manual run will use the approved model and budget." : "Disabled until the owner approves a model, pricing, and both budget gates."}</span></div>
          {workspace.agentRuns.length ? <details className="studio-agent-runs"><summary>Recent agent runs</summary><ol>{workspace.agentRuns.slice(0, 5).map((run) => <li key={run.id}><div><strong>{run.agent.replaceAll("_", " ")} · {run.status}</strong><small>{new Date(run.createdAt).toLocaleString()} · {run.model ?? "No model"}{run.actualCostUsd === null ? "" : ` · $${run.actualCostUsd.toFixed(4)}`}</small></div><span>{run.errorMessage ? run.errorMessage.replaceAll("_", " ") : `${run.inputTokens ?? 0} input / ${run.outputTokens ?? 0} output tokens`}</span>{run.knowledgeCitations.length ? <small>{run.knowledgeCitations.length} approved source citation{run.knowledgeCitations.length === 1 ? "" : "s"}</small> : null}</li>)}</ol></details> : null}
        </section>
        <StudioSectionHeading title="Stories and episodes" description="Draft privately, review carefully, and publish each series and episode through the database gate." action="New story" onAction={() => setForm({ kind: "series" })} />
        {workspace.series.length === 0 ? <StudioEmpty text="No stories have been created yet." /> : workspace.series.map((series) => <article className="studio-content-card" key={series.id}>
          <div className="studio-content-heading"><div><span className={`status ${series.status === "published" ? "published" : series.status === "in_review" ? "review" : "draft"}`}>{statusLabel(series.status)}</span><h3>{series.title}</h3><p>{series.summary}</p></div><LifecycleControls busy={busy} entity="story_series" id={series.id} status={series.status} onTransition={transition} /></div>
          <div className="studio-card-actions">{series.status === "draft" ? <button className="secondary-button" onClick={() => setForm({ kind: "series", item: series })}>Edit story</button> : null}<button className="secondary-button" onClick={() => setForm({ kind: "episode", parentId: series.id })}>Add episode</button>{series.status !== "published" ? <details className="studio-preview"><summary>Secure preview</summary><blockquote>{series.featuredQuote ?? series.summary}</blockquote></details> : null}</div>
          <div className="studio-subitems">{workspace.episodes.filter((episode) => episode.seriesId === series.id).map((episode) => <div className="studio-subitem" key={episode.id}><div><small>Episode {episode.episodeNumber} · {statusLabel(episode.status)}</small><strong>{episode.title}</strong><span>{episode.excerpt}</span></div><div>{episode.status === "draft" ? <button className="web-text-button" onClick={() => setForm({ kind: "episode", item: episode })}>Edit</button> : null}<LifecycleControls compact busy={busy} entity="story_episodes" id={episode.id} status={episode.status} onTransition={transition} /></div></div>)}</div>
        </article>)}
      </div> : null}

      {workspace && tab === "journeys" ? <div className="web-studio-section">
        <StudioSectionHeading title="Guided journeys" description="Journey steps stay editable only while their parent journey is a draft." action="New journey" onAction={() => setForm({ kind: "journey" })} />
        {workspace.journeys.length === 0 ? <StudioEmpty text="No journeys have been created yet." /> : workspace.journeys.map((journey) => <article className="studio-content-card" key={journey.id}><div className="studio-content-heading"><div><span className="status draft">{statusLabel(journey.status)}</span><h3>{journey.title}</h3><p>{journey.summary}</p></div><LifecycleControls busy={busy} entity="journeys" id={journey.id} status={journey.status} onTransition={transition} /></div><div className="studio-card-actions">{journey.status === "draft" ? <><button className="secondary-button" onClick={() => setForm({ kind: "journey", item: journey })}>Edit journey</button><button className="secondary-button" onClick={() => setForm({ kind: "step", parentId: journey.id })}>Add step</button></> : null}</div><div className="studio-subitems">{workspace.steps.filter((step) => step.journeyId === journey.id).map((step) => <div className="studio-subitem" key={step.id}><div><small>Step {step.stepNumber}</small><strong>{step.title}</strong><span>{step.description}</span></div>{journey.status === "draft" ? <button className="web-text-button" onClick={() => setForm({ kind: "step", item: step })}>Edit</button> : null}</div>)}</div></article>)}
      </div> : null}

      {workspace && tab === "practices" ? <div className="web-studio-section">
        <StudioSectionHeading title="Practices and challenges" description="Keep points and levels quiet while the reflection prompt remains the focus." action="New practice" onAction={() => setForm({ kind: "challenge" })} />
        {workspace.challenges.length === 0 ? <StudioEmpty text="No practices have been created yet." /> : workspace.challenges.map((challenge) => <article className="studio-content-card" key={challenge.id}><div className="studio-content-heading"><div><span className="status draft">{statusLabel(challenge.status)}</span><h3>{challenge.title}</h3><p>{challenge.prompt}</p><small>{challenge.estimatedMinutes} minutes · Level {challenge.levelRequired} · {challenge.pointsReward} points</small></div><LifecycleControls busy={busy} entity="challenges" id={challenge.id} status={challenge.status} onTransition={transition} /></div>{challenge.status === "draft" ? <button className="secondary-button" onClick={() => setForm({ kind: "challenge", item: challenge })}>Edit practice</button> : null}</article>)}
      </div> : null}

      {workspace && tab === "history" ? <div className="web-studio-section"><StudioSectionHeading title="Publication history" description="Recent status changes recorded by the database audit trail." />{workspace.audit.length === 0 ? <StudioEmpty text="No publication history has been recorded yet." /> : <ol className="studio-audit-list">{workspace.audit.map((item) => <li key={item.id}><span>{item.entityTable.replaceAll("_", " ")}</span><strong>{item.oldStatus ? statusLabel(item.oldStatus) : "Created"} → {item.newStatus ? statusLabel(item.newStatus) : item.action}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol>}</div> : null}

      {workspace && form ? <StudioEditorForm form={form} userId={userId} workspace={workspace} onCancel={() => setForm(null)} onSaved={async () => { setForm(null); setMessage("Draft saved securely."); await refresh(); }} /> : null}
    </section>
  );
}

function StudioSectionHeading({ action, description, onAction, title }: { action?: string; description: string; onAction?: () => void; title: string }) {
  return <div className="studio-section-heading"><div><h2>{title}</h2><p>{description}</p></div>{action && onAction ? <button className="primary-button clay" onClick={onAction}>{action}</button> : null}</div>;
}

function StudioEmpty({ text }: { text: string }) {
  return <p className="studio-empty">{text}</p>;
}

function statusLabel(status: ContentStatus) {
  return status === "in_review" ? "In review" : status[0].toUpperCase() + status.slice(1);
}

function LifecycleControls({ busy, compact = false, entity, id, onTransition, status }: { busy: boolean; compact?: boolean; entity: EditorialEntity; id: string; onTransition: (entity: EditorialEntity, id: string, from: ContentStatus, to: ContentStatus) => Promise<void>; status: ContentStatus }) {
  const action = (to: ContentStatus, label: string) => <button disabled={busy} className={compact ? "web-text-button" : "secondary-button"} onClick={() => void onTransition(entity, id, status, to)}>{label}</button>;
  if (status === "draft") return <div className="studio-lifecycle">{action("in_review", "Submit for review")}</div>;
  if (status === "in_review") return <div className="studio-lifecycle">{action("draft", "Request changes")}{action("approved", "Approve")}</div>;
  if (status === "approved") return <div className="studio-lifecycle">{action("draft", "Return to draft")}<details className="studio-confirm"><summary>Publish</summary><p>This makes the item public immediately.</p><button disabled={busy} className="primary-button clay" onClick={() => void onTransition(entity, id, status, "published")}>Confirm publication</button></details></div>;
  if (status === "published") return <div className="studio-lifecycle"><details className="studio-confirm"><summary>Unpublish</summary><p>The public item will be archived.</p><button disabled={busy} className="secondary-button" onClick={() => void onTransition(entity, id, status, "archived")}>Confirm unpublish</button></details></div>;
  return <div className="studio-lifecycle">{action("draft", "Reopen as draft")}</div>;
}

function initialStudioValues(form: StudioForm): Record<string, string> {
  if (form.kind === "series") return { title: form.item?.title ?? "", slug: form.item?.slug ?? "", summary: form.item?.summary ?? "", featuredQuote: form.item?.featuredQuote ?? "", coverUrl: form.item?.coverUrl ?? "", sensitiveTopics: form.item?.sensitiveTopics.join(", ") ?? "" };
  if (form.kind === "episode") return { seriesId: form.item?.seriesId ?? form.parentId ?? "", episodeNumber: String(form.item?.episodeNumber ?? 1), title: form.item?.title ?? "", excerpt: form.item?.excerpt ?? "", body: form.item?.body ?? "", readingMinutes: String(form.item?.readingMinutes ?? 6) };
  if (form.kind === "journey") return { title: form.item?.title ?? "", slug: form.item?.slug ?? "", summary: form.item?.summary ?? "", durationDays: String(form.item?.durationDays ?? 7) };
  if (form.kind === "step") return { journeyId: form.item?.journeyId ?? form.parentId ?? "", stepNumber: String(form.item?.stepNumber ?? 1), title: form.item?.title ?? "", description: form.item?.description ?? "", challengeId: form.item?.challengeId ?? "" };
  return { title: form.item?.title ?? "", slug: form.item?.slug ?? "", prompt: form.item?.prompt ?? "", scriptureReference: form.item?.scriptureReference ?? "", estimatedMinutes: String(form.item?.estimatedMinutes ?? 6), levelRequired: String(form.item?.levelRequired ?? 1), pointsReward: String(form.item?.pointsReward ?? 20) };
}

function StudioEditorForm({ form, onCancel, onSaved, userId, workspace }: { form: StudioForm; onCancel: () => void; onSaved: () => Promise<void>; userId: string; workspace: EditorialWorkspace }) {
  const [values, setValues] = useState<Record<string, string>>(() => initialStudioValues(form));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = `${form.item ? "Edit" : "Create"} ${form.kind === "series" ? "story" : form.kind === "challenge" ? "practice" : form.kind}`;
  const field = (name: string, label: string, options: { min?: number; type?: string; placeholder?: string; required?: boolean } = {}) => <label>{label}<input required={options.required ?? true} min={options.min} minLength={options.type === "number" ? undefined : options.min} type={options.type ?? "text"} value={values[name] ?? ""} placeholder={options.placeholder} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /></label>;
  const area = (name: string, label: string, minLength = 1, required = true) => <label>{label}<textarea required={required} minLength={minLength} value={values[name] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /></label>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.kind === "series") await saveSeries({ title: values.title, slug: values.slug, summary: values.summary, featuredQuote: values.featuredQuote || null, coverUrl: values.coverUrl || null, sensitiveTopics: values.sensitiveTopics.split(",").map((topic) => topic.trim()).filter(Boolean) }, userId, form.item?.id);
      if (form.kind === "episode") await saveEpisode({ seriesId: values.seriesId, episodeNumber: Number(values.episodeNumber), title: values.title, excerpt: values.excerpt, body: values.body, readingMinutes: Number(values.readingMinutes) }, userId, form.item?.id);
      if (form.kind === "journey") await saveJourney({ title: values.title, slug: values.slug, summary: values.summary, durationDays: Number(values.durationDays) }, userId, form.item?.id);
      if (form.kind === "step") await saveJourneyStep({ journeyId: values.journeyId, stepNumber: Number(values.stepNumber), title: values.title, description: values.description, challengeId: values.challengeId || null }, form.item?.id);
      if (form.kind === "challenge") await saveChallenge({ title: values.title, slug: values.slug, prompt: values.prompt, scriptureReference: values.scriptureReference || null, estimatedMinutes: Number(values.estimatedMinutes), levelRequired: Number(values.levelRequired), pointsReward: Number(values.pointsReward) }, userId, form.item?.id);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The draft could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const select = (name: string, label: string, options: { value: string; label: string }[], required = true) => <label>{label}<select required={required} value={values[name] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}><option value="">Choose one</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;

  return <div className="studio-editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="studio-editor" role="dialog" aria-modal="true" aria-labelledby="studio-editor-title"><div className="studio-editor-header"><div><p className="kicker mineral">Protected draft workspace</p><h2 id="studio-editor-title">{title}</h2></div><button aria-label="Close editor" className="dialog-close" onClick={onCancel}><Cross2Icon /></button></div><form onSubmit={submit} className="studio-editor-form">
    {form.kind === "series" ? <>{field("title", "Story title", { min: 3 })}{field("slug", "URL slug", { min: 3, placeholder: "a-clear-short-slug" })}{area("summary", "Summary", 20)}{area("featuredQuote", "Featured quote", 1, false)}{field("coverUrl", "Approved cover image URL", { required: false })}{field("sensitiveTopics", "Sensitive topics, separated by commas", { required: false })}</> : null}
    {form.kind === "episode" ? <>{select("seriesId", "Story series", workspace.series.map((item) => ({ value: item.id, label: item.title })))}<div className="studio-field-row">{field("episodeNumber", "Episode order", { min: 1, type: "number" })}{field("readingMinutes", "Reading minutes", { min: 1, type: "number" })}</div>{field("title", "Episode title", { min: 3 })}{area("excerpt", "Short excerpt", 10)}{area("body", "Episode body", 20)}</> : null}
    {form.kind === "journey" ? <>{field("title", "Journey title", { min: 3 })}{field("slug", "URL slug", { min: 3 })}{area("summary", "Summary", 20)}{field("durationDays", "Duration in days", { min: 1, type: "number" })}</> : null}
    {form.kind === "step" ? <>{select("journeyId", "Journey", workspace.journeys.filter((item) => item.status === "draft").map((item) => ({ value: item.id, label: item.title })))}{field("stepNumber", "Step order", { min: 1, type: "number" })}{field("title", "Step title", { min: 3 })}{area("description", "Step description", 10)}{select("challengeId", "Linked practice (optional)", workspace.challenges.map((item) => ({ value: item.id, label: item.title })), false)}</> : null}
    {form.kind === "challenge" ? <>{field("title", "Practice title", { min: 3 })}{field("slug", "URL slug", { min: 3 })}{area("prompt", "Reflection prompt", 10)}{field("scriptureReference", "Scripture reference", { required: false })}
      <div className="studio-field-row">{field("estimatedMinutes", "Minutes", { min: 1, type: "number" })}{field("levelRequired", "Level", { min: 1, type: "number" })}{field("pointsReward", "Points", { min: 0, type: "number" })}</div></> : null}
    {error ? <p className="form-message" role="alert">{error}</p> : null}<div className="studio-form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button clay" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button></div>
  </form></section></div>;
}

function EditorialQueueCard({ item, onReview }: { item: EditorialQueueItem; onReview: (item: EditorialQueueItem) => void }) {
  return (
    <article className={`review-item${item.status === "draft" ? " compact" : ""}`}>
      <div className="review-topline"><span className={item.status === "in_review" ? "status review" : "status draft"}>{item.status === "in_review" ? "In review" : "Draft"}</span><span>{item.origin === "agent" ? "Agent draft" : "Human draft"}</span></div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      {item.status === "in_review" ? <button className="primary-button clay" onClick={() => onReview(item)}>Review and approve <ArrowRightIcon /></button> : <p className="web-session-note">Move this draft into review only after consent, safety, and editorial checks are recorded.</p>}
    </article>
  );
}

function WebsitePractice({ challenge, complete, onComplete, onDone }: { challenge: PublicChallenge | undefined; complete: boolean; onComplete: () => void; onDone: () => void }) {
  if (!challenge) return <main className="web-page web-container"><PublicContentEmptyState error={null} loading={false} /></main>;
  return (
    <main className="web-page web-practice" data-testid="practice-screen"><button className="web-back-button" onClick={onDone}><ArrowLeftIcon /> Back to journey</button><div className="web-practice-card"><p className="kicker moss">Practice · {challenge.estimatedMinutes} minutes</p><h1>{challenge.title}</h1><p className="web-practice-lede">Move gently and adapt this prompt to what is safe in your circumstances.</p><div className="web-practice-prompt"><span>01</span><p>{challenge.prompt}</p></div>{challenge.scriptureReference ? <blockquote><span>Read and reflect on this passage in your preferred translation.</span><cite>{challenge.scriptureReference}</cite></blockquote> : null}<p className="web-session-note">This completion is temporary and is not saved to an account.</p><button className="primary-button mineral-button" onClick={complete ? onDone : onComplete}>{complete ? <><CheckCircledIcon /> Done for this session</> : <>Complete practice · +{challenge.pointsReward} points</>}</button></div></main>
  );
}

function WebsiteSubmission({ onDone }: { onDone: () => void }) {
  return (
    <main className="web-page web-container web-submission-page" data-testid="submission-unavailable"><div className="web-page-intro"><p className="kicker">Story submissions</p><h1>The private submission channel is not open yet.</h1><p>We are finishing the retention, deletion, consent, and safeguarding procedures before asking anyone to share sensitive experiences.</p></div><section className="web-submission-form"><LockClosedIcon /><h2>Please do not send personal story material yet.</h2><p>Our Honest Days does not collect or store story text. The form will open only after the privacy safeguards and the full editorial response process are approved and staffed.</p><button className="primary-button clay" onClick={onDone}>Return to discovery</button></section></main>
  );
}

function WebsiteDialog({ children, description, onOpenChange, open, title }: { children: ReactNode; description: string; onOpenChange: (open: boolean) => void; open: boolean; title: string }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="web-dialog-overlay" />
        <Dialog.Content className="web-dialog-content">
          <Dialog.Close className="web-dialog-close" aria-label="Close dialog"><Cross2Icon /></Dialog.Close>
          <Dialog.Title className="web-dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="web-dialog-description">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function WebsiteTabBar({ active, onNavigate }: { active: WebsiteScreen; onNavigate: (route: WebsiteRoute) => void }) {
  const items = [
    { id: "home" as const, label: "Home", icon: <HomeIcon />, route: { screen: "home" } as WebsiteRoute },
    { id: "stories" as const, label: "Stories", icon: <ReaderIcon />, route: { screen: "stories" } as WebsiteRoute },
    { id: "journey" as const, label: "Journey", icon: <SewingPinIcon />, route: { screen: "journey" } as WebsiteRoute },
    { id: "studio" as const, label: "Studio", icon: <DashboardIcon />, route: { screen: "studio" } as WebsiteRoute },
  ];
  return <nav className="web-tab-bar" aria-label="Mobile primary navigation">{items.map((item) => <button className={active === item.id ? "active" : undefined} key={item.id} onClick={() => onNavigate(item.route)}>{item.icon}<span>{item.label}</span></button>)}</nav>;
}

function SiteFooter({ onNavigate }: { onNavigate: (route: WebsiteRoute) => void }) {
  return (
    <footer className="web-footer"><div className="web-container web-footer-grid"><div><strong>OUR HONEST DAYS</strong><p>Real stories. Real life. Rooted faith.</p></div><nav aria-label="Footer navigation"><button onClick={() => onNavigate({ screen: "home" })}>Discover</button><button onClick={() => onNavigate({ screen: "stories" })}>Stories</button><button onClick={() => onNavigate({ screen: "journey" })}>Journeys</button></nav><p className="web-footer-note">Human-reviewed stories · Private by default · Faith without easy answers</p></div></footer>
  );
}

function StoryReader() {
  return (
    <MobileScroll className="app-screen well-screen reader-screen">
      <article className="reader-content screen-content" data-testid="story-reader">
        <p className="kicker clay-text">Part 1 of 5 · 8 min read</p>
        <h1>The argument beneath the argument</h1>
        <p className="reader-deck">For years, Maya and Jordan thought conflict was proof they had chosen wrong. Then they learned to listen for the fear underneath the facts.</p>
        <img src="/assets/the-well/hero-learning-to-stay.webp" srcSet="/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w" sizes="390px" alt="Maya and Jordan sitting together" width={1430} height={895} draggable={false} />
        <p>It started, as these things often do, with a small question carrying too much weight.</p>
        <p>“Did you call them back?” Maya asked from the kitchen. Jordan heard disappointment. Maya heard avoidance. Neither heard what the other was trying to protect.</p>
        <blockquote>“We kept defending our intentions while the other person was describing the impact.”</blockquote>
        <p>The shift was not dramatic. They began with one practice: before answering, name what you think the other person is feeling—and ask if you are right.</p>
        <div className="reader-reflection">
          <p className="kicker moss">Pause and reflect</p>
          <h2>What do you defend before you fully understand?</h2>
          <p>You do not need to solve it now. Just notice.</p>
        </div>
        <button className="primary-button clay">Continue to Part 2 <ArrowRightIcon /></button>
      </article>
    </MobileScroll>
  );
}

function PracticeScreen({ complete, onComplete, onDone }: { complete: boolean; onComplete: () => void; onDone: () => void }) {
  return (
    <MobileScroll className="app-screen well-screen">
      <main className="practice-screen-content screen-content" data-testid="practice-screen">
        <p className="kicker moss">Today · 6 minutes</p>
        <h1>Listen for what is underneath</h1>
        <p className="practice-lede">Presence grows when curiosity arrives before correction.</p>
        <ol className="practice-steps">
          <li><span>1</span><p><strong>Settle</strong>Take three slow breaths. Release the need to prepare your answer.</p></li>
          <li><span>2</span><p><strong>Ask</strong>“What feels most important for me to understand?”</p></li>
          <li><span>3</span><p><strong>Reflect</strong>Say back what you heard, without defending or solving.</p></li>
        </ol>
        <div className="scripture-note">
          <p>“Everyone should be quick to listen, slow to speak…”</p>
          <span>James 1:19 · NIV</span>
        </div>
        <button className="primary-button clay" onClick={complete ? onDone : onComplete}>
          {complete ? <><CheckCircledIcon /> Done for today</> : <>Complete practice · +20 points</>}
        </button>
      </main>
    </MobileScroll>
  );
}

function SubmissionScreen({ onDone }: { onDone: () => void }) {
  return (
    <MobileScroll className="app-screen well-screen">
      <main className="submission-form screen-content" data-testid="submission-unavailable">
        <LockClosedIcon />
        <p className="kicker moss">Story submissions</p>
        <h1>The private submission channel is not open yet.</h1>
        <p>We are finishing the retention, deletion, consent, and safeguarding procedures before asking anyone to share sensitive experiences.</p>
        <div className="safety-callout"><LockClosedIcon /><p><strong>Please do not send personal story material yet.</strong><span>Our Honest Days does not collect or store story text.</span></p></div>
        <button className="primary-button clay" onClick={onDone}>Return home</button>
      </main>
    </MobileScroll>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="screen-header-inner">
      <button className="icon-button" onClick={onBack} aria-label="Go back"><ArrowLeftIcon /></button>
      <strong>{title}</strong>
      <span aria-hidden="true" />
    </div>
  );
}

function BottomNav({ current, onNavigate }: { current: RootScreen; onNavigate: (screen: RootScreen) => void }) {
  const keyboard = useKeyboard();
  const items: Array<{ id: RootScreen; label: string; icon: ReactNode }> = [
    { id: "home", label: "Home", icon: <HomeIcon /> },
    { id: "stories", label: "Stories", icon: <ReaderIcon /> },
    { id: "journey", label: "Journey", icon: <SewingPinIcon /> },
    { id: "studio", label: "Studio", icon: <DashboardIcon /> },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className={current === item.id ? "active" : ""}
          onClick={(event) => {
            keyboard.hide();
            onNavigate(item.id);
            event.currentTarget.blur();
          }}
        >
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function PageIntro({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <header className="page-intro">
      <p className="kicker clay-text">{kicker}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </header>
  );
}

function JourneyStep({ number, title, description, state }: { number: string; title: string; description: string; state: "done" | "current" | "upcoming" }) {
  return (
    <li className={`journey-step ${state}`}>
      <span>{state === "done" ? <CheckCircledIcon /> : number}</span>
      <p><strong>{title}</strong><small>{description}</small></p>
    </li>
  );
}

function AgentRow({ name, state, detail }: { name: string; state: string; detail: string }) {
  return (
    <div className="agent-row">
      <span className="agent-icon"><LightningBoltIcon /></span>
      <p><strong>{name}</strong><small>{detail}</small></p>
      <em>{state}</em>
    </div>
  );
}
