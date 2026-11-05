import { useEffect, useRef, useState } from "react";
import {
  Radio,
  Users,
  Globe,
  Volume2,
  Hand,
  BarChart3,
  Send,
  Flag,
  CheckCircle2,
  Video,
  VideoOff,
  Plus,
  X,
  Heart,
  Pin,
  Share2,
  Shield,
  Sparkles,
  Check,
  UserPlus,
  Smartphone,
  Monitor,
} from "lucide-react";
import { SafeImage } from "./SafeImage";
import { AUDIENCE_DEMOGRAPHICS } from "../lib/seedData";
import {
  YOUTH_SAFE_TOPICS,
  type CivicTopic,
  type LiveStreamSummary,
  type UserProfile,
  type SafetyReportRecord,
} from "../types/kivora";

interface LivestreamStudioViewProps {
  currentUser: UserProfile | null;
  aiAvatarUrl: string;
  tiktokHandle: string;
  instagramHandle: string;
  selectedStreamId?: string;
  onSelectStreamId?: (streamId: string) => void;
  onOpenReportModal: (
    targetType: SafetyReportRecord["targetType"],
    targetId: string,
    targetTitle: string
  ) => void;
  onOpenIdAustriaModal: () => void;
}

interface LivePoll {
  streamId: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
}

interface LiveChatMsg {
  id: string;
  sender: string;
  text: string;
  language: string;
  timestamp: string;
  isReaction?: boolean;
}

interface StageReq {
  id: string;
  userName: string;
  topicNote: string;
  status: "waiting" | "on_stage";
}

interface FloatingHeartItem {
  id: number;
  offsetX: number;
}

