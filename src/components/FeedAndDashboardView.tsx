import { useEffect, useState } from "react";
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Flag,
  Plus,
  ShieldCheck,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  TrendingUp,
  Home,
  Film,
  Send,
  Radio,
  Sliders,
  Users,
  Ticket,
  Timer,
  EyeOff,
  PhoneCall,
  Play,
  Check,
  LayoutGrid,
  List,
  ExternalLink,
  Flame,
  LogIn,
} from "lucide-react";
import { SafeImage } from "./SafeImage";
import { MEDIA_ASSETS } from "../lib/mediaAssets";
import {
  COMMUNITY_PROJECTS,
  KIVORA_VS_BIGTECH_PILLARS,
  PROTECTION_QUICK_PILLARS,
} from "../lib/seedData";
import {
  YOUTH_SAFE_TOPICS,
  type BetaFocusTopic,
  type BetaPlatformInterest,
  type BetaPreregistrationInput,
  type BetaPreregistrationResult,
  type CivicTopic,
  type CommunityPost,
  type LiveStreamSummary,
  type PostComment,
  type StoryItem,
  type UserProfile,
  type SafetyReportRecord,
  type VideoReel,
} from "../types/kivora";

interface FeedAndDashboardViewProps {
  currentUser: UserProfile | null;
  idAustriaBpkHash: string;
  aiAvatarUrl: string;
  tiktokHandle: string;
  instagramHandle: string;
  onUpdateSocialHandles: (tt: string, ig: string) => void;
  posts: CommunityPost[];
  stories: StoryItem[];
  reels: VideoReel[];
  liveStreams: LiveStreamSummary[];
  commentsByPost: Record<string, PostComment[]>;
  betaCount: number;
  betaReceipt: BetaPreregistrationResult | null;
  onSubmitBetaPreregistration: (
    input: BetaPreregistrationInput
  ) => Promise<BetaPreregistrationResult>;
  onCreatePost: (input: {
    topic: CivicTopic;
    title: string;
    body: string;
    mediaUrl?: string;
    isAdultOnly: boolean;
    aiFactNote?: string;
  }) => Promise<void>;
  onCreateStory: (input: {
    topic: CivicTopic;
    headline: string;
    mediaUrl: string;
    isEphemeralSnap?: boolean;
    snapDurationSec?: number;
    snapFilterLabel?: string;
  }) => Promise<void>;
  onLikePost: (post: CommunityPost) => Promise<void>;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onOpenReportModal: (
    targetType: SafetyReportRecord["targetType"],
    targetId: string,
    targetTitle: string
  ) => void;
  onOpenIdAustriaModal: () => void;
  onSelectLiveStream: (streamId: string) => void;
  onSelectReel: (reelId: string) => void;
  onNavigateTab: (
    tab: "feed" | "studio" | "live" | "dating" | "chat" | "ai"
  ) => void;
}

const SAMPLE_MEDIA_CHOICES = [
  {
    label: "Jugendschutz & Digitale Sicherheit",
    url: MEDIA_ASSETS.youthProtection,
  },
  {
    label: "Blackout & Krisenvorsorge-Set",
    url: MEDIA_ASSETS.blackoutKit,
  },
  {
    label: "Tierschutz & Auffangstation",
    url: MEDIA_ASSETS.animalWelfare,
  },
  {
    label: "Frauen-, Männer- & Bürgerschutz",
    url: MEDIA_ASSETS.heroCivic,
  },
];

const CORE_PROTECTION_PILLARS: CivicTopic[] = [
  "Kinderschutz",
  "Tierschutz",
  "Frauenschutz",
  "Männerschutz",
];

const SNAP_FILTERS: { label: string; filterClass: string }[] = [
  { label: "Schutzschild Warm", filterClass: "brightness-105 contrast-110 saturate-110 sepia-[0.12]" },
  { label: "Warmes Tageslicht", filterClass: "brightness-105 contrast-105 saturate-125 sepia-[0.08]" },
  { label: "Klarblick Dokumentar", filterClass: "brightness-105 contrast-115 saturate-95" },
  { label: "Krisen-Kontrast Amber", filterClass: "brightness-95 contrast-125 saturate-110 sepia-[0.18]" },
];

function getFilterClassForSnap(label?: string): string {
  const found = SNAP_FILTERS.find((f) => f.label === label);
  return found ? found.filterClass : "";
}

