import { useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
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
  KeyboardTextarea,
  MobileScroll,
  useKeyboard,
  type FlowControls,
  type FlowScreen,
} from "./mobile";
import { getSupabaseClient, isSupabaseConfigured, requestMagicLink } from "./lib/supabase";

type RootScreen = "home" | "stories" | "journey" | "studio";
type WebsiteScreen = RootScreen | "story" | "practice" | "submission";
type PrototypeMode = "website" | "device";

const FEATURED_STORY_ID = "11111111-1111-4111-8111-111111111111";

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
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [submissionSent, setSubmissionSent] = useState(false);
  const [published, setPublished] = useState(false);
  const practiceCompleteRef = useRef(false);
  const submissionSentRef = useRef(false);
  const publishedRef = useRef(false);
  const [approvalBusy, setApprovalBusy] = useState(false);

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
      const supabase = await getSupabaseClient();

      if (supabase) {
        const { data } = await supabase.auth.getClaims();
        const reviewerId = data?.claims?.sub;
        if (!reviewerId) throw new Error("Sign in with an editor account to publish.");

        const { error } = await supabase
          .from("story_series")
          .update({
            status: "published",
            approved_by: reviewerId,
            approved_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
          })
          .eq("id", FEATURED_STORY_ID)
          .eq("status", "in_review");

        if (error) throw error;
      }

      publishedRef.current = true;
      setPublished(true);
      setApprovalOpen(false);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Approval failed.");
      setApprovalOpen(false);
      setAuthOpen(true);
    } finally {
      setApprovalBusy(false);
    }
  }

  if (mode === "website") {
    return (
      <ResponsiveWebsite
        approvalBusy={approvalBusy}
        approvalOpen={approvalOpen}
        authBusy={authBusy}
        authMessage={authMessage}
        authOpen={authOpen}
        email={email}
        onApproval={handleApproval}
        onApprovalOpenChange={setApprovalOpen}
        onAuthOpenChange={setAuthOpen}
        onEmailChange={setEmail}
        onMagicLink={handleMagicLink}
        onPracticeComplete={() => {
          practiceCompleteRef.current = true;
          setPracticeComplete(true);
        }}
        onSubmission={() => {
          submissionSentRef.current = true;
          setSubmissionSent(true);
        }}
        practiceComplete={practiceComplete}
        published={published}
        submissionSent={submissionSent}
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
              published={publishedRef.current}
              onReview={() => setApprovalOpen(true)}
              onSignIn={() => setAuthOpen(true)}
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
      render: (flow) => (
        <SubmissionScreen
          sent={submissionSentRef.current}
          onSubmit={() => {
            submissionSentRef.current = true;
            setSubmissionSent(true);
          }}
          onDone={flow.pop}
        />
      ),
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
              <p className="wordmark">THE WELL</p>
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
    published: isPublished,
    onReview,
    onSignIn,
  }: {
    published: boolean;
    onReview: () => void;
    onSignIn: () => void;
  }) {
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
              <span className="count-pill">2</span>
            </div>
            <article className="review-item">
              <div className="review-topline">
                <span className={isPublished ? "status published" : "status review"}>
                  {isPublished ? "Published" : "In review"}
                </span>
                <span>Story · 5 parts</span>
              </div>
              <h3>Learning to Stay</h3>
              <p>Consent confirmed · Safety pass complete · Scripture citations checked</p>
              <button className="primary-button clay" disabled={isPublished} onClick={onReview}>
                {isPublished ? <><CheckCircledIcon /> Published safely</> : <>Review and approve <ArrowRightIcon /></>}
              </button>
            </article>
            <article className="review-item compact">
              <div className="review-topline"><span className="status draft">Draft</span><span>Daily practice</span></div>
              <h3>Repair without rushing</h3>
              <p>Generated by Content Factory · Awaiting theology and safety review</p>
            </article>
          </section>
          <section className="studio-section agent-section">
            <p className="kicker mineral">Four-agent desk</p>
            <h2>Affordable by default</h2>
            <AgentRow name="Story Intelligence" state="Weekly · queued" detail="Themes, risk flags, story insights" />
            <AgentRow name="Content Factory" state="Weekly · draft only" detail="Episodes, prompts, challenges" />
            <AgentRow name="Growth & Retention" state="Paused" detail="Experiments, never direct messages" />
            <AgentRow name="Chief Operator" state="Monthly · queued" detail="Health, costs, recommendations" />
          </section>
          <button className="secondary-button studio-login" onClick={onSignIn}>
            <PersonIcon /> Sign in as an editor
          </button>
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
        title="Come back to the well"
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
          {!isSupabaseConfigured() ? <p className="demo-note">Preview mode: add the environment values in <code>.env.local</code> to send real links.</p> : null}
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
            <p className="kicker clay-text">Learning to Stay</p>
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
  authMessage: string;
  authOpen: boolean;
  email: string;
  onApproval: () => void;
  onApprovalOpenChange: (open: boolean) => void;
  onAuthOpenChange: (open: boolean) => void;
  onEmailChange: (email: string) => void;
  onMagicLink: (event: FormEvent) => void;
  onPracticeComplete: () => void;
  onSubmission: () => void;
  practiceComplete: boolean;
  published: boolean;
  submissionSent: boolean;
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

function ResponsiveWebsite({
  approvalBusy,
  approvalOpen,
  authBusy,
  authMessage,
  authOpen,
  email,
  onApproval,
  onApprovalOpenChange,
  onAuthOpenChange,
  onEmailChange,
  onMagicLink,
  onPracticeComplete,
  onSubmission,
  practiceComplete,
  published,
  submissionSent,
}: ResponsiveWebsiteProps) {
  const [screen, setScreen] = useState<WebsiteScreen>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (next: WebsiteScreen) => {
    setScreen(next);
    setMenuOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };

  return (
    <div className="web-app">
      <a className="web-skip-link" href="#main-content">Skip to content</a>
      <SiteHeader
        active={screen}
        menuOpen={menuOpen}
        onMenuChange={setMenuOpen}
        onNavigate={navigate}
        onSignIn={() => onAuthOpenChange(true)}
      />

      <div id="main-content">
        {screen === "home" ? (
          <WebsiteHome
            onNavigate={navigate}
            onSignIn={() => onAuthOpenChange(true)}
            practiceComplete={practiceComplete}
          />
        ) : null}
        {screen === "stories" ? <WebsiteStories onNavigate={navigate} /> : null}
        {screen === "journey" ? (
          <WebsiteJourney complete={practiceComplete} onComplete={onPracticeComplete} onNavigate={navigate} />
        ) : null}
        {screen === "studio" ? (
          <WebsiteStudio
            published={published}
            onReview={() => onApprovalOpenChange(true)}
            onSignIn={() => onAuthOpenChange(true)}
          />
        ) : null}
        {screen === "story" ? <WebsiteStoryReader onBack={() => navigate("home")} /> : null}
        {screen === "practice" ? (
          <WebsitePractice complete={practiceComplete} onComplete={onPracticeComplete} onDone={() => navigate("home")} />
        ) : null}
        {screen === "submission" ? (
          <WebsiteSubmission sent={submissionSent} onSubmit={onSubmission} onDone={() => navigate("home")} />
        ) : null}
      </div>

      <SiteFooter onNavigate={navigate} />
      <WebsiteTabBar active={screen} onNavigate={navigate} />

      <WebsiteDialog
        description="We’ll email you one secure sign-in link. No password needed."
        onOpenChange={onAuthOpenChange}
        open={authOpen}
        title="Come back to the well"
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
          {!isSupabaseConfigured() ? <p className="demo-note">Preview mode: add the environment values in <code>.env.local</code> to send real links.</p> : null}
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
            <p className="kicker clay-text">Learning to Stay</p>
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
  menuOpen,
  onMenuChange,
  onNavigate,
  onSignIn,
}: {
  active: WebsiteScreen;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  onNavigate: (screen: WebsiteScreen) => void;
  onSignIn: () => void;
}) {
  const navigation = [
    { id: "home" as const, label: "Discover" },
    { id: "stories" as const, label: "Stories" },
    { id: "journey" as const, label: "Journeys" },
    { id: "studio" as const, label: "Studio" },
  ];

  return (
    <header className="web-header">
      <div className="web-container web-header-inner">
        <button className="web-brand" onClick={() => onNavigate("home")} aria-label="THE WELL home">
          <span>THE WELL</span>
          <small>Stories for the becoming</small>
        </button>
        <nav className="web-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="web-header-actions">
          <button className="web-sign-in" onClick={onSignIn}><PersonIcon /> Sign in</button>
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
          <button key={item.id} onClick={() => onNavigate(item.id)}>{item.label}</button>
        ))}
        <button onClick={onSignIn}>Sign in</button>
      </nav>
    </header>
  );
}