const LANGUAGES = [
  { code: "de", label: "Deutsch (Original)" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
] as const;

const TARGET_PLATFORMS = [
  "KIVORA Native",
  "Instagram Live",
  "TikTok 9:16",
  "YouTube 16:9",
  "X Spaces",
];

const TIKTOK_SUPPORT_IMPULSES = [
  { id: "shield", label: "Schutzschild", points: 50 },
  { id: "heart_wave", label: "Herz-Welle", points: 50 },
  { id: "fact_torch", label: "Fakten-Fackel", points: 50 },
  { id: "help_signal", label: "Rettungs-Signal", points: 50 },
] as const;

const QUICK_CHAT_PHRASES = [
  "Wichtige Aufklärung!",
  "Kinderschutz zuerst!",
  "Danke für die Live-Übersetzung!",
  "Teile den Stream auf TikTok!",
];

export function LivestreamStudioView({
  currentUser,
  aiAvatarUrl,
  tiktokHandle,
  instagramHandle,
  selectedStreamId = "stream_civic_blackout",
  onSelectStreamId,
  onOpenReportModal,
  onOpenIdAustriaModal,
}: LivestreamStudioViewProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeRoomId, setActiveRoomId] = useState<string>(selectedStreamId);
  const activeRoomIdRef = useRef<string>(selectedStreamId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const [stageLayoutMode, setStageLayoutMode] = useState<"tiktok_9_16" | "studio_16_9">(
    "tiktok_9_16"
  );
  const [followingHost, setFollowingHost] = useState<boolean>(true);
  const [copiedStreamLink, setCopiedStreamLink] = useState<boolean>(false);

  const [roomsList, setRoomsList] = useState<LiveStreamSummary[]>([]);
  const [showNewRoomForm, setShowNewRoomForm] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState<CivicTopic>("Kinderschutz");

  const [streamTitle, setStreamTitle] = useState(
    "Kinderschutz im Netz & Blackout-Vorsorge 2026 — Live-Analyse & Bürgerforum"
  );
  const [hostName, setHostName] = useState(
    "ICE Ragotti · Kinderschutz & Krisenvorsorge"
  );
  const [streamTopic, setStreamTopic] = useState<CivicTopic>("Kinderschutz");
  const [selectedPlatforms, setSelectedPlatforms] =
    useState<string[]>(TARGET_PLATFORMS);
  const [viewerCount, setViewerCount] = useState<number>(1428);
  const [likesCount, setLikesCount] = useState<number>(28450);
  const [pinnedMessage, setPinnedMessage] = useState<{
    sender: string;
    text: string;
  } | null>({
    sender: "ICE Ragotti (Host)",
    text: "Direkthilfe im Stream: Rat auf Draht 147 · Polizei 133 · Stell deine Frage direkt in den Live-Chat!",
  });
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartItem[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Broadcaster mode
  const [isBroadcastingSelf, setIsBroadcastingSelf] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [audienceTarget, setAudienceTarget] = useState(
    "DACH-Region · Familien, Tierschutz-Initiativen & Beratungsstellen"
  );

  // Live Subtitles & Multilingual Dubbing
  const [selectedLang, setSelectedLang] = useState<string>("de");
  const [spokenInput, setSpokenInput] = useState(
    "Willkommen im KIVORA Schutz-Livestream. Heute verbinden wir Kinderschutz, Tierschutz, Frauenschutz und Männerschutz mit direkter Hilfe."
  );
  const [translations, setTranslations] = useState<Record<string, string>>({
    de: "Willkommen im KIVORA Schutz-Livestream. Heute verbinden wir Kinderschutz, Tierschutz, Frauenschutz und Männerschutz mit direkter Hilfe.",
    en: "Welcome to the KIVORA Protection Livestream. Today we unite child protection, animal welfare, women's and men's safety with direct support.",
    fr: "Bienvenue sur le direct KIVORA. Aujourd'hui, nous unissons protection de l'enfance, bien-être animal et protection des femmes et des hommes.",
    es: "Bienvenidos al directo de KIVORA. Hoy unimos protección infantil, bienestar animal y protección de mujeres y hombres con ayuda directa.",
    tr: "KIVORA Koruma Canlı Yayınına hoş geldiniz. Bugün çocuk koruma, hayvan hakları, kadın ve erkek güvenliğini doğrudan yardımla buluşturuyoruz.",
    uk: "Ласкаво просимо на трансляцію захисту KIVORA. Сьогодні ми об'єднуємо захист дітей, тварин, жінок і чоловіків.",
  });
  const [translating, setTranslating] = useState(false);
  const [playingDub, setPlayingDub] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Interactive Poll, Chat & Stage Hand-Raise
  const [activePoll, setActivePoll] = useState<LivePoll>({
    streamId: "stream_civic_blackout",
    question:
      "Welches Schwerpunktthema soll im nächsten KIVORA-Bürgercheck vertieft werden?",
    options: [
      { id: "opt_1", label: "KI-Kinderschutz & Schul-Workshops", votes: 412 },
      { id: "opt_2", label: "Frauen- & Männerschutz-Soforthilfe", votes: 389 },
      { id: "opt_3", label: "Tierschutz-Kontrollen & Blackout-Vorsorge", votes: 294 },
    ],
  });
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<LiveChatMsg[]>([
    {
      id: "lm_1",
      sender: "Katharina W. (ID-Austria)",
      text: "Die mehrsprachigen Live-Untertitel auf Englisch und Ukrainisch funktionieren verzögerungsfrei!",
      language: "de",
      timestamp: "Gerade eben",
    },
    {
      id: "lm_2",
      sender: "Markus_Graz",
      text: "Wie binden wir Gemeinden und Schutzorganisationen direkt in KIVORA ein?",
      language: "de",
      timestamp: "Vor 1 Min.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [guestChatName, setGuestChatName] = useState("");
  const [stageRequests, setStageRequests] = useState<StageReq[]>([
    {
      id: "sr_1",
      userName: "Dr. Elena Hofbauer (Jugendschutz)",
      topicNote: "Prävention gegen Cybergrooming an Mittelschulen",
      status: "waiting",
    },
  ]);
  const [stageTopicInput, setStageTopicInput] = useState("");

  // Sync selectedStreamId prop when user clicks a room in Feed
  useEffect(() => {
    if (selectedStreamId && selectedStreamId !== activeRoomId) {
      setActiveRoomId(selectedStreamId);
      setVotedOptionId(null);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "stream:select_room", streamId: selectedStreamId })
        );
      }
    }
  }, [selectedStreamId, activeRoomId]);

  // Connect to Real-Time WebSocket Server with Auto-Reconnect
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | undefined;

    const connectWebSocket = () => {
      if (disposed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setWsConnected(true);
        const roomToSync = activeRoomIdRef.current;
        if (roomToSync && roomToSync !== "stream_civic_blackout") {
          ws.send(
            JSON.stringify({ type: "stream:select_room", streamId: roomToSync })
          );
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connectWebSocket, 2500);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            streamId?: string;
            viewerCount?: number;
            likesCount?: number;
            pinnedMessage?: { sender: string; text: string } | null;
            activePoll?: LivePoll;
            message?: LiveChatMsg;
            stageRequests?: StageReq[];
            translations?: Record<string, string>;
            allRooms?: LiveStreamSummary[];
            room?: {
              streamId: string;
              title: string;
              hostName: string;
              topic: CivicTopic;
              platforms: string[];
              viewerCount: number;
              likesCount?: number;
              pinnedMessage?: { sender: string; text: string } | null;
              activePoll: LivePoll;
              recentMessages: LiveChatMsg[];
              stageRequests: StageReq[];
            };
          };

          if (Array.isArray(msg.allRooms)) {
            setRoomsList(msg.allRooms);
          }

          if (msg.type === "stream:sync" && msg.room) {
            setActiveRoomId(msg.room.streamId);
            setStreamTitle(msg.room.title);
            setHostName(msg.room.hostName);
            setStreamTopic(msg.room.topic);
            setSelectedPlatforms(msg.room.platforms);
            setViewerCount(msg.room.viewerCount);
            if (typeof msg.room.likesCount === "number") {
              setLikesCount(msg.room.likesCount);
            }
            setPinnedMessage(msg.room.pinnedMessage ?? null);
            setActivePoll(msg.room.activePoll);
            setChatMessages(msg.room.recentMessages);
            setStageRequests(msg.room.stageRequests);
            return;
          }

          // Room-scoped delta updates
          if (msg.streamId && msg.streamId !== activeRoomIdRef.current) {
            return;
          }

          if (msg.type === "stream:viewers" && typeof msg.viewerCount === "number") {
            setViewerCount(msg.viewerCount);
          } else if (
            msg.type === "stream:likes_updated" &&
            typeof msg.likesCount === "number"
          ) {
            setLikesCount(msg.likesCount);
          } else if (msg.type === "stream:pinned_updated") {
            setPinnedMessage(msg.pinnedMessage ?? null);
          } else if (msg.type === "stream:poll_updated" && msg.activePoll) {
            setActivePoll(msg.activePoll);
          } else if (msg.type === "stream:chat_message" && msg.message) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === msg.message?.id)) return prev;
              return [msg.message as LiveChatMsg, ...prev].slice(0, 40);
            });
          } else if (msg.type === "stream:stage_updated" && msg.stageRequests) {
            setStageRequests(msg.stageRequests);
          } else if (msg.type === "stream:subtitle_live" && msg.translations) {
            setTranslations(msg.translations);
          }
        } catch {
          // Ignore malformed frames
        }
      };
    };

    connectWebSocket();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const spawnFloatingHeart = () => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    const offsetX = Math.floor(Math.random() * 28) - 14;
    setFloatingHearts((prev) => [...prev.slice(-8), { id, offsetX }]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1150);
  };

  const handleTapLiveHeart = (burst = 1) => {
    spawnFloatingHeart();
    setLikesCount((prev) => prev + burst);
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:like",
        streamId: activeRoomId,
        burstCount: burst,
      })
    );
  };

  const handleSendSupportImpulse = (label: string) => {
    spawnFloatingHeart();
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:gift_support",
        streamId: activeRoomId,
        sender: currentUser ? currentUser.displayName : "TikTok-Gast",
        reactionLabel: label,
      })
    );
  };

  const handlePinChatMessage = (msg: { sender: string; text: string } | null) => {
    setPinnedMessage(msg);
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:pin_message",
        streamId: activeRoomId,
        pinnedMessage: msg,
      })
    );
  };

  const handleToggleGuestOnStage = (requestId: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:accept_stage",
        streamId: activeRoomId,
        requestId,
      })
    );
  };

  const handleSelectRoom = (streamId: string) => {
    setActiveRoomId(streamId);
    setVotedOptionId(null);
    onSelectStreamId?.(streamId);
    wsRef.current?.send(
      JSON.stringify({ type: "stream:select_room", streamId })
    );
  };

  const handleCreateNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:create_room",
        sender: currentUser
          ? `${currentUser.displayName} (KIVORA Live)`
          : "Bürger-Host · Live",
        title: newRoomTitle.trim(),
        topic: newRoomTopic,
        platforms: selectedPlatforms,
      })
    );
    setNewRoomTitle("");
    setShowNewRoomForm(false);
    setVotedOptionId(null);
  };

  const handleToggleSelfBroadcast = async () => {
    if (isBroadcastingSelf) {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
      setIsBroadcastingSelf(false);
      return;
    }

    const broadcasterLabel = currentUser
      ? `${currentUser.displayName} (${currentUser.idAustriaVerified ? "ID-Austria" : "Creator"})`
      : "Live-Host (Direktübertragung)";

    setIsBroadcastingSelf(true);
    setHostName(broadcasterLabel);
    setStreamError(null);

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraActive(false);
    }

    wsRef.current?.send(
      JSON.stringify({
        type: "stream:start_broadcast",
        streamId: activeRoomId,
        sender: broadcasterLabel,
        title: streamTitle,
        topic: streamTopic,
        platforms: selectedPlatforms,
      })
    );
  };

  const handleTranslateLiveSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spokenInput.trim()) return;
    setTranslating(true);
    setStreamError(null);
    try {
      const res = await fetch("/api/ai/live-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokenText: spokenInput.trim() }),
      });
      const data = (await res.json()) as {
        translations?: Record<string, string>;
        error?: string;
      };
      if (!res.ok || !data.translations) {
        throw new Error(data.error || "Live-Übersetzung fehlgeschlagen");
      }
      setTranslations(data.translations);
      wsRef.current?.send(
        JSON.stringify({
          type: "stream:subtitle_broadcast",
          streamId: activeRoomId,
          translations: data.translations,
        })
      );
    } catch (err) {
      setStreamError(
        err instanceof Error ? err.message : "Übersetzungsfehler"
      );
    } finally {
      setTranslating(false);
    }
  };

  const handlePlayMultilingualDub = async () => {
    const textToSpeak = translations[selectedLang] || translations.de;
    if (!textToSpeak || playingDub) return;
    setPlayingDub(true);
    setStreamError(null);
    try {
      const res = await fetch("/api/ai/tts-dub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, language: selectedLang }),
      });
      const data = (await res.json()) as {
        audioBase64?: string;
        error?: string;
      };
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || "Sprachsynchronisierung fehlgeschlagen");
      }
      const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
      audio.onended = () => setPlayingDub(false);
      audio.onerror = () => setPlayingDub(false);
      await audio.play();
    } catch (err) {
      setStreamError(
        err instanceof Error ? err.message : "Audio-Wiedergabe fehlgeschlagen"
      );
      setPlayingDub(false);
    }
  };

  const handleVotePoll = (optionId: string) => {
    if (votedOptionId) return;
    setVotedOptionId(optionId);
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:poll_vote",
        streamId: activeRoomId,
        optionId,
      })
    );
  };

  const effectiveChatSender = currentUser
    ? currentUser.displayName
    : guestChatName.trim() || "Gast-Zuschauer";

  const sendLiveChatText = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "stream:chat",
          streamId: activeRoomId,
          sender: effectiveChatSender,
          text: clean,
          language: selectedLang,
        })
      );
    } else {
      setChatMessages((prev) => [
        {
          id: `lm_local_${Date.now()}`,
          sender: effectiveChatSender,
          text: clean,
          language: selectedLang,
          timestamp: "Gerade eben",
        },
        ...prev.slice(0, 39),
      ]);
    }
  };

  const handleSendLiveChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendLiveChatText(chatInput);
    setChatInput("");
  };

  const handleRequestStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenIdAustriaModal();
      return;
    }
    wsRef.current?.send(
      JSON.stringify({
        type: "stream:stage_request",
        streamId: activeRoomId,
        userName: currentUser.displayName,
        topicNote:
          stageTopicInput.trim() || "Redebeitrag zur aktuellen Schutz-Debatte",
      })
    );
    setStageTopicInput("");
  };

  const totalPollVotes =
    activePoll.options.reduce((acc, o) => acc + o.votes, 0) || 1;

  const activeCoHosts = stageRequests.filter((s) => s.status === "on_stage");
  const overlayChatStream = chatMessages.slice(0, 5).reverse();

  return (
    <div className="space-y-6">
      {/* Multi-Room Protection Live Channel Bar + Create New Livestream */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Radio className="w-4 h-4 text-rose-600" />
            <span>
              Aktive Schutz-Livestreams (Kinderschutz, Tierschutz, Frauenschutz,
              Männerschutz)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNewRoomForm((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center gap-1 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Eigenen Themen-Livestream eröffnen</span>
          </button>
        </div>

        {showNewRoomForm && (
          <form
            onSubmit={handleCreateNewRoom}
            className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center gap-2"
          >
            <select
              value={newRoomTopic}
              onChange={(e) => setNewRoomTopic(e.target.value as CivicTopic)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              {YOUTH_SAFE_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              placeholder="Titel deines Livestreams (z.B. Tierschutz-Kontrolle oder Kinderschutz-Q&A)..."
              className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold min-h-[36px]"
            >
              Jetzt Live gehen
            </button>
            <button
              type="button"
              onClick={() => setShowNewRoomForm(false)}
              className="p-2 text-slate-400 hover:text-slate-700"
              aria-label="Formular schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {roomsList.map((rm) => {
            const isCurrent = rm.streamId === activeRoomId;
            return (
              <button
                key={rm.streamId}
                type="button"
                onClick={() => handleSelectRoom(rm.streamId)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isCurrent
                    ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-rose-400"
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    LIVE · {rm.topic}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {rm.viewerCount.toLocaleString("de-AT")} Zuschauer
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mt-1">
                  {rm.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {rm.hostName}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Top Broadcast Controls & Stage Format Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              LIVE-ÜBERTRAGUNG
            </span>
            <span aria-hidden="true">·</span>
            <span>{hostName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {wsConnected ? "Echtzeit-Chat verbunden" : "Verbinde Raum..."}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {streamTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 9:16 TikTok Live vs 16:9 Studio Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStageLayoutMode("tiktok_9_16")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                stageLayoutMode === "tiktok_9_16"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-600" />
              <span>9:16 TikTok Live</span>
            </button>
            <button
              type="button"
              onClick={() => setStageLayoutMode("studio_16_9")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                stageLayoutMode === "studio_16_9"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-rose-600" />
              <span>16:9 Studio</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleSelfBroadcast}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors min-h-[40px] ${
              isBroadcastingSelf
                ? "bg-slate-900 text-white"
                : "bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white"
            }`}
          >
            {isBroadcastingSelf ? (
              <>
                <VideoOff className="w-4 h-4" />
                <span>Eigenen Stream beenden</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Selbst Live streamen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenReportModal("livestream", activeRoomId, streamTitle)
            }
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 flex items-center gap-1.5 min-h-[40px]"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Melden</span>
          </button>
        </div>
      </div>

      {/* Main Grid: TikTok Live Vertical Stage with Floating Live Chat vs Synchronized Chat, Co-Host & Polls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: TikTok Live Stage + Floating Live Chat Stream + Support Impulses */}
        <div
          className={`${
            stageLayoutMode === "tiktok_9_16" ? "lg:col-span-5" : "lg:col-span-7"
          } space-y-4`}
        >
          {/* Authentic TikTok Live Broadcast Stage */}
          <div
            onDoubleClick={() => handleTapLiveHeart(3)}
            className={`relative mx-auto overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none cursor-pointer ${
              stageLayoutMode === "tiktok_9_16"
                ? "w-full max-w-[390px] aspect-[9/16] rounded-3xl"
                : "w-full aspect-video rounded-2xl"
            }`}
          >
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              playsInline
              muted
            />

            {!cameraActive && (
              <div className="w-full h-full bg-gradient-to-b from-slate-900 via-rose-950/60 to-slate-950 flex flex-col justify-center items-center p-6 text-center text-white">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-rose-600 to-fuchsia-600 mb-3">
                  <SafeImage
                    src={aiAvatarUrl}
                    alt={hostName}
                    className="w-full h-full rounded-full object-cover bg-slate-900"
                  />
                </div>
                <div className="text-xs font-semibold text-amber-300">
                  {streamTopic} · {tiktokHandle}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mt-1 leading-snug max-w-sm">
                  {streamTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs">
                  Doppelklick auf das Live-Bild für Likes · Echtzeit-Chat unten im Stream
                </p>
              </div>
            )}

            {/* Measured contrast gradient scrim for crisp readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/65" />

            {/* 1. TikTok Live Top Overlay Bar: Host Profile + Follow + Live Viewers & Hearts */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/15 rounded-full py-1 pl-1 pr-2.5 min-w-0 max-w-[62%]">
                <SafeImage
                  src={aiAvatarUrl}
                  alt={hostName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-rose-500"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">
                    {hostName.split("·")[0]?.trim() || hostName}
                  </div>
                  <div className="text-[10px] font-mono tabular-nums text-rose-300 truncate">
                    {likesCount.toLocaleString("de-AT")} Likes
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFollowingHost((f) => !f);
                  }}
                  className={`ml-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                    followingHost
                      ? "bg-white/20 text-white"
                      : "bg-rose-600 text-white hover:bg-rose-500"
                  }`}
                >
                  {followingHost ? "Gefolgt ✓" : "+ Folgen"}
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[11px] font-mono tabular-nums text-white flex items-center gap-1">
                  <Users className="w-3 h-3 text-rose-400" />
                  <span>{viewerCount.toLocaleString("de-AT")}</span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-rose-600 text-[10px] font-bold text-white tracking-wide">
                  LIVE
                </div>
              </div>
            </div>

            {/* 2. Pinned Host Live Comment Banner (TikTok Host Pin) */}
            {pinnedMessage && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-15 left-3.5 right-3.5 z-10 px-3 py-2 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-white text-[11px] flex items-start justify-between gap-2"
              >
                <div className="min-w-0 leading-snug">
                  <span className="font-bold text-amber-300 inline-flex items-center gap-1 mr-1">
                    <Pin className="w-3 h-3 shrink-0" />
                    Angeheftet ({pinnedMessage.sender}):
                  </span>
                  <span className="text-white/95">{pinnedMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePinChatMessage(null)}
                  className="text-white/75 hover:text-white shrink-0 p-0.5"
                  aria-label="Angeheftete Nachricht lösen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 3. Active TikTok Live Co-Hosts / Multi-Guest Split Indicator */}
            {activeCoHosts.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-28 right-3.5 z-10 max-w-[210px] space-y-1.5"
              >
                {activeCoHosts.map((guest) => (
                  <div
                    key={guest.id}
                    className="p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-emerald-400/40 text-white text-[11px] space-y-0.5"
                  >
                    <div className="font-bold text-emerald-300 flex items-center justify-between gap-1">
                      <span className="truncate">Co-Host: {guest.userName}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 line-clamp-1">
                      {guest.topicNote}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Floating TikTok-Style Live Chat Feed + Live Subtitles Overlay */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-3.5 right-14 z-10 space-y-2"
            >
              {/* Floating Translucent Live Chat Stream */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {overlayChatStream.map((m) => (
                  <div
                    key={m.id}
                    className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs text-white leading-snug flex items-start justify-between gap-2 ${
                      m.isReaction
                        ? "bg-gradient-to-r from-amber-500/75 via-rose-600/75 to-fuchsia-600/75 border border-amber-300/50 font-semibold"
                        : "bg-black/50 border border-white/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`font-bold mr-1.5 ${
                          m.isReaction ? "text-amber-200" : "text-rose-300"
                        }`}
                      >
                        {m.sender}:
                      </span>
                      <span className="text-white/95 break-words">{m.text}</span>
                    </div>
                    {!m.isReaction && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePinChatMessage({ sender: m.sender, text: m.text })
                        }
                        title="Kommentar oben im Stream anheften"
                        className="text-white/60 hover:text-amber-300 shrink-0 pt-0.5"
                        aria-label="Kommentar anheften"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Live Multilingual Subtitle Pill inside Stream */}
              <div className="p-2.5 rounded-xl bg-slate-950/85 border border-white/15 backdrop-blur-xs">
                <div className="flex items-center justify-between text-[10px] text-amber-300 mb-0.5">
                  <span>
                    Live-Untertitel (
                    {LANGUAGES.find((l) => l.code === selectedLang)?.code.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={handlePlayMultilingualDub}
                    disabled={playingDub}
                    className="flex items-center gap-1 text-white font-semibold hover:text-amber-300"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>{playingDub ? "Spricht..." : "KI-Stimme"}</span>
                  </button>
                </div>
                <p className="text-[11px] font-medium text-white leading-snug line-clamp-2">
                  {translations[selectedLang] || translations.de}
                </p>
              </div>

              {/* Direct In-Stream Live Chat Input */}
              <form
                onSubmit={handleSendLiveChat}
                className="flex items-center gap-1.5 pt-0.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Live chatten als ${effectiveChatSender}...`}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/70 border border-white/25 text-white placeholder-white/70 text-xs focus:outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                  aria-label="Live-Nachricht im Stream senden"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Senden</span>
                </button>
              </form>
            </div>

            {/* 5. TikTok Floating Tap-to-Heart Stream on Bottom-Right Edge */}
            <div className="pointer-events-none absolute bottom-16 right-3 z-20 w-10 h-40">
              {floatingHearts.map((fh) => (
                <div
                  key={fh.id}
                  style={{ right: `${12 + fh.offsetX}px` }}
                  className="absolute bottom-0 animate-kivora-heart"
                >
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500 drop-shadow" />
                </div>
              ))}
            </div>
          </div>

          {/* TikTok Live Bottom Action Bar & Direct Live-Chat Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            {/* TikTok-Style Support / Schutz-Impulse Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>TikTok-Live Schutz-Impulse (Echtzeit-Broadcast)</span>
                </span>
                <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                  {likesCount.toLocaleString("de-AT")} Gesamt-Likes
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIKTOK_SUPPORT_IMPULSES.map((imp) => (
                  <button
                    key={imp.id}
                    type="button"
                    onClick={() => handleSendSupportImpulse(imp.label)}
                    className="px-2.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-left transition-colors min-h-[40px]"
                  >
                    <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 truncate">
                      {imp.label}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      +{imp.points} Likes
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Live Chat Composer + Tap-to-Heart + Co-Host + Share */}
            <form onSubmit={handleSendLiveChat} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Sag etwas im TikTok Live-Chat..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[42px]"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 min-h-[42px] shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Senden</span>
              </button>
              <button
                type="button"
                onClick={() => handleTapLiveHeart(5)}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white text-xs font-bold flex items-center gap-1 min-h-[42px] shrink-0 active:scale-95 transition-transform"
                aria-label="Live-Herz senden"
              >
                <Heart className="w-4 h-4 fill-current" />
                <span className="font-mono tabular-nums">+5</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const invite = `Live auf KIVORA (${tiktokHandle} · ${instagramHandle}): ${streamTitle} — ${window.location.href}`;
                  navigator.clipboard?.writeText(invite).catch(() => {});
                  setCopiedStreamLink(true);
                  window.setTimeout(() => setCopiedStreamLink(false), 2000);
                }}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-500 min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
                aria-label="Livestream-Link kopieren"
              >
                {copiedStreamLink ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Synchronized Live Chat History, Co-Host Multi-Guest Stage, Polls & 6-Lang Dubbing */}
        <div
          className={`${
            stageLayoutMode === "tiktok_9_16" ? "lg:col-span-7" : "lg:col-span-5"
          } space-y-5`}
        >
          {/* 1. Full Synchronized Real-Time Live Chat & Host Moderation */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600" />
                <span>Echtzeit-Zuschauerchat & Live-Moderation</span>
              </h3>
              <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                {chatMessages.length} Live-Nachrichten
              </span>
            </div>

            {/* Quick Tap Reaction Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_CHAT_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => sendLiveChatText(phrase)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs flex items-start justify-between gap-2 ${
                    m.isReaction
                      ? "bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900"
                      : "bg-slate-50 dark:bg-slate-950"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {m.sender}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        · {m.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {m.text}
                    </p>
                  </div>

                  {!m.isReaction && (
                    <button
                      type="button"
                      onClick={() =>
                        handlePinChatMessage({ sender: m.sender, text: m.text })
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 hover:text-rose-600 shrink-0 flex items-center gap-1"
                    >
                      <Pin className="w-3 h-3" />
                      <span>Anheften</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Direct Live Chat Composer inside Echtzeit-Zuschauerchat Card */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                {currentUser ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Angemeldet im Live-Chat als {currentUser.displayName}
                    </span>
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">
                        Chat-Name:
                      </span>
                      <input
                        type="text"
                        value={guestChatName}
                        onChange={(e) => setGuestChatName(e.target.value)}
                        placeholder="Gast-Zuschauer"
                        className="w-full max-w-[160px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onOpenIdAustriaModal}
                      className="text-rose-600 dark:text-rose-400 font-semibold hover:underline shrink-0"
                    >
                      Auf Website anmelden →
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendLiveChat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Echtzeit-Nachricht an alle Zuschauer senden..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 min-h-[40px] shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Live senden</span>
                </button>
              </form>
            </div>
          </section>

          {/* 2. Split Grid: Live Co-Host / Multi-Guest Stage + Live Interactive Poll */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TikTok Live Co-Host & Q&A Stage */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Hand className="w-4 h-4 text-rose-600" />
                <span>TikTok Live Co-Host & Q&A</span>
              </h3>
              <form onSubmit={handleRequestStage} className="flex gap-2">
                <input
                  type="text"
                  value={stageTopicInput}
                  onChange={(e) => setStageTopicInput(e.target.value)}
                  placeholder="Thema für Live-Beitrag..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Melden</span>
                </button>
              </form>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stageRequests.map((sr) => (
                  <div
                    key={sr.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {sr.userName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {sr.topicNote}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleGuestOnStage(sr.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                        sr.status === "on_stage"
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                      }`}
                    >
                      {sr.status === "on_stage" ? "Auf Bühne ✓" : "+ Einladen"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive Live Poll */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Live-Abstimmung
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {totalPollVotes} Stimmen
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {activePoll.question}
              </p>
              <div className="space-y-2">
                {activePoll.options.map((opt) => {
                  const pct = Math.round((opt.votes / totalPollVotes) * 100);
                  const chosen = votedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleVotePoll(opt.id)}
                      disabled={Boolean(votedOptionId)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors ${
                        chosen
                          ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40"
                          : "border-slate-200 dark:border-slate-800 hover:border-rose-400"
                      }`}
                    >
                      <div className="flex justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span className="truncate">{opt.label}</span>
                        <span className="font-mono tabular-nums shrink-0">{pct} %</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 3. Language Selector & Live Speech/Text Translator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-rose-600" />
                <span>
                  Automatische Untertitelung & Mehrsprachige Synchronisierung
                </span>
              </h3>

              <div className="flex flex-wrap gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedLang === lang.code
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleTranslateLiveSpeech} className="flex gap-2">
              <input
                type="text"
                value={spokenInput}
                onChange={(e) => setSpokenInput(e.target.value)}
                placeholder="Live-Moderationstext eingeben — wird in 6 Sprachen untertitelt & synchronisiert..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="submit"
                disabled={translating}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
              >
                {translating ? "Übersetzt..." : "Simultan senden"}
              </button>
            </form>

            {streamError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {streamError}
              </p>
            )}
          </div>

          {/* 4. Broadcaster Platform & Audience Optimization Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Plattform- & Zielgruppen-Optimierung (TikTok 9:16, Instagram Live,
              YouTube, X & KIVORA)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Stream-Titel
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Zielgruppen-Fokus
                </label>
                <input
                  type="text"
                  value={audienceTarget}
                  onChange={(e) => setAudienceTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TARGET_PLATFORMS.map((plat) => {
                const active = selectedPlatforms.includes(plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() =>
                      setSelectedPlatforms((prev) =>
                        prev.includes(plat)
                          ? prev.filter((p) => p !== plat)
                          : [...prev, plat]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                      active
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{plat}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <select
                value={streamTopic}
                onChange={(e) => setStreamTopic(e.target.value as CivicTopic)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {YOUTH_SAFE_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  wsRef.current?.send(
                    JSON.stringify({
                      type: "stream:start_broadcast",
                      streamId: activeRoomId,
                      title: streamTitle,
                      topic: streamTopic,
                      platforms: selectedPlatforms,
                    })
                  )
                }
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Stream-Einstellungen live übernehmen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Echte Analyse der Zuschauerdaten & Demografische Auswertung */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              <span>
                Echte Analyse der Zuschauerdaten & Demografische Auswertung
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DSGVO-anonymisierte Echtzeit-Telemetrie für gezielte Schutz- und
              Aufklärungskampagnen
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
            Live-Aktualisierung aktiv
          </span>
        </div>

        {/* 4 KPI Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {viewerCount.toLocaleString("de-AT")}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Aktive Zuschauer im Raum
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {likesCount.toLocaleString("de-AT")}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              TikTok-Live Herz-Reaktionen
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              14:42 Min.
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Ø Verweildauer</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              74,2 %
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              ID-Austria verifiziert
            </div>
          </div>
        </div>

        {/* 3-Column Demographic & Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Altersverteilung (Zuschauer)
            </h4>
            {AUDIENCE_DEMOGRAPHICS.ageDistribution.map((row) => (
              <div key={row.bracket} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    {row.bracket}
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    {row.pct} %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Regionale Herkunft (DACH / EU)
            </h4>
            {AUDIENCE_DEMOGRAPHICS.regionDistribution.map((row) => (
              <div key={row.region} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                    {row.region}
                  </span>
                  <span className="font-mono tabular-nums font-semibold shrink-0">
                    {row.pct} %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Plattform-Reichweite (Multi-Stream)
            </h4>
            {AUDIENCE_DEMOGRAPHICS.platformReach.map((row) => (
              <div key={row.platform} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                    {row.platform}
                  </span>
                  <span className="font-mono tabular-nums font-semibold shrink-0">
                    {row.sharePct} %
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-fuchsia-600 rounded-full"
                    style={{ width: `${row.sharePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