export function FeedAndDashboardView({
  currentUser,
  idAustriaBpkHash,
  aiAvatarUrl,
  tiktokHandle,
  instagramHandle,
  onUpdateSocialHandles,
  posts,
  stories,
  reels,
  liveStreams,
  commentsByPost,
  betaCount,
  betaReceipt,
  onSubmitBetaPreregistration,
  onCreatePost,
  onCreateStory,
  onLikePost,
  onAddComment,
  onOpenReportModal,
  onOpenIdAustriaModal,
  onSelectLiveStream,
  onSelectReel,
  onNavigateTab,
}: FeedAndDashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<"Alle" | CivicTopic>(
    "Alle"
  );
  const [feedViewMode, setFeedViewMode] = useState<"timeline" | "explore">(
    "timeline"
  );
  const [editingChannels, setEditingChannels] = useState(false);
  const [draftTiktok, setDraftTiktok] = useState(tiktokHandle);
  const [draftInstagram, setDraftInstagram] = useState(instagramHandle);
  const [activePillarId, setActivePillarId] = useState<string>(
    KIVORA_VS_BIGTECH_PILLARS[0].id
  );
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [storyRemainingSec, setStoryRemainingSec] = useState<number>(8);
  const [storyExpired, setStoryExpired] = useState<boolean>(false);
  const [storyReplyText, setStoryReplyText] = useState<string>("");
  const [storyReplySent, setStoryReplySent] = useState<boolean>(false);

  const [showStoryComposer, setShowStoryComposer] = useState(false);
  const [storyMode, setStoryMode] = useState<"snap" | "story">("snap");
  const [snapDurationSec, setSnapDurationSec] = useState<number>(8);
  const [snapFilterLabel, setSnapFilterLabel] =
    useState<string>("Schutzschild Warm");
  const [storyTopic, setStoryTopic] = useState<CivicTopic>("Kinderschutz");
  const [storyHeadline, setStoryHeadline] = useState("");
  const [storyMediaUrl, setStoryMediaUrl] = useState<string>(
    MEDIA_ASSETS.youthProtection
  );
  const [savingStory, setSavingStory] = useState(false);

  // Post Composer state
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postTopic, setPostTopic] = useState<CivicTopic>("Kinderschutz");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState<string>(
    MEDIA_ASSETS.youthProtection
  );
  const [postIsAdult, setPostIsAdult] = useState(false);
  const [aiFactNote, setAiFactNote] = useState("");
  const [checkingFacts, setCheckingFacts] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Post Interactions state
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [heartFlashId, setHeartFlashId] = useState<string | null>(null);
  const [followedAuthors, setFollowedAuthors] = useState<
    Record<string, boolean>
  >({ ice_ragotti_official: true });
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(
    null
  );
  const [commentInput, setCommentInput] = useState("");
  const [shareFeedbackId, setShareFeedbackId] = useState<string | null>(null);

  // Right-rail ICE Ragotti KI Quick-Ask
  const [quickAiPrompt, setQuickAiPrompt] = useState("");
  const [quickAiReply, setQuickAiReply] = useState<string | null>(null);
  const [loadingQuickAi, setLoadingQuickAi] = useState(false);

  // Right-rail Beta Pre-Registration state
  const [betaName, setBetaName] = useState(currentUser?.displayName || "");
  const [betaEmail, setBetaEmail] = useState("");
  const [betaFocus, setBetaFocus] =
    useState<BetaFocusTopic>("Alle Schutzthemen");
  const [betaPlatform, setBetaPlatform] =
    useState<BetaPlatformInterest>("Alle Plattformen");
  const [betaDsgvoConsent, setBetaDsgvoConsent] = useState(false);
  const [submittingBeta, setSubmittingBeta] = useState(false);
  const [betaError, setBetaError] = useState<string | null>(null);

  // Age-gated 18+ state
  const isVerifiedAdult =
    currentUser?.ageGroup === "adult" && Boolean(idAustriaBpkHash);
  const [adultPosts, setAdultPosts] = useState<CommunityPost[]>([]);
  const [loadingAdult, setLoadingAdult] = useState(false);
  const [adultError, setAdultError] = useState<string | null>(null);

  const loadAdultPosts = async () => {
    if (!isVerifiedAdult) return;
    setLoadingAdult(true);
    setAdultError(null);
    try {
      const res = await fetch("/api/posts/adult", {
        headers: {
          "x-kivora-age-group": "adult",
          "x-kivora-bpk": idAustriaBpkHash,
        },
      });
      const data = (await res.json()) as {
        posts?: {
          id: string;
          authorId: string;
          authorName: string;
          authorHandle: string;
          topic: CivicTopic;
          title: string;
          body: string;
          createdAt: string;
          likesCount: number;
        }[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error || "18+ Bereich konnte nicht geladen werden."
        );
      }
      setAdultPosts(
        (data.posts || []).map((p) => ({
          id: p.id,
          authorId: p.authorId,
          authorName: p.authorName,
          authorHandle: p.authorHandle,
          authorVerified: "id_austria",
          topic: "18+ Debatte & Aufklärung",
          title: p.title,
          body: p.body,
          isAdultOnly: true,
          visibility: "public",
          likesCount: p.likesCount,
          commentsCount: 0,
          aiFactNote:
            "Streng getrennter 18+ Fachbereich (ID-Austria Altersprüfung aktiv).",
          createdAtLabel: "ID-Austria 18+ Verifiziert",
        }))
      );
    } catch (err) {
      setAdultError(
        err instanceof Error ? err.message : "Fehler beim Laden."
      );
    } finally {
      setLoadingAdult(false);
    }
  };

  const handleSelectTopic = (topic: "Alle" | CivicTopic) => {
    setSelectedTopic(topic);
    if (topic === "18+ Debatte & Aufklärung" && isVerifiedAdult) {
      loadAdultPosts();
    }
  };

  const handleRunFactCheck = async () => {
    if (!postTitle.trim() || !postBody.trim()) return;
    setCheckingFacts(true);
    setComposerError(null);
    try {
      const res = await fetch("/api/ai/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle.trim(),
          body: postBody.trim(),
          topic: postTopic,
        }),
      });
      const data = (await res.json()) as { factNote?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Faktencheck fehlgeschlagen");
      setAiFactNote(data.factNote || "");
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : "Faktencheck fehlgeschlagen"
      );
    } finally {
      setCheckingFacts(false);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenIdAustriaModal();
      return;
    }
    if (!postTitle.trim() || !postBody.trim()) {
      setComposerError("Bitte gib einen Titel und Beitragstext ein.");
      return;
    }
    const isAdultPost =
      postTopic === "18+ Debatte & Aufklärung" || postIsAdult;
    if (isAdultPost && !isVerifiedAdult) {
      setComposerError(
        "18+ Inhalte erfordern eine aktive ID-Austria Volljährigkeitsprüfung."
      );
      return;
    }

    setPublishingPost(true);
    setComposerError(null);
    try {
      if (isAdultPost) {
        const res = await fetch("/api/posts/adult", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kivora-age-group": "adult",
            "x-kivora-bpk": idAustriaBpkHash,
          },
          body: JSON.stringify({
            authorId: currentUser.uid,
            authorName: currentUser.displayName,
            authorHandle: `@${currentUser.handle}`,
            title: postTitle.trim(),
            body: postBody.trim(),
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok)
          throw new Error(data.error || "18+ Beitrag fehlgeschlagen");
        await loadAdultPosts();
      } else {
        await onCreatePost({
          topic: postTopic,
          title: postTitle.trim(),
          body: postBody.trim(),
          mediaUrl: postMediaUrl,
          isAdultOnly: false,
          aiFactNote: aiFactNote.trim() || undefined,
        });
      }
      setPostTitle("");
      setPostBody("");
      setAiFactNote("");
      setShowPostComposer(false);
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : "Veröffentlichung fehlgeschlagen"
      );
    } finally {
      setPublishingPost(false);
    }
  };

  // Live countdown timer when viewing an ephemeral Snapchat-style Snap or Story
  useEffect(() => {
    if (!activeStory) return;
    const totalSec = activeStory.snapDurationSec || 12;
    setStoryRemainingSec(totalSec);
    setStoryExpired(false);
    setStoryReplySent(false);
    setStoryReplyText("");

    const interval = window.setInterval(() => {
      setStoryRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          if (activeStory.isEphemeralSnap) {
            setStoryExpired(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeStory]);

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenIdAustriaModal();
      return;
    }
    if (!storyHeadline.trim()) return;
    setSavingStory(true);
    try {
      await onCreateStory({
        topic: storyTopic,
        headline: storyHeadline.trim(),
        mediaUrl: storyMediaUrl,
        isEphemeralSnap: storyMode === "snap",
        snapDurationSec: storyMode === "snap" ? snapDurationSec : undefined,
        snapFilterLabel,
      });
      setStoryHeadline("");
      setShowStoryComposer(false);
    } finally {
      setSavingStory(false);
    }
  };

  const handleQuickAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAiPrompt.trim() || loadingQuickAi) return;
    setLoadingQuickAi(true);
    try {
      const res = await fetch("/api/ai/ice-ragotti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "schutz",
          userAgeGroup: currentUser?.ageGroup || "minor",
          messages: [{ role: "user", text: quickAiPrompt.trim() }],
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setQuickAiReply(
        data.reply || data.error || "Keine Antwort erhalten."
      );
      setQuickAiPrompt("");
    } catch {
      setQuickAiReply("Verbindung zur ICE Ragotti KI fehlgeschlagen.");
    } finally {
      setLoadingQuickAi(false);
    }
  };

  const handleBetaFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaError(null);
    if (!betaDsgvoConsent) {
      setBetaError(
        "Bitte bestätige die DSGVO-Einwilligung für die Beta-Benachrichtigung."
      );
      return;
    }
    setSubmittingBeta(true);
    try {
      await onSubmitBetaPreregistration({
        displayName: betaName.trim() || currentUser?.displayName || "KIVORA Beta-Tester",
        email: betaEmail.trim(),
        focusTopic: betaFocus,
        platformInterest: betaPlatform,
        dsgvoConsent: true,
      });
    } catch (err) {
      setBetaError(
        err instanceof Error
          ? err.message
          : "Beta-Vorregistrierung fehlgeschlagen."
      );
    } finally {
      setSubmittingBeta(false);
    }
  };

  // Strictly separate youth-safe posts from 18+ posts
  const visiblePosts =
    selectedTopic === "18+ Debatte & Aufklärung"
      ? isVerifiedAdult
        ? adultPosts
        : []
      : posts
          .filter((p) => !p.isAdultOnly)
          .filter((p) =>
            selectedTopic === "Alle" ? true : p.topic === selectedTopic
          );

  const youthSafeStories = stories.filter((s) => !s.isAdultOnly);
  const visibleReels = reels
    .filter((r) => !r.isAdultOnly)
    .filter((r) =>
      selectedTopic === "Alle" || selectedTopic === "18+ Debatte & Aufklärung"
        ? true
        : r.topic === selectedTopic
    );
  const activeBigTechPillar =
    KIVORA_VS_BIGTECH_PILLARS.find((p) => p.id === activePillarId) ||
    KIVORA_VS_BIGTECH_PILLARS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT RAIL: Instagram / TikTok / Live Quick-Switch & 4 Core Protection Pillars */}
      <aside className="hidden lg:block lg:col-span-3 sticky top-20 space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="px-3 py-1.5 text-xs font-bold text-slate-400">
            Social-Modi & Live-Studios
          </div>
          {[
            { id: "feed", label: "Feed & Stories", icon: Home, active: true },
            { id: "live", label: "Livestream-Bühnen", icon: Radio, active: false },
            { id: "studio", label: "Reels (TikTok-Feed)", icon: Film, active: false },
            { id: "dating", label: "Dating & TikTok-Matches", icon: Flame, active: false },
            { id: "chat", label: "Messenger & Schutz", icon: Send, active: false },
            { id: "studio", label: "Video-Studio & Schnitt", icon: Sliders, active: false },
            { id: "ai", label: "ICE Ragotti KI", icon: Sparkles, active: false },
          ].map((nav, idx) => {
            const Icon = nav.icon;
            return (
              <button
                key={`${nav.id}_${idx}`}
                type="button"
                onClick={() =>
                  onNavigateTab(
                    nav.id as
                      | "feed"
                      | "studio"
                      | "live"
                      | "dating"
                      | "chat"
                      | "ai"
                  )
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  nav.active
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{nav.label}</span>
              </button>
            );
          })}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => onNavigateTab("live")}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity"
            >
              <Radio className="w-4 h-4" />
              <span>Jetzt Live streamen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenIdAustriaModal();
                } else {
                  setShowPostComposer((v) => !v);
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Neuer Beitrag</span>
            </button>
          </div>
        </div>

        {/* 4 Core Protection Pillars + Civic Topics Filter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="px-3 py-1.5 text-xs font-bold text-slate-400">
            Schutzsäulen & Themenkanäle
          </div>
          {(
            ["Alle", ...YOUTH_SAFE_TOPICS, "18+ Debatte & Aufklärung"] as const
          ).map((topic) => {
            const isAdultTab = topic === "18+ Debatte & Aufklärung";
            const isCorePillar = CORE_PROTECTION_PILLARS.includes(
              topic as CivicTopic
            );
            return (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopic(topic)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  selectedTopic === topic
                    ? isAdultTab
                      ? "bg-amber-600 text-white font-semibold"
                      : "bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold"
                    : isCorePillar
                    ? "font-semibold text-slate-800 dark:text-slate-100 hover:bg-rose-50/70 dark:hover:bg-rose-950/30"
                    : "font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className="truncate">{topic}</span>
                {isAdultTab && <Lock className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER COLUMN: Instagram Story Rings + Prominent Live-Streaming Stage + Feed Stream */}
      <div className="lg:col-span-6 space-y-5">
        {/* 1. Instagram Stories & Snapchat Kurzzeit-Snaps + Live-Stream Rings */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Instagram Stories, Snapchat Kurzzeit-Snaps & Live-Kanäle
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Selbstlösch-Timer & Live-Verbindung
            </span>
          </div>

          <div className="flex items-start gap-4 overflow-x-auto pb-1">
            {/* Add Your Story / Snap Ring */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenIdAustriaModal();
                } else {
                  setShowStoryComposer((v) => !v);
                }
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 w-20 min-h-[44px] group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-rose-500 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-600 group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                Snap / Story
              </span>
            </button>

            {/* Live Stream Rings (Direct Entry into Live Broadcast) */}
            {liveStreams.slice(0, 2).map((stream) => (
              <button
                key={stream.streamId}
                type="button"
                onClick={() => {
                  onSelectLiveStream(stream.streamId);
                  onNavigateTab("live");
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 w-20 min-h-[44px] group"
              >
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full p-0.5 bg-white dark:bg-slate-900 overflow-hidden">
                    <SafeImage
                      src={
                        stream.topic === "Tierschutz"
                          ? MEDIA_ASSETS.animalWelfare
                          : stream.topic === "Frauenschutz"
                          ? MEDIA_ASSETS.heroCivic
                          : MEDIA_ASSETS.youthProtection
                      }
                      alt={stream.topic}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 truncate w-full text-center">
                  LIVE · {stream.topic}
                </span>
              </button>
            ))}

            {youthSafeStories.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-20 min-h-[44px] group"
              >
                <div
                  className={`w-16 h-16 rounded-full p-0.5 group-hover:scale-105 transition-transform ${
                    story.isEphemeralSnap
                      ? "bg-gradient-to-tr from-amber-400 via-yellow-500 to-rose-600"
                      : "bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600"
                  }`}
                >
                  <div className="w-full h-full rounded-full p-0.5 bg-white dark:bg-slate-900 overflow-hidden">
                    <SafeImage
                      src={story.mediaUrl}
                      alt={story.authorName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                  {story.isEphemeralSnap
                    ? `${story.snapDurationSec || 8}s · ${story.authorName}`
                    : story.authorName}
                </span>
              </button>
            ))}
          </div>

          {showStoryComposer && (
            <form
              onSubmit={handlePublishStory}
              className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStoryMode("snap")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                      storyMode === "snap"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Snapchat Kurzzeit-Snap
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryMode("story")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                      storyMode === "story"
                        ? "bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Instagram 24h Story
                  </button>
                </div>

                {storyMode === "snap" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Timer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <select
                      value={snapDurationSec}
                      onChange={(e) =>
                        setSnapDurationSec(Number(e.target.value))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums"
                    >
                      <option value={5}>5 Sek. Selbstlöschung</option>
                      <option value={8}>8 Sek. Selbstlöschung</option>
                      <option value={15}>15 Sek. Selbstlöschung</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={storyTopic}
                  onChange={(e) => setStoryTopic(e.target.value as CivicTopic)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                >
                  {YOUTH_SAFE_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={storyMediaUrl}
                  onChange={(e) => setStoryMediaUrl(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                >
                  {SAMPLE_MEDIA_CHOICES.map((m) => (
                    <option key={m.label} value={m.url}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={snapFilterLabel}
                  onChange={(e) => setSnapFilterLabel(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                >
                  {SNAP_FILTERS.map((f) => (
                    <option key={f.label} value={f.label}>
                      Filter: {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={160}
                  value={storyHeadline}
                  onChange={(e) => setStoryHeadline(e.target.value)}
                  placeholder={
                    storyMode === "snap"
                      ? "Snap-Text (verschwindet nach Ablauf automatisch)..."
                      : "Story-Schlagzeile (z.B. Kinderschutz-Workshop heute 18 Uhr)..."
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  required
                />
                <button
                  type="submit"
                  disabled={savingStory}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold shrink-0 min-h-[40px]"
                >
                  {savingStory
                    ? "..."
                    : storyMode === "snap"
                    ? "Snap senden"
                    : "Story posten"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 1b. KIVORA vs. Big Tech: Warum sich diese Plattform bewusst abhebt */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Souveräne Architektur statt Big-Tech-Algorithmus
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Warum KIVORA sich grundlegend von herkömmlichen Tech-Plattformen abhebt
              </h2>
            </div>
            <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {activeBigTechPillar.metricLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {KIVORA_VS_BIGTECH_PILLARS.map((pillar) => (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActivePillarId(pillar.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px] transition-colors ${
                  activePillarId === pillar.id
                    ? "bg-slate-900 dark:bg-rose-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {pillar.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 space-y-1.5">
              <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>KIVORA Prinzip: {activeBigTechPillar.headline}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeBigTechPillar.kivoraGuarantee}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Unterschied zu Big-Tech-Netzwerken
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeBigTechPillar.bigTechContrast}
              </p>
            </div>
          </div>

          {/* 4-Column Quick Protection Pillar & Direct Hotline Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {PROTECTION_QUICK_PILLARS.map((item) => (
              <div
                key={item.topic}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-950/70 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => handleSelectTopic(item.topic)}
                  className="text-left min-w-0 flex-1 min-h-[40px]"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:text-rose-600">
                    {item.topic}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.summary}
                  </div>
                </button>
                <a
                  href={item.telHref}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono tabular-nums text-[11px] font-semibold shrink-0 flex items-center gap-1 hover:bg-rose-100"
                >
                  <PhoneCall className="w-3 h-3 shrink-0" />
                  <span>{item.hotlineLabel.split(":")[1]?.trim()}</span>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* 1c. TikTok-Format 9:16 Reels Preview Strip & Creator Reach Bridge */}
        {visibleReels.length > 0 && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-rose-600" />
                  <span>TikTok-Format Reels & Instagram Kurzvideos (9:16)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kinderschutz, Frauenschutz, Männerschutz, Tierschutz & KI-Hook-Studio
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("studio")}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 shrink-0 min-h-[36px]"
              >
                <span>Reels & Hook-Studio</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3.5 overflow-x-auto pb-1">
              {visibleReels.slice(0, 5).map((reel) => (
                <button
                  key={reel.id}
                  type="button"
                  onClick={() => onSelectReel(reel.id)}
                  className="w-36 sm:w-40 shrink-0 text-left group space-y-2"
                >
                  <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {reel.videoUrl ? (
                      <video
                        src={reel.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <SafeImage
                        src={reel.coverUrl}
                        alt={reel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-white/90">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          {reel.likesCount}
                        </span>
                        <span className="w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </span>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-rose-300 truncate">
                          #{reel.topic.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")}
                        </div>
                        <div className="text-xs font-bold text-white line-clamp-2 leading-snug mt-0.5">
                          {reel.title}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-mono tabular-nums">
                    {reel.durationLabel || "0:45"} · {reel.authorName}
                  </div>
                </button>
              ))}
            </div>

            {/* Creator TikTok & Instagram Reach Bridge Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Creator-Kanäle:
                  </span>
                  <a
                    href={`https://www.tiktok.com/${
                      tiktokHandle.startsWith("@") ? tiktokHandle : `@${tiktokHandle}`
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>TikTok {tiktokHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <a
                    href={`https://www.instagram.com/${instagramHandle.replace(
                      /^@/,
                      ""
                    )}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Instagram {instagramHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTiktok(tiktokHandle);
                      setDraftInstagram(instagramHandle);
                      setEditingChannels((v) => !v);
                    }}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600"
                  >
                    {editingChannels ? "Fertig" : "Kanäle ändern"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("studio")}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:opacity-90"
                  >
                    KI-Hooks erstellen
                  </button>
                </div>
              </div>

              {editingChannels && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateSocialHandles(draftTiktok, draftInstagram);
                    setEditingChannels(false);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={draftTiktok}
                    onChange={(e) => setDraftTiktok(e.target.value)}
                    placeholder="TikTok @handle"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                  <input
                    type="text"
                    value={draftInstagram}
                    onChange={(e) => setDraftInstagram(e.target.value)}
                    placeholder="Instagram @handle"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                  >
                    Speichern
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* 2. Prominent Live-Streaming Hub & 4 Core Protection Pillars */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Kinderschutz · Tierschutz · Frauenschutz · Männerschutz
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Aktive Schutz-Livestreams & Gemeinschaftsbühne
              </h1>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("live")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 hover:opacity-95"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Eigenen Livestream starten</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {liveStreams.map((stream) => (
              <div
                key={stream.streamId}
                className="py-3 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      LIVE · {stream.topic}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{stream.hostName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {stream.viewerCount.toLocaleString("de-AT")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {stream.title}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectLiveStream(stream.streamId);
                    onNavigateTab("live");
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/60 shrink-0"
                >
                  Live ansehen
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Mobile/Tablet Topic Filter Chips & Create Button */}
        <div className="lg:hidden flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            {(
              [
                "Alle",
                ...YOUTH_SAFE_TOPICS,
                "18+ Debatte & Aufklärung",
              ] as const
            ).map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopic(topic)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  selectedTopic === topic
                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              currentUser
                ? setShowPostComposer((v) => !v)
                : onOpenIdAustriaModal()
            }
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shrink-0"
          >
            + Beitrag
          </button>
        </div>

        {/* Post Composer Drawer */}
        {showPostComposer && (
          <form
            onSubmit={handlePublishPost}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Neuen Beitrag im Feed teilen
              </h3>
              <button
                type="button"
                onClick={() => setShowPostComposer(false)}
                className="text-xs text-slate-500"
              >
                Schließen
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={postTopic}
                onChange={(e) => {
                  const val = e.target.value as CivicTopic;
                  setPostTopic(val);
                  setPostIsAdult(val === "18+ Debatte & Aufklärung");
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {YOUTH_SAFE_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="18+ Debatte & Aufklärung">
                  18+ Debatte & Aufklärung (Nur ID-Austria 18+)
                </option>
              </select>

              <select
                value={postMediaUrl}
                onChange={(e) => setPostMediaUrl(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {SAMPLE_MEDIA_CHOICES.map((m) => (
                  <option key={m.label} value={m.url}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              maxLength={140}
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Schlagzeile / Thema deines Beitrags..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              required
            />

            <textarea
              rows={3}
              maxLength={3000}
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              placeholder="Teile fundierte Informationen, Schutzhinweise oder Projektfortschritte..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              required
            />

            {aiFactNote && (
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
                <SafeImage
                  src={aiAvatarUrl}
                  alt="ICE Ragotti KI"
                  className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div>
                  <span className="font-semibold">
                    ICE Ragotti KI-Faktencheck:{" "}
                  </span>
                  {aiFactNote}
                </div>
              </div>
            )}

            {composerError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {composerError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRunFactCheck}
                disabled={
                  checkingFacts || !postTitle.trim() || !postBody.trim()
                }
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {checkingFacts
                    ? "KI prüft..."
                    : "ICE Ragotti KI-Faktencheck"}
                </span>
              </button>

              <button
                type="submit"
                disabled={publishingPost}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {publishingPost ? "Veröffentlicht..." : "Veröffentlichen"}
              </button>
            </div>
          </form>
        )}

        {/* Strict 18+ Jugendschutz Gate Notice */}
        {selectedTopic === "18+ Debatte & Aufklärung" && !isVerifiedAdult && (
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-8 text-center">
            <Lock className="w-9 h-9 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Strikter Jugendschutz: 18+ Bereich gesperrt
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Minderjährige dürfen auf KIVORA keine 18+ Inhalte sehen. Dieser
              Bereich ist technisch getrennt und wird erst nach ID-Austria
              Volljährigkeitsprüfung freigeschaltet.
            </p>
            <button
              type="button"
              onClick={onOpenIdAustriaModal}
              className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold"
            >
              Mit ID-Austria Alter (18+) verifizieren
            </button>
          </div>
        )}

        {selectedTopic === "18+ Debatte & Aufklärung" && isVerifiedAdult && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ID-Austria 18+ Verifikation aktiv
            </span>
            {loadingAdult && <span>Lade 18+ Beiträge...</span>}
          </div>
        )}

        {adultError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-700">
            {adultError}
          </div>
        )}

        {/* 3. Instagram-Style Visual Feed Cards vs. 3x3 Entdecken-Raster */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFeedViewMode("timeline")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[36px] transition-colors ${
                feedViewMode === "timeline"
                  ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Instagram Feed</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedViewMode("explore")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[36px] transition-colors ${
                feedViewMode === "explore"
                  ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Entdecken-Raster</span>
            </button>
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {selectedTopic} · {visiblePosts.length} Beiträge
          </div>
        </div>

        {feedViewMode === "explore" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visiblePosts.map((post) => {
              const isLiked = Boolean(likedIds[post.id]);
              const postComments = commentsByPost[post.id] || [];
              const displayLikes = post.likesCount + (isLiked ? 1 : 0);
              const displayComments = post.commentsCount + postComments.length;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setOpenCommentsPostId(post.id);
                    setFeedViewMode("timeline");
                  }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 text-left"
                >
                  <SafeImage
                    src={post.mediaUrl || MEDIA_ASSETS.youthProtection}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent p-3 flex flex-col justify-between">
                    <div className="text-[10px] font-semibold text-rose-300 truncate">
                      #{post.topic.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {post.title}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-white/90 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          {displayLikes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {displayComments}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {visiblePosts.map((post) => {
              const isLiked = Boolean(likedIds[post.id]);
              const isSaved = Boolean(savedIds[post.id]);
              const postComments = commentsByPost[post.id] || [];
              const displayLikes = post.likesCount + (isLiked ? 1 : 0);
              const displayComments = post.commentsCount + postComments.length;

              return (
                <article
                  key={post.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  {/* Instagram-Style Author Header */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 shrink-0">
                        <SafeImage
                          src={MEDIA_ASSETS.avatarIceRagotti}
                          alt={post.authorName}
                          className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {post.authorName}
                          </span>
                          {post.authorVerified !== "none" && (
                            <ShieldCheck
                              className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
                              aria-label="Verifiziert"
                            />
                          )}
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate">
                            {post.createdAtLabel}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 truncate flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectTopic(post.topic)}
                            className="hover:underline"
                          >
                            #{post.topic.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")}
                          </button>
                          <span aria-hidden="true">·</span>
                          <span>{post.authorHandle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFollowedAuthors((prev) => ({
                            ...prev,
                            [post.authorId]: !prev[post.authorId],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] flex items-center gap-1 transition-colors ${
                          followedAuthors[post.authorId]
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                        }`}
                      >
                        {followedAuthors[post.authorId] ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Gefolgt</span>
                          </>
                        ) : (
                          <span>Folgen</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenReportModal("post", post.id, post.title)
                        }
                        className="text-xs font-medium text-slate-400 hover:text-rose-600 px-2.5 py-1.5 rounded-lg min-h-[36px] flex items-center gap-1 shrink-0"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Melden</span>
                      </button>
                    </div>
                  </div>

                  {/* Edge-to-Edge Visual Media (Double-Click to Like like Instagram) */}
                  {post.mediaUrl && (
                    <div
                      onDoubleClick={() => {
                        setHeartFlashId(post.id);
                        window.setTimeout(() => setHeartFlashId(null), 700);
                        if (!isLiked) {
                          setLikedIds((prev) => ({
                            ...prev,
                            [post.id]: true,
                          }));
                          onLikePost(post);
                        }
                      }}
                      className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-950 cursor-pointer select-none"
                    >
                      <SafeImage
                        src={post.mediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      {heartFlashId === post.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <Heart className="w-16 h-16 text-white fill-rose-600 drop-shadow-lg scale-125 transition-transform duration-200" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instagram Action Row */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isLiked) {
                              setLikedIds((prev) => ({
                                ...prev,
                                [post.id]: true,
                              }));
                              onLikePost(post);
                            }
                          }}
                          className={`flex items-center gap-1.5 text-xs font-semibold ${
                            isLiked
                              ? "text-rose-600"
                              : "text-slate-700 dark:text-slate-300 hover:text-rose-600"
                          }`}
                        >
                          <Heart
                            className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
                          />
                          <span className="font-mono tabular-nums">
                            {displayLikes}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentsPostId((curr) =>
                              curr === post.id ? null : post.id
                            )
                          }
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600"
                        >
                          <MessageSquare className="w-5 h-5" />
                          <span className="font-mono tabular-nums">
                            {displayComments}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(window.location.href)
                              .catch(() => {});
                            setShareFeedbackId(post.id);
                            setTimeout(() => setShareFeedbackId(null), 2000);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-rose-600"
                        >
                          <Share2 className="w-5 h-5" />
                          {shareFeedbackId === post.id && (
                            <span className="text-[11px] text-emerald-600">
                              Kopiert
                            </span>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSavedIds((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className={`p-1 ${
                          isSaved
                            ? "text-rose-600"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                        aria-label="Speichern"
                      >
                        <Bookmark
                          className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Caption & Narrative */}
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {post.body}
                      </p>
                    </div>

                    {/* ICE Ragotti KI Context Box with Dedicated KI Portrait */}
                    {post.aiFactNote && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <SafeImage
                          src={aiAvatarUrl}
                          alt="ICE Ragotti KI"
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            ICE Ragotti KI-Kontext:{" "}
                          </span>
                          {post.aiFactNote}
                        </div>
                      </div>
                    )}

                    {/* Inline Comments Section */}
                    {openCommentsPostId === post.id && (
                      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                        {postComments.map((c) => (
                          <div key={c.id} className="text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {c.authorName}
                            </span>{" "}
                            <span className="text-slate-700 dark:text-slate-300">
                              {c.text}
                            </span>
                            <span className="text-slate-400 ml-1.5">
                              · {c.createdAtLabel}
                            </span>
                          </div>
                        ))}

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!currentUser) {
                              onOpenIdAustriaModal();
                              return;
                            }
                            if (!commentInput.trim()) return;
                            const text = commentInput.trim();
                            setCommentInput("");
                            await onAddComment(post.id, text);
                          }}
                          className="flex gap-2 pt-1"
                        >
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Kommentar hinzufügen..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                          >
                            Posten
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT RAIL: Website Login + ICE Ragotti KI + Beta-Vorregistrierung + Mehrwert-Projekte */}
      <aside className="lg:col-span-3 sticky top-20 space-y-5">
        {/* 0. Website Anmeldung & ID-Austria Konto-Status */}
        {!currentUser ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 flex items-center justify-center text-white shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  KIVORA Website-Anmeldung
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kostenloses DSGVO- & ID-Austria Konto
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Melde dich direkt auf dieser Website an, um im Echtzeit-Livestream zu
              chatten, Tinder/TikTok-Matches zu starten und Beiträge zu teilen.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenIdAustriaModal}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold hover:opacity-95"
              >
                Anmelden / Registrieren
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("live")}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-rose-500"
              >
                Zum Live-Chat
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUser.displayName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                @{currentUser.handle} ·{" "}
                {currentUser.idAustriaVerified
                  ? currentUser.ageGroup === "adult"
                    ? "18+ ID-Austria"
                    : "<18 Jugendschutz"
                  : "Standardkonto"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("dating")}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-semibold shrink-0"
            >
              Dating (18+)
            </button>
          </div>
        )}

        {/* 1. ICE Ragotti KI Co-Pilot Card with Dedicated Portrait */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 shrink-0">
              <SafeImage
                src={aiAvatarUrl}
                alt="ICE Ragotti KI"
                className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ICE Ragotti KI
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Schutz- & Aufklärungs-Assistent
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickAiSubmit} className="space-y-2">
            <input
              type="text"
              value={quickAiPrompt}
              onChange={(e) => setQuickAiPrompt(e.target.value)}
              placeholder="Frag die ICE Ragotti KI..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="submit"
                disabled={loadingQuickAi || !quickAiPrompt.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {loadingQuickAi ? "Analysiert..." : "Direkt fragen"}
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("ai")}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span>Vollansicht & Bild</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {quickAiReply && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-h-40 overflow-y-auto">
              {quickAiReply}
            </div>
          )}
        </div>

        {/* 2. DSGVO-konforme Beta-Vorregistrierung (Early-Access Warteliste) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-rose-600" />
                <span>Beta-Vorregistrierung</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Für KIVORA Beta-App (iOS, Android & Web) vormerken
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
              {betaCount.toLocaleString("de-AT")} Plätze
            </span>
          </div>

          {betaReceipt ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-xs">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Beta-Platz DSGVO-konform reserviert</span>
              </div>
              <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                Ticket: {betaReceipt.ticketCode}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Fokus: {betaReceipt.focusTopic} · {betaReceipt.platformInterest}
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaFormSubmit} className="space-y-2.5">
              <input
                type="text"
                required
                value={betaName}
                onChange={(e) => setBetaName(e.target.value)}
                placeholder="Name oder Pseudonym..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <input
                type="email"
                required
                value={betaEmail}
                onChange={(e) => setBetaEmail(e.target.value)}
                placeholder="E-Mail für Beta-Einladung..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={betaFocus}
                  onChange={(e) =>
                    setBetaFocus(e.target.value as BetaFocusTopic)
                  }
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px]"
                >
                  <option value="Alle Schutzthemen">Alle Schutzthemen</option>
                  <option value="Kinderschutz">Kinderschutz</option>
                  <option value="Tierschutz">Tierschutz</option>
                  <option value="Frauenschutz">Frauenschutz</option>
                  <option value="Männerschutz">Männerschutz</option>
                </select>
                <select
                  value={betaPlatform}
                  onChange={(e) =>
                    setBetaPlatform(e.target.value as BetaPlatformInterest)
                  }
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px]"
                >
                  <option value="Alle Plattformen">Alle Geräte</option>
                  <option value="iOS">iOS Beta</option>
                  <option value="Android">Android Beta</option>
                  <option value="Web & PWA">Web & PWA</option>
                </select>
              </div>

              <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={betaDsgvoConsent}
                  onChange={(e) => setBetaDsgvoConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-rose-600 shrink-0"
                />
                <span>
                  Ich willige gemäß Art. 6 DSGVO in die Speicherung meiner
                  E-Mail für den Beta-Zugang ein (jederzeit widerrufbar).
                </span>
              </label>

              {betaError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  {betaError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingBeta}
                className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {submittingBeta
                  ? "Wird gespeichert..."
                  : "Für Beta vorregistrieren"}
              </button>
            </form>
          )}
        </div>

        {/* 3. Civic Mehrwert: Gemeinschaftliche Schutz- & Vorsorgeprojekte */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span>KIVORA Schutzprojekte</span>
            </h2>
          </div>

          <div className="space-y-3.5">
            {COMMUNITY_PROJECTS.map((proj) => (
              <div key={proj.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {proj.title}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-rose-600 shrink-0">
                    {proj.progressPct} %
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500"
                    style={{ width: `${proj.progressPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {proj.topic} · {proj.targetLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Fullscreen Vertical 9:16 Instagram Story & Snapchat Ephemeral Snap Viewer */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Multi-Segment Story Progress Bar */}
            <div className="px-4 pt-3 flex items-center gap-1.5">
              {youthSafeStories.map((st, idx) => {
                const currentIdx = youthSafeStories.findIndex(
                  (x) => x.id === activeStory.id
                );
                const total = activeStory.snapDurationSec || 12;
                const pct =
                  idx < currentIdx
                    ? 100
                    : idx > currentIdx
                    ? 0
                    : storyExpired
                    ? 100
                    : Math.min(
                        100,
                        Math.round(((total - storyRemainingSec) / total) * 100)
                      );
                return (
                  <div
                    key={st.id}
                    className="h-1 flex-1 rounded-full bg-slate-700 overflow-hidden"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-xs text-slate-300 min-w-0">
                <SafeImage
                  src={activeStory.mediaUrl}
                  alt={activeStory.authorName}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="truncate">
                  <span className="font-bold text-white">
                    {activeStory.authorName}
                  </span>{" "}
                  ·{" "}
                  <span className="font-mono tabular-nums text-amber-300">
                    {activeStory.isEphemeralSnap
                      ? storyExpired
                        ? "Snap abgelaufen"
                        : `${storyRemainingSec}s Selbstlöschung`
                      : activeStory.createdAtLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStory(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Story schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-[9/16] max-h-[72vh] w-full bg-slate-950">
              {storyExpired ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <EyeOff className="w-10 h-10 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Kurzzeit-Snap automatisch gelöscht
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Wie bei Snapchat wurde dieser{" "}
                    {activeStory.snapDurationSec || 8}-Sekunden-Snap nach dem
                    Ansehen DSGVO-konform aus dem aktiven Speicher entfernt.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStoryExpired(false);
                      setStoryRemainingSec(activeStory.snapDurationSec || 8);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold min-h-[40px]"
                  >
                    1x erneut ansehen
                  </button>
                </div>
              ) : (
                <>
                  <SafeImage
                    src={activeStory.mediaUrl}
                    alt={activeStory.headline}
                    className={`w-full h-full object-cover ${getFilterClassForSnap(
                      activeStory.snapFilterLabel
                    )}`}
                  />

                  {/* Top Filter & Privacy Shield Indicator */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 pointer-events-none">
                    <span className="font-medium drop-shadow">
                      {activeStory.snapFilterLabel
                        ? `Filter: ${activeStory.snapFilterLabel}`
                        : activeStory.topic}
                    </span>
                    <span className="font-mono drop-shadow">
                      Screenshot-Schutz aktiv
                    </span>
                  </div>

                  {/* Snapchat-Style Centered Caption Bar & Bottom Reply */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-5 flex flex-col justify-end space-y-3">
                    <div className="p-3 rounded-xl bg-black/65 backdrop-blur-sm text-center">
                      <div className="text-[11px] font-semibold text-rose-300 mb-0.5">
                        {activeStory.topic}
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">
                        {activeStory.headline}
                      </p>
                    </div>

                    {/* Quick Private E2EE Reply (Instagram / Snapchat Style) */}
                    {storyReplySent ? (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200 text-center">
                        Verschlüsselte Antwort (AES-256) an{" "}
                        {activeStory.authorName} gesendet
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!storyReplyText.trim()) return;
                          setStoryReplySent(true);
                          setStoryReplyText("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={storyReplyText}
                          onChange={(e) => setStoryReplyText(e.target.value)}
                          placeholder={`Privat an ${activeStory.authorName} antworten...`}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-xs text-white placeholder:text-slate-300 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-2.5 rounded-xl bg-rose-600 text-white min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label="Antwort senden"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const target = activeStory;
                          setActiveStory(null);
                          onOpenReportModal("post", target.id, target.headline);
                        }}
                        className="text-xs text-rose-300 hover:underline flex items-center gap-1 min-h-[36px]"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Melden</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {youthSafeStories.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = youthSafeStories.findIndex(
                                  (x) => x.id === activeStory.id
                                );
                                const prevIdx =
                                  (idx - 1 + youthSafeStories.length) %
                                  youthSafeStories.length;
                                setActiveStory(youthSafeStories[prevIdx]);
                              }}
                              className="p-2 rounded-xl bg-white/15 text-white min-w-[36px] min-h-[36px] flex items-center justify-center"
                              aria-label="Vorherige Story"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = youthSafeStories.findIndex(
                                  (x) => x.id === activeStory.id
                                );
                                const nextIdx =
                                  (idx + 1) % youthSafeStories.length;
                                setActiveStory(youthSafeStories[nextIdx]);
                              }}
                              className="p-2 rounded-xl bg-white/15 text-white min-w-[36px] min-h-[36px] flex items-center justify-center"
                              aria-label="Nächste Story"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveStory(null)}
                          className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold min-h-[36px]"
                        >
                          Schließen
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