function WebsiteHome({
  onNavigate,
  onSignIn,
  practiceComplete,
}: {
  onNavigate: (screen: WebsiteScreen) => void;
  onSignIn: () => void;
  practiceComplete: boolean;
}) {
  return (
    <main className="web-home" data-testid="home-screen">
      <section className="web-hero web-section">
        <div className="web-container web-hero-grid">
          <div className="web-hero-copy">
            <p className="kicker">Featured story · Part 1 of 5</p>
            <blockquote>“We stopped trying to win and started trying to understand.”</blockquote>
            <p className="web-hero-intro">Honest stories for relationships, identity, intimacy, faith, and the chapters no one prepared you for.</p>
            <div className="web-hero-actions">
              <button className="primary-button clay" onClick={() => onNavigate("story")}>
                Read their story <ArrowRightIcon />
              </button>
              <button className="web-text-button" onClick={() => onNavigate("stories")}>Explore all stories</button>
            </div>
          </div>
          <article className="web-featured-story">
            <div className="web-featured-image-wrap">
              <img className="web-featured-image" src="/assets/the-well/hero-learning-to-stay.webp" srcSet="/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w" sizes="(max-width: 860px) 100vw, 52vw" alt="A couple sharing a warm, knowing look" width={1430} height={895} fetchPriority="high" />
              <span className="web-image-note">A story about repair, listening, and choosing each other again.</span>
            </div>
            <div className="web-featured-caption">
              <div><p className="kicker">Marriage · Repair</p><h1>Learning to Stay</h1></div>
              <p>A 5-part story · Part 1</p>
              <button className="primary-button clay web-featured-mobile-action" onClick={() => onNavigate("story")}>
                Read their story <ArrowRightIcon />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="web-section web-rooms-section" aria-labelledby="rooms-title">
        <div className="web-container">
          <div className="web-section-heading">
            <div><p className="kicker mineral">Find your room</p><h2 id="rooms-title">There is space here for your whole story.</h2></div>
            <p>Begin with the conversation that feels closest to where you are now.</p>
          </div>
          <div className="web-rooms-grid">
            {rooms.map((room) => (
              <article className={`web-room-card ${room.accent}`} key={room.name}>
                <span>{room.number}</span><h3>{room.name}</h3><p>{room.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="web-section web-path-section" aria-labelledby="path-title-web">
        <div className="web-container web-path-grid">
          <div className="web-path-copy">
            <p className="kicker moss">Today’s encounter</p>
            <h2 id="path-title-web">Listening is a form of love.</h2>
            <p>Six quiet minutes to notice what another person may be trying to say beneath the words.</p>
            <button className="primary-button mineral-button" onClick={() => onNavigate("practice")}>
              {practiceComplete ? <CheckCircledIcon /> : <LightningBoltIcon />}
              {practiceComplete ? "Completed for today" : "Begin today’s practice"}
            </button>
          </div>
          <div className="web-path-card">
            <div className="web-path-topline"><span>Week 2 · Listening</span><strong>Level 3</strong></div>
            <p className="web-path-question"><em>Ask:</em> What have I missed lately?</p>
            <div className="web-progress-copy"><span>6 of 14 practices complete</span><span>43%</span></div>
            <div className="progress-track" role="progressbar" aria-label="Journey 43 percent complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={43}><span style={{ width: "43%" }} /></div>
            <button className="web-text-button" onClick={() => onNavigate("journey")}>View the full journey <ArrowRightIcon /></button>
          </div>
        </div>
      </section>

      <section className="web-section web-stories-section" aria-labelledby="stories-title-web">
        <div className="web-container">
          <div className="web-section-heading compact">
            <div><p className="kicker">You are not alone</p><h2 id="stories-title-web">More honest stories</h2></div>
            <button className="web-text-button" onClick={() => onNavigate("stories")}>See all stories <ArrowRightIcon /></button>
          </div>
          <div className="web-story-grid">
            {storyCards.map((story, index) => (
              <button className="web-story-card" key={story.title} onClick={() => onNavigate("story")}>
                <img src={story.image} srcSet={story.image.includes("hero-") ? "/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w" : "/assets/the-well/story-grace-in-the-quiet-640.webp 640w, /assets/the-well/story-grace-in-the-quiet.webp 960w"} sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 860px) 50vw, 33vw" alt="" width={story.image.includes("hero-") ? 1430 : 960} height={story.image.includes("hero-") ? 895 : 720} loading="lazy" />
                <span className="web-story-card-copy"><small>{story.eyebrow}</small><strong>{index === 0 ? "Grace in the Quiet" : story.title}</strong><em>{story.detail}</em></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="web-section web-invitation-section">
        <div className="web-container web-invitation">
          <div><p className="kicker marigold">Your story is still yours</p><h2>Share what happened. Keep control of what happens next.</h2></div>
          <div><p>Every submission is reviewed privately. Publication requires a separate, recorded consent and a human editor.</p><button className="secondary-button" onClick={() => onNavigate("submission")}><ReaderIcon /> Share a story safely</button></div>
          <button className="web-invitation-signin" onClick={onSignIn}>Already a member? Sign in</button>
        </div>
      </section>
    </main>
  );
}

function WebsiteStories({ onNavigate }: { onNavigate: (screen: WebsiteScreen) => void }) {
  return (
    <main className="web-page web-container" data-testid="stories-screen">
      <div className="web-page-intro"><p className="kicker">Story library</p><h1>Read honest stories of real lives where faith does not require easy endings.</h1><p>Every published story is human-reviewed for consent, care, and safety.</p></div>
      <div className="web-library-grid">
        {storyCards.map((story, index) => (
          <button className={`web-library-card ${index === 0 ? "featured" : ""}`} key={story.title} onClick={() => onNavigate("story")}>
            <img src={story.image} srcSet={story.image.includes("hero-") ? "/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w" : "/assets/the-well/story-grace-in-the-quiet-640.webp 640w, /assets/the-well/story-grace-in-the-quiet.webp 960w"} sizes="(max-width: 860px) calc(100vw - 40px), 45vw" alt="" width={story.image.includes("hero-") ? 1430 : 960} height={story.image.includes("hero-") ? 895 : 720} loading="lazy" />
            <span><small>{story.eyebrow}</small><strong>{story.title}</strong><em>{story.detail}</em><b>Read story <ArrowRightIcon /></b></span>
          </button>
        ))}
      </div>
      <button className="secondary-button web-page-action" onClick={() => onNavigate("submission")}><ReaderIcon /> Submit your story for review</button>
    </main>
  );
}

function WebsiteStoryReader({ onBack }: { onBack: () => void }) {
  return (
    <main className="web-reader" data-testid="story-reader">
      <div className="web-container web-reader-topbar"><button className="web-back-button" onClick={onBack} aria-label="Go back"><ArrowLeftIcon /> Back to Discover</button><span>Learning to Stay · Part 1</span></div>
      <article>
        <header className="web-reader-header web-container">
          <div><p className="kicker clay-text">Part 1 of 5 · 8 min read</p><h1>The argument beneath the argument</h1><p className="web-reader-deck">For years, Maya and Jordan thought conflict was proof they had chosen wrong. Then they learned to listen for the fear underneath the facts.</p></div>
          <img src="/assets/the-well/hero-learning-to-stay.webp" srcSet="/assets/the-well/hero-learning-to-stay-768.webp 768w, /assets/the-well/hero-learning-to-stay.webp 1430w" sizes="(max-width: 860px) 100vw, 52vw" alt="Maya and Jordan sitting together" width={1430} height={895} />
        </header>
        <div className="web-reader-body">
          <p>It started, as these things often do, with a small question carrying too much weight.</p>
          <p>“Did you call them back?” Maya asked from the kitchen. Jordan heard disappointment. Maya heard avoidance. Neither heard what the other was trying to protect.</p>
          <blockquote>“We kept defending our intentions while the other person was describing the impact.”</blockquote>
          <p>The shift was not dramatic. They began with one practice: before answering, name what you think the other person is feeling—and ask if you are right.</p>
          <div className="reader-reflection"><p className="kicker moss">Pause and reflect</p><h2>What do you defend before you fully understand?</h2><p>You do not need to solve it now. Just notice.</p></div>
          <button className="primary-button clay">Continue to Part 2 <ArrowRightIcon /></button>
        </div>
      </article>
    </main>
  );
}

function WebsiteJourney({ complete, onComplete, onNavigate }: { complete: boolean; onComplete: () => void; onNavigate: (screen: WebsiteScreen) => void }) {
  return (
    <main className="web-page web-container" data-testid="journey-screen">
      <div className="web-page-intro"><p className="kicker moss">Your journey</p><h1>Practice a more generous way of listening.</h1><p>Small, repeatable steps for the relationships you want to tend with care.</p></div>
      <div className="web-journey-grid">
        <section className="web-journey-overview">
          <div className="web-path-topline"><span>Week 2 of 4</span><strong>620 points · Level 3</strong></div>
          <div className="progress-track" role="progressbar" aria-label="Journey 43 percent complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={43}><span style={{ width: "43%" }} /></div>
          <p>6 of 14 practices complete</p>
          <button className="primary-button mineral-button" onClick={() => onNavigate("practice")}>Open today’s practice <ArrowRightIcon /></button>
        </section>
        <ol className="web-journey-steps">
          <JourneyStep number="01" title="Notice" description="Slow down enough to see what is here." state="done" />
          <JourneyStep number="02" title="Listen" description="Make room before preparing an answer." state="current" />
          <JourneyStep number="03" title="Name" description="Speak needs without accusation." state="upcoming" />
          <JourneyStep number="04" title="Repair" description="Return with honesty and gentleness." state="upcoming" />
        </ol>
      </div>
      <section className="web-today-card"><div><p className="kicker moss">Today · 6 minutes</p><h2>Listen for what is underneath</h2><p>Ask one curious question before offering advice.</p></div><button className="secondary-button" onClick={onComplete}>{complete ? <CheckCircledIcon /> : <LightningBoltIcon />}{complete ? "Completed · +20 points" : "Mark today complete"}</button></section>
    </main>
  );
}

function WebsiteStudio({ published, onReview, onSignIn }: { published: boolean; onReview: () => void; onSignIn: () => void }) {
  return (
    <main className="web-page web-container" data-testid="studio-screen">
      <div className="web-page-intro"><p className="kicker mineral">Editorial studio</p><h1>Nothing publishes itself.</h1><p>AI can research, recommend, and draft. A human editor must approve every public change.</p></div>
      <div className="web-studio-grid">
        <section className="web-studio-panel"><div className="web-studio-title"><div><p className="kicker">Review queue</p><h2>Ready for a human</h2></div><span className="count-pill">2</span></div><article className="review-item"><div className="review-topline"><span className={published ? "status published" : "status review"}>{published ? "Published" : "In review"}</span><span>Story · 5 parts</span></div><h3>Learning to Stay</h3><p>Consent confirmed · Safety pass complete · Scripture citations checked</p><button className="primary-button clay" disabled={published} onClick={onReview}>{published ? <><CheckCircledIcon /> Published safely</> : <>Review and approve <ArrowRightIcon /></>}</button></article><article className="review-item compact"><div className="review-topline"><span className="status draft">Draft</span><span>Daily practice</span></div><h3>Repair without rushing</h3><p>Generated by Content Factory · Awaiting theology and safety review</p></article></section>
        <section className="web-studio-panel"><p className="kicker mineral">Four-agent desk</p><h2>Affordable by default</h2><div className="web-studio-banner"><LockClosedIcon /><p><strong>Approval gate active</strong><span>Draft → review → human approval → publish</span></p></div><AgentRow name="Story Intelligence" state="Weekly · queued" detail="Themes, risk flags, story insights" /><AgentRow name="Content Factory" state="Weekly · draft only" detail="Episodes, prompts, challenges" /><AgentRow name="Growth & Retention" state="Paused" detail="Experiments, never direct messages" /><AgentRow name="Chief Operator" state="Monthly · queued" detail="Health, costs, recommendations" /><button className="secondary-button web-studio-login" onClick={onSignIn}><PersonIcon /> Sign in as an editor</button></section>
      </div>
    </main>
  );
}

function WebsitePractice({ complete, onComplete, onDone }: { complete: boolean; onComplete: () => void; onDone: () => void }) {
  return (
    <main className="web-page web-practice" data-testid="practice-screen"><button className="web-back-button" onClick={onDone}><ArrowLeftIcon /> Back to Discover</button><div className="web-practice-card"><p className="kicker moss">Today · 6 minutes</p><h1>Listen for what is underneath</h1><p className="web-practice-lede">Presence grows when curiosity arrives before correction.</p><div className="web-practice-prompt"><span>01</span><p>Think of one conversation where you prepared your answer before the other person had finished.</p></div><blockquote>“Everyone should be quick to listen, slow to speak…”<cite>James 1:19 · NIV</cite></blockquote><button className="primary-button mineral-button" onClick={complete ? onDone : onComplete}>{complete ? <><CheckCircledIcon /> Done for today</> : <>Complete practice · +20 points</>}</button></div></main>
  );
}

function WebsiteSubmission({ sent, onSubmit, onDone }: { sent: boolean; onSubmit: () => void; onDone: () => void }) {
  const [consent, setConsent] = useState(false);

  if (sent) {
    return <main className="web-page web-submission-success" data-testid="submission-success"><CheckCircledIcon /><p className="kicker moss">Received safely</p><h1>Your story is still yours.</h1><p>An editor will review it privately. Nothing is public, and we will ask for explicit final consent before publication.</p><button className="primary-button clay" onClick={onDone}>Return home</button></main>;
  }

  return (
    <main className="web-page web-container web-submission-page"><div className="web-page-intro"><p className="kicker">Share your story</p><h1>Tell the truth at your own pace.</h1><p>Share only what feels safe. You can use a pen name, pause, or withdraw before publication.</p></div><form className="web-submission-form" data-testid="submission-form" onSubmit={(event) => { event.preventDefault(); if (consent) onSubmit(); }}><label htmlFor="web-story-title">Working title<input id="web-story-title" name="title" placeholder="A few words about your story" required /></label><label htmlFor="web-story-body">Your story<textarea id="web-story-body" name="body" placeholder="What happened, what changed, and what are you still learning?" rows={8} required /></label><label htmlFor="web-pen-name">Name to show editors<input id="web-pen-name" name="penName" placeholder="Real name or pen name" required /></label><label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I consent to private editorial review. This does not grant permission to publish.</span></label><div className="safety-callout"><LockClosedIcon /><p><strong>Private by default</strong>Publication requires separate, recorded approval from you and a human editor.</p></div><button className="primary-button clay" type="submit" disabled={!consent}>Send for private review</button></form></main>
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

function WebsiteTabBar({ active, onNavigate }: { active: WebsiteScreen; onNavigate: (screen: RootScreen) => void }) {
  const items = [
    { id: "home" as const, label: "Home", icon: <HomeIcon /> },
    { id: "stories" as const, label: "Stories", icon: <ReaderIcon /> },
    { id: "journey" as const, label: "Journey", icon: <SewingPinIcon /> },
    { id: "studio" as const, label: "Studio", icon: <DashboardIcon /> },
  ];
  return <nav className="web-tab-bar" aria-label="Mobile primary navigation">{items.map((item) => <button className={active === item.id ? "active" : undefined} key={item.id} onClick={() => onNavigate(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>;
}

function SiteFooter({ onNavigate }: { onNavigate: (screen: WebsiteScreen) => void }) {
  return (
    <footer className="web-footer"><div className="web-container web-footer-grid"><div><strong>THE WELL</strong><p>Stories for the chapters no one prepared you for.</p></div><nav aria-label="Footer navigation"><button onClick={() => onNavigate("home")}>Discover</button><button onClick={() => onNavigate("stories")}>Stories</button><button onClick={() => onNavigate("journey")}>Journeys</button></nav><p className="web-footer-note">Human-reviewed stories · Private by default · Faith without easy answers</p></div></footer>
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

function SubmissionScreen({ sent, onSubmit, onDone }: { sent: boolean; onSubmit: () => void; onDone: () => void }) {
  const [consent, setConsent] = useState(false);

  if (sent) {
    return (
      <MobileScroll className="app-screen well-screen">
        <main className="submission-success screen-content" data-testid="submission-success">
          <CheckCircledIcon />
          <p className="kicker moss">Received safely</p>
          <h1>Your story is still yours.</h1>
          <p>An editor will review it privately. Nothing is public, and we will ask for explicit final consent before publication.</p>
          <button className="primary-button clay" onClick={onDone}>Return home</button>
        </main>
      </MobileScroll>
    );
  }

  return (
    <MobileScroll className="app-screen well-screen">
      <form
        className="submission-form screen-content"
        data-testid="submission-form"
        onSubmit={(event) => { event.preventDefault(); if (consent) onSubmit(); }}
      >
        <p className="submission-intro">Share only what feels safe. You can use a pen name, pause, or withdraw before publication.</p>
        <label htmlFor="story-title">Working title</label>
        <KeyboardInput id="story-title" name="title" placeholder="A few words about your story" required />
        <label htmlFor="story-body">Your story</label>
        <KeyboardTextarea id="story-body" name="body" placeholder="What happened, what changed, and what are you still learning?" rows={8} required />
        <label htmlFor="pen-name">Name to show editors</label>
        <KeyboardInput id="pen-name" name="penName" placeholder="Real name or pen name" required />
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>I consent to private editorial review. This does not grant permission to publish.</span>
        </label>
        <div className="safety-callout"><LockClosedIcon /><p><strong>Private by default</strong>Publication requires a separate, recorded approval from you and a human editor.</p></div>
        <button className="primary-button clay" type="submit" disabled={!consent}>Send for private review</button>
      </form>
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
