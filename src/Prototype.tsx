import { useRef, useState, type FormEvent, type ReactNode } from "react";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/dm-serif-display/latin-400.css";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircledIcon,
  DashboardIcon,
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

const FEATURED_STORY_ID = "11111111-1111-4111-8111-111111111111";

const storyCards = [
  {
    eyebrow: "Repair after conflict",
    title: "Grace in the Quiet",
    detail: "3 parts · 18 min",
    image: "/assets/the-well/story-grace-in-the-quiet.png",
  },
  {
    eyebrow: "Faith through change",
    title: "The Middle of Becoming",
    detail: "4 parts · 24 min",
    image: "/assets/the-well/hero-learning-to-stay.png",
  },
  {
    eyebrow: "Honest intimacy",
    title: "What We Could Finally Say",
    detail: "2 parts · 12 min",
    image: "/assets/the-well/story-grace-in-the-quiet.png",
  },
];

export default function Prototype() {
  const [authOpen, setAuthOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [, setPracticeComplete] = useState(false);
  const [, setSubmissionSent] = useState(false);
  const [, setPublished] = useState(false);
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
            src="/assets/the-well/hero-learning-to-stay.png"
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
            <div className="progress-track" aria-label="Journey 43 percent complete">
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

function StoryReader() {
  return (
    <MobileScroll className="app-screen well-screen reader-screen">
      <article className="reader-content screen-content" data-testid="story-reader">
        <p className="kicker clay-text">Part 1 of 5 · 8 min read</p>
        <h1>The argument beneath the argument</h1>
        <p className="reader-deck">For years, Maya and Jordan thought conflict was proof they had chosen wrong. Then they learned to listen for the fear underneath the facts.</p>
        <img src="/assets/the-well/hero-learning-to-stay.png" alt="Maya and Jordan sitting together" draggable={false} />
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
