import { useEffect, useRef, useState } from "react";
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Lock,
  Send,
  Flag,
  Play,
  Pause,
  Radio,
  Users,
  MapPin,
  Music2,
  UserCheck,
  Flame,
  MessageCircleHeart,
  ChevronUp,
  ChevronDown,
  PhoneCall,
} from "lucide-react";
import { SafeImage } from "./SafeImage";
import { MEDIA_ASSETS } from "../lib/mediaAssets";
import { INITIAL_DATING_PROFILES } from "../lib/seedData";
import {
  YOUTH_SAFE_TOPICS,
  type DatingMatchChatMessage,
  type DatingMatchOrigin,
  type DatingMatchRecord,
  type DatingProfileItem,
  type LiveMatchDuelRoom,
  type SafetyReportRecord,
  type UserProfile,
} from "../types/kivora";

interface DatingAndMatchesViewProps {
  currentUser: UserProfile | null;
  profiles: DatingProfileItem[];
  matches: DatingMatchRecord[];
  messagesByMatch: Record<string, DatingMatchChatMessage[]>;
  onRecordSwipeAndMatch: (input: {
    profile: DatingProfileItem;
    decision: "pass" | "like" | "super_like" | "tiktok_match";
    sourceMode: "tinder_swipe" | "tiktok_video" | "tiktok_live";
    originOverride?: DatingMatchOrigin;
  }) => Promise<DatingMatchRecord | null>;
  onSendMatchMessage: (
    match: DatingMatchRecord,
    text: string
  ) => Promise<void>;
  onSaveOwnDatingProfile: (input: {
    displayName: string;
    age: number;
    city: string;
    bio: string;
    photoUrl: string;
    videoHookTitle: string;
    sharedValues: string[];
  }) => Promise<void>;
  onOpenIdAustriaModal: () => void;
  onOpenReportModal: (
    targetType: SafetyReportRecord["targetType"],
    targetId: string,
    targetTitle: string
  ) => void;
  onNavigateFeed: () => void;
}

const MATCH_ORIGIN_LABELS: Record<DatingMatchOrigin, string> = {
  tinder_swipe: "Tinder Swipe-Match",
  super_like: "Super-Like Match",
  tiktok_video_duet: "TikTok 9:16 Video-Match",
  tiktok_live_match: "TikTok Live-Match",
};

const PORTRAIT_CHOICES = [
  { label: "Porträt Park Wien", url: MEDIA_ASSETS.datingClara },
  { label: "Porträt Alpen & Hund", url: MEDIA_ASSETS.datingLukas },
  { label: "Porträt Café & Buch", url: MEDIA_ASSETS.datingSofia },
  { label: "Porträt Gipfeltour", url: MEDIA_ASSETS.datingDavid },
  { label: "KIVORA Community", url: MEDIA_ASSETS.heroCivic },
];

export function DatingAndMatchesView({
  currentUser,
  profiles,
  matches,
  messagesByMatch,
  onRecordSwipeAndMatch,
  onSendMatchMessage,
  onSaveOwnDatingProfile,
  onOpenIdAustriaModal,
  onOpenReportModal,
  onNavigateFeed,
}: DatingAndMatchesViewProps) {
  const isVerifiedAdult = currentUser?.ageGroup === "adult";
  const isExplicitMinor = currentUser?.ageGroup === "minor";
  const [adultPreviewUnlocked, setAdultPreviewUnlocked] = useState(false);

  const canAccessDating =
    !isExplicitMinor && (isVerifiedAdult || adultPreviewUnlocked);

  // Dating Sub-Modes: Tinder Swipe Deck | TikTok 9:16 Video Matches | TikTok Live Match Arena | Own 18+ Profile
  const [datingMode, setDatingMode] = useState<
    "tinder_swipe" | "tiktok_video" | "tiktok_live" | "my_profile"
  >("tinder_swipe");

  // Filters for Discovery Deck
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(500);
  const [selectedValueFilter, setSelectedValueFilter] = useState<string>("Alle");
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [matchedProfileIds, setMatchedProfileIds] = useState<string[]>(() =>
    matches.map((m) => m.partnerId)
  );
  const [lastPassedId, setLastPassedId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<0 | 1>(0);

  // Pointer Drag Physics for Tinder Card
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // TikTok 9:16 Video Match Feed index & playback state
  const [videoFeedIndex, setVideoFeedIndex] = useState<number>(0);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(true);

  // TikTok Live Match WebSocket Arena
  const liveMatchWsRef = useRef<WebSocket | null>(null);
  const [activeLiveMatchRoomId, setActiveLiveMatchRoomId] =
    useState<string>("match_room_vienna");
  const activeLiveMatchRoomIdRef = useRef<string>("match_room_vienna");
  useEffect(() => {
    activeLiveMatchRoomIdRef.current = activeLiveMatchRoomId;
  }, [activeLiveMatchRoomId]);

  const [liveMatchRoomsList, setLiveMatchRoomsList] = useState<
    LiveMatchDuelRoom[]
  >([]);
  const [currentLiveMatchRoom, setCurrentLiveMatchRoom] =
    useState<LiveMatchDuelRoom>({
      roomId: "match_room_vienna",
      title: "TikTok Live-Match Duell: Tierschutz, Kultur & Herz (18+)",
      regionLabel: "Wien & Graz · Live-Split",
      topicFocus: "Tierschutz & Kultur",
      hostA: {
        name: "Clara",
        handle: "clara.wien",
        age: 27,
        city: "Wien · Neubau",
        photoUrl: MEDIA_ASSETS.datingClara,
        topicTag: "Tierschutz & Kinderschutz",
        score: 340,
      },
      hostB: {
        name: "Lukas",
        handle: "lukas.alpen",
        age: 30,
        city: "Graz · St. Leonhard",
        photoUrl: MEDIA_ASSETS.datingLukas,
        topicTag: "Rettungsdienst & Outdoor",
        score: 315,
      },
      viewerCount: 284,
      remainingSec: 180,
      recentMessages: [
        {
          id: "dm_live_1",
          sender: "Marie_Wien",
          text: "Ihr zwei passt perfekt zusammen — beide im Tierschutz aktiv!",
          timestamp: "Gerade eben",
        },
      ],
    });
  const [liveMatchChatInput, setLiveMatchChatInput] = useState("");
  const [liveMatchConnected, setLiveMatchConnected] = useState(false);

  // Match Celebration Modal ("IT'S A MATCH!")
  const [celebrationMatch, setCelebrationMatch] =
    useState<DatingMatchRecord | null>(null);
  const [celebrationNote, setCelebrationNote] = useState("");

  // Selected Match & Direct Chat + AI Icebreaker
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    matches[0]?.id || ""
  );
  const [matchChatInput, setMatchChatInput] = useState("");
  const [aiIcebreakers, setAiIcebreakers] = useState<string[]>([]);
  const [aiSafetyTip, setAiSafetyTip] = useState<string | null>(null);
  const [loadingIcebreakers, setLoadingIcebreakers] = useState(false);

  // Own 18+ Profile Editor
  const [myName, setMyName] = useState(currentUser?.displayName || "");
  const [myAge, setMyAge] = useState<number>(26);
  const [myCity, setMyCity] = useState("Wien");
  const [myBio, setMyBio] = useState(
    currentUser?.bio ||
      "Engagiert bei KIVORA für Tierschutz, Kinderschutz & ehrliche Begegnungen."
  );
  const [myVideoHook, setMyVideoHook] = useState(
    "Warum echte Werte & Humor beim Kennenlernen für mich an erster Stelle stehen"
  );
  const [myPhotoUrl, setMyPhotoUrl] = useState<string>(MEDIA_ASSETS.datingClara);
  const [myValues, setMyValues] = useState<string[]>([
    "Tierschutz",
    "Kinderschutz",
  ]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (matches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  // Countdown tick for TikTok Live Match Arena
  useEffect(() => {
    if (!canAccessDating || datingMode !== "tiktok_live") return;
    const timer = window.setInterval(() => {
      setCurrentLiveMatchRoom((prev) => ({
        ...prev,
        remainingSec: prev.remainingSec > 1 ? prev.remainingSec - 1 : 180,
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [canAccessDating, datingMode]);

  // Real-Time WebSocket Sync for TikTok Live Match Duel Rooms
  useEffect(() => {
    if (!canAccessDating) return;
    let disposed = false;
    let reconnectTimer: number | undefined;

    const connectSocket = () => {
      if (disposed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      liveMatchWsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setLiveMatchConnected(true);
        ws.send(
          JSON.stringify({
            type: "dating:select_live_match",
            matchRoomId: activeLiveMatchRoomIdRef.current,
          })
        );
      };

      ws.onclose = () => {
        if (disposed) return;
        setLiveMatchConnected(false);
        reconnectTimer = window.setTimeout(connectSocket, 2500);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            matchRoom?: LiveMatchDuelRoom;
            allMatchRooms?: LiveMatchDuelRoom[];
          };
          if (Array.isArray(msg.allMatchRooms) && msg.allMatchRooms.length > 0) {
            setLiveMatchRoomsList(msg.allMatchRooms);
          }
          if (
            (msg.type === "dating:live_match_sync" ||
              msg.type === "dating:live_match_updated") &&
            msg.matchRoom
          ) {
            if (msg.matchRoom.roomId === activeLiveMatchRoomIdRef.current) {
              setCurrentLiveMatchRoom(msg.matchRoom);
            }
          }
        } catch {
          // Ignore non-JSON or unrelated frames
        }
      };
    };

    connectSocket();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      liveMatchWsRef.current?.close();
    };
  }, [canAccessDating]);

  // --- STRICT <18 CHILD SAFETY GATE ---
  if (isExplicitMinor) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-8 text-center space-y-4">
        <ShieldCheck className="w-11 h-11 text-amber-600 dark:text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Kinderschutz aktiv: 18+ Dating-Bereich für Minderjährige gesperrt
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          Auf KIVORA sind Minderjährige (&lt;18) technisch und organisatorisch
          strikt vom 18+ Dating- und Match-Bereich getrennt. Erwachsene können
          Jugendkonten im Dating-Bereich weder sehen noch kontaktieren.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onNavigateFeed}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold min-h-[44px]"
          >
            Zurück zum geschützten Jugend-Feed
          </button>
          <a
            href="tel:147"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span>Rat auf Draht: 147</span>
          </a>
        </div>
      </div>
    );
  }

  // --- 18+ ID-AUSTRIA & DSGVO DATING GATE ---
  if (!canAccessDating) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Strikte 18+ Altersprüfung & EU-DSGVO Datenschutz
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              KIVORA Dating & TikTok-Matches (Ab 18 Jahren)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Verbinde klassisches <strong>Tinder-Swiping</strong> mit{" "}
              <strong>TikTok 9:16 Video-Matches & Live-Duellen</strong> —
              geschützt durch ID-Austria Volljährigkeitsprüfung (18+),
              KI-Schutzschild gegen Übergriffe und ohne Weitergabe an
              Werbenetzwerke.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">
              01. Tinder-Swipe & Super-Like
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Wische nach rechts oder links, vergleiche gemeinsame
              Schutz-Werte und starte sofort bei gegenseitigem Like.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">
              02. TikTok Video- & Live-Matches
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Entdecke 9:16 Kurzvideos im For-You-Stil oder matche in
              Echtzeit in Split-Screen TikTok Live-Match-Runden.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">
              03. Strikte 18+ & DSGVO-Trennung
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Minderjährige (&lt;18) sind technisch vollständig ausgeschlossen.
              Profile sind jederzeit mit 1 Klick löschbar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onOpenIdAustriaModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center gap-2 min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {currentUser
                ? "Jetzt ID-Austria 18+ Prüfung abschließen"
                : "Auf Website anmelden & ID-Austria 18+ verifizieren"}
            </span>
          </button>

          {!currentUser && (
            <button
              type="button"
              onClick={() => setAdultPreviewUnlocked(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-rose-500 min-h-[44px]"
            >
              Ich bin 18+ · Dating-Vorschau öffnen
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filter active discovery deck
  const availableProfiles = profiles
    .filter((p) => p.uid !== currentUser?.uid)
    .filter((p) => !passedIds.includes(p.id))
    .filter((p) => !matchedProfileIds.includes(p.id))
    .filter((p) => p.distanceKm <= maxDistanceKm)
    .filter((p) =>
      selectedValueFilter === "Alle"
        ? true
        : p.sharedValues.includes(selectedValueFilter)
    );

  const currentCard = availableProfiles[0] || null;
  const nextCard = availableProfiles[1] || null;
  const currentVideoProfile =
    profiles[videoFeedIndex % Math.max(1, profiles.length)] ||
    INITIAL_DATING_PROFILES[0];

  const selectedMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0] || null;
  const currentMatchMessages = selectedMatch
    ? messagesByMatch[selectedMatch.id] || []
    : [];

  const triggerActionOnProfile = async (
    target: DatingProfileItem,
    decision: "pass" | "like" | "super_like" | "tiktok_match",
    sourceMode: "tinder_swipe" | "tiktok_video" | "tiktok_live",
    originOverride?: DatingMatchOrigin
  ) => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setActivePhotoIndex(0);

    if (decision === "pass") {
      setLastPassedId(target.id);
      setPassedIds((prev) => [...prev, target.id]);
    } else {
      setMatchedProfileIds((prev) =>
        prev.includes(target.id) ? prev : [...prev, target.id]
      );
    }

    const createdMatch = await onRecordSwipeAndMatch({
      profile: target,
      decision,
      sourceMode,
      originOverride,
    });

    if (createdMatch) {
      setCelebrationMatch(createdMatch);
      setSelectedMatchId(createdMatch.id);
      setAiIcebreakers([]);
      setAiSafetyTip(null);
    }
  };

  // Pointer Swipe Handlers for Tinder Card
  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentCard) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handleCardPointerUp = () => {
    if (!isDragging || !currentCard) {
      setIsDragging(false);
      return;
    }
    const threshold = 95;
    if (dragOffset.x > threshold) {
      void triggerActionOnProfile(currentCard, "like", "tinder_swipe");
    } else if (dragOffset.x < -threshold) {
      void triggerActionOnProfile(currentCard, "pass", "tinder_swipe");
    } else if (dragOffset.y < -threshold) {
      void triggerActionOnProfile(currentCard, "super_like", "tinder_swipe");
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const handleGenerateAiIcebreakers = async () => {
    if (!selectedMatch || loadingIcebreakers) return;
    setLoadingIcebreakers(true);
    try {
      const targetProf = profiles.find(
        (p) => p.uid === selectedMatch.partnerId || p.id === selectedMatch.partnerId
      );
      const res = await fetch("/api/ai/dating-icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: selectedMatch.partnerName,
          partnerCity: selectedMatch.partnerCity,
          sharedValues: targetProf?.sharedValues || [
            "Tierschutz",
            "Kinderschutz",
          ],
          matchOrigin: selectedMatch.matchOrigin,
          userAgeGroup: currentUser?.ageGroup || "adult",
        }),
      });
      const data = (await res.json()) as {
        icebreakers?: string[];
        safetyTip?: string;
      };
      if (Array.isArray(data.icebreakers)) {
        setAiIcebreakers(data.icebreakers);
      }
      if (data.safetyTip) {
        setAiSafetyTip(data.safetyTip);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoadingIcebreakers(false);
    }
  };

  const handleTriggerLiveHostMatch = async (side: "A" | "B") => {
    const chosenHost =
      side === "A"
        ? currentLiveMatchRoom.hostA
        : currentLiveMatchRoom.hostB;

    const existingProfile =
      profiles.find(
        (p) =>
          p.handle.toLowerCase() === chosenHost.handle.toLowerCase() ||
          p.displayName.toLowerCase() === chosenHost.name.toLowerCase()
      ) || {
        id: `dp_live_${chosenHost.handle.replace(/[^a-zA-Z0-9_]/g, "_")}`,
        uid: `seed_${chosenHost.handle.replace(/[^a-zA-Z0-9_]/g, "_")}`,
        displayName: chosenHost.name,
        handle: chosenHost.handle,
        age: chosenHost.age,
        city: chosenHost.city,
        distanceKm: 12,
        bio: `Aktiv im TikTok Live-Match (${chosenHost.topicTag}).`,
        photoUrl: chosenHost.photoUrl,
        videoHookTitle: currentLiveMatchRoom.title,
        videoFilterPreset: "Klarblick Dokumentar",
        tiktokSoundLabel: currentLiveMatchRoom.regionLabel,
        sharedValues: [chosenHost.topicTag],
        promptQuestion: "Im Live-Match aktiv für:",
        promptAnswer: chosenHost.topicTag,
        idAustriaVerified: true,
        likesBackOnSwipe: true,
      };

    liveMatchWsRef.current?.send(
      JSON.stringify({
        type: "dating:live_match_boost",
        matchRoomId: currentLiveMatchRoom.roomId,
        side,
      })
    );

    await triggerActionOnProfile(
      existingProfile,
      "tiktok_match",
      "tiktok_live",
      "tiktok_live_match"
    );
  };

  const totalDuelScore =
    currentLiveMatchRoom.hostA.score + currentLiveMatchRoom.hostB.score || 1;
  const hostAPct = Math.round(
    (currentLiveMatchRoom.hostA.score / totalDuelScore) * 100
  );

  return (
    <div className="space-y-6">
      {/* Top Dating & TikTok-Match Mode Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isVerifiedAdult
                ? "ID-Austria 18+ Verifiziert · Strikte Jugendtrennung aktiv"
                : "18+ Modus aktiv · Jetzt mit ID-Austria dauerhaft speichern"}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            KIVORA Dating (Tinder-Swipe & TikTok-Matches)
          </h2>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: "tinder_swipe", label: "Tinder-Swipe", icon: Flame },
              {
                id: "tiktok_video",
                label: "TikTok Video-Matches",
                icon: Play,
              },
              {
                id: "tiktok_live",
                label: "TikTok Live-Matches",
                icon: Radio,
              },
              {
                id: "my_profile",
                label: "Mein 18+ Profil",
                icon: UserCheck,
              },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = datingMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setDatingMode(m.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap min-h-[38px] ${
                  active
                    ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 12-Col Split: Discovery / Video / Live Arena (Left 7 cols) + Matches & Chat (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* MODE 1: TINDER-STYLE SWIPE CARD DECK */}
          {datingMode === "tinder_swipe" && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {["Alle", ...YOUTH_SAFE_TOPICS.slice(0, 5)].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedValueFilter(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        selectedValueFilter === val
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <select
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  aria-label="Maximale Entfernung"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums"
                >
                  <option value={500}>Ganz DACH</option>
                  <option value={50}>Bis 50 km</option>
                  <option value={15}>Bis 15 km</option>
                </select>
              </div>

              {/* Swipe Card Viewport */}
              {currentCard ? (
                <div className="space-y-4">
                  <div className="relative mx-auto w-full max-w-[400px] aspect-[3/4] select-none">
                    {/* Next Card Preview Underneath */}
                    {nextCard && (
                      <div className="absolute inset-0 scale-[0.96] translate-y-2 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 opacity-75 pointer-events-none">
                        <SafeImage
                          src={nextCard.photoUrl}
                          alt={nextCard.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Active Interactive Tinder Card */}
                    <div
                      onPointerDown={handleCardPointerDown}
                      onPointerMove={handleCardPointerMove}
                      onPointerUp={handleCardPointerUp}
                      onPointerCancel={handleCardPointerUp}
                      style={{
                        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${
                          dragOffset.x * 0.05
                        }deg)`,
                        transition: isDragging
                          ? "none"
                          : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                        touchAction: "none",
                      }}
                      className="relative w-full h-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-xl cursor-grab active:cursor-grabbing"
                    >
                      <SafeImage
                        src={
                          activePhotoIndex === 1 && currentCard.secondaryPhotoUrl
                            ? currentCard.secondaryPhotoUrl
                            : currentCard.photoUrl
                        }
                        alt={`${currentCard.displayName}, ${currentCard.age}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {/* Photo Segment Switcher Bar at Top (Tinder Multi-Photo Style) */}
                      <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setActivePhotoIndex(0)}
                          aria-label="Hauptfoto"
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            activePhotoIndex === 0 ? "bg-white" : "bg-white/40"
                          }`}
                        />
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setActivePhotoIndex(1)}
                          aria-label="Zweites Foto & Prompt"
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            activePhotoIndex === 1 ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      </div>

                      {/* Swipe Stamps during drag */}
                      {dragOffset.x > 35 && (
                        <div className="absolute top-10 left-6 z-20 px-4 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-950/75 text-emerald-300 font-bold text-lg tracking-wider -rotate-12">
                          LIKE
                        </div>
                      )}
                      {dragOffset.x < -35 && (
                        <div className="absolute top-10 right-6 z-20 px-4 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-950/75 text-rose-300 font-bold text-lg tracking-wider rotate-12">
                          PASS
                        </div>
                      )}
                      {dragOffset.y < -45 && (
                        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-xl border-2 border-amber-300 bg-amber-950/80 text-amber-200 font-bold text-sm tracking-wider">
                          SUPER-LIKE
                        </div>
                      )}

                      {/* Contrast Gradient Scrim */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/25" />

                      {/* Bottom Card Metadata & Bio */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 text-white space-y-2 z-10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold tracking-tight">
                              {currentCard.displayName}
                            </h3>
                            <span className="text-xl font-mono tabular-nums text-white/90">
                              {currentCard.age}
                            </span>
                          </div>

                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() =>
                              onOpenReportModal(
                                "user",
                                currentCard.uid,
                                `Dating-Profil: ${currentCard.displayName}`
                              )
                            }
                            className="p-2 rounded-full bg-black/50 text-white/80 hover:text-rose-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                            aria-label="Profil melden"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Clean Unboxed Metadata with Typographic Separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            {currentCard.city}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {currentCard.distanceKm} km entfernt
                          </span>
                          {currentCard.idAustriaVerified && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-300 font-semibold">
                                ID-Austria 18+
                              </span>
                            </>
                          )}
                        </div>

                        {activePhotoIndex === 0 ? (
                          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed line-clamp-3">
                            {currentCard.bio}
                          </p>
                        ) : (
                          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-xs space-y-1">
                            <div className="font-semibold text-amber-300">
                              {currentCard.promptQuestion}
                            </div>
                            <p className="text-white leading-snug">
                              {currentCard.promptAnswer}
                            </p>
                          </div>
                        )}

                        {/* Shared Values Clean Inline Row */}
                        <div className="text-[11px] font-medium text-rose-200 pt-0.5 truncate">
                          Werte: {currentCard.sharedValues.join(" · ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tactile Tinder + TikTok Hybrid Action Bar (All >= 48px touch targets) */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!lastPassedId) return;
                        setPassedIds((prev) =>
                          prev.filter((id) => id !== lastPassedId)
                        );
                        setLastPassedId(null);
                      }}
                      disabled={!lastPassedId}
                      aria-label="Letzten Swipe zurückholen"
                      title="Zurück (Rewind)"
                      className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-amber-600 flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void triggerActionOnProfile(
                          currentCard,
                          "pass",
                          "tinder_swipe"
                        )
                      }
                      aria-label="Weiter (Pass)"
                      title="Pass (Nein)"
                      className="w-14 h-14 rounded-full border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-950 text-rose-600 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      <X className="w-7 h-7" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void triggerActionOnProfile(
                          currentCard,
                          "super_like",
                          "tinder_swipe",
                          "super_like"
                        )
                      }
                      aria-label="Super-Like"
                      title="Super-Like"
                      className="w-12 h-12 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void triggerActionOnProfile(
                          currentCard,
                          "like",
                          "tinder_swipe",
                          "tinder_swipe"
                        )
                      }
                      aria-label="Like (Match)"
                      title="Like (Herz)"
                      className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Heart className="w-7 h-7 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void triggerActionOnProfile(
                          currentCard,
                          "tiktok_match",
                          "tiktok_video",
                          "tiktok_video_duet"
                        )
                      }
                      aria-label="TikTok Video-Duett Match"
                      title="TikTok Video-Duett Match"
                      className="w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-800 text-amber-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center space-y-3">
                  <Heart className="w-10 h-10 text-rose-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Alle aktuellen 18+ Profile in diesem Filter angesehen
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Wechsle zu den <strong>TikTok Live-Matches</strong>,{" "}
                    <strong>TikTok Video-Matches</strong> oder setze deine
                    Swipe-Auswahl zurück.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPassedIds([]);
                        setSelectedValueFilter("Alle");
                        setMaxDistanceKm(500);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold min-h-[40px]"
                    >
                      Kartenstapel neu laden
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatingMode("tiktok_live")}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold min-h-[40px]"
                    >
                      Zu TikTok Live-Matches
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* MODE 2: TIKTOK 9:16 VIDEO-MATCH FEED (FOR-YOU VIDEO DATING) */}
          {datingMode === "tiktok_video" && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    TikTok 9:16 Video-Match-Feed (For You)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kurzvideos ansehen, direkt Video-Like oder Duett-Match
                    auslösen
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setVideoFeedIndex((i) =>
                        i > 0 ? i - 1 : profiles.length - 1
                      )
                    }
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label="Vorheriges Video"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVideoFeedIndex((i) => (i + 1) % profiles.length)
                    }
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    aria-label="Nächstes Video"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[380px] aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
                <SafeImage
                  src={currentVideoProfile.photoUrl}
                  alt={currentVideoProfile.displayName}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    videoPlaying ? "scale-[1.03]" : "scale-100"
                  }`}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/50" />

                {/* Top Progress & Sound Bar */}
                <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between text-xs text-white">
                  <span className="font-semibold">
                    For You · 18+ Video-Match
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideoPlaying((p) => !p)}
                    className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md flex items-center gap-1 text-[11px]"
                  >
                    {videoPlaying ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>{videoPlaying ? "Läuft" : "Pause"}</span>
                  </button>
                </div>

                {/* Right-Side TikTok Action Stack */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-3.5 text-white">
                  <button
                    type="button"
                    onClick={() =>
                      void triggerActionOnProfile(
                        currentVideoProfile,
                        "tiktok_match",
                        "tiktok_video",
                        "tiktok_video_duet"
                      )
                    }
                    className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px]"
                  >
                    <span className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                      <Heart className="w-6 h-6 fill-current" />
                    </span>
                    <span className="text-[10px] font-bold">Match</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void triggerActionOnProfile(
                        currentVideoProfile,
                        "super_like",
                        "tiktok_video",
                        "super_like"
                      )
                    }
                    className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px]"
                  >
                    <span className="w-11 h-11 rounded-full bg-black/65 backdrop-blur-md border border-amber-400/50 text-amber-300 flex items-center justify-center">
                      <Star className="w-5 h-5 fill-current" />
                    </span>
                    <span className="text-[10px] font-semibold">Funke</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setVideoFeedIndex((i) => (i + 1) % profiles.length)
                    }
                    className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px]"
                  >
                    <span className="w-11 h-11 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
                      <ChevronDown className="w-5 h-5" />
                    </span>
                    <span className="text-[10px]">Nächstes</span>
                  </button>
                </div>

                {/* Bottom-Left TikTok Creator Caption & Direct Match CTA */}
                <div className="absolute bottom-4 left-4 right-18 z-10 text-white space-y-2">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>
                      @{currentVideoProfile.handle} · {currentVideoProfile.age}
                    </span>
                    <span className="text-emerald-300 font-mono tabular-nums">
                      · {currentVideoProfile.city}
                    </span>
                  </div>

                  <p className="text-sm font-semibold leading-snug">
                    {currentVideoProfile.videoHookTitle}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-amber-200">
                    <Music2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {currentVideoProfile.tiktokSoundLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void triggerActionOnProfile(
                        currentVideoProfile,
                        "tiktok_match",
                        "tiktok_video",
                        "tiktok_video_duet"
                      )
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      TikTok Video-Match mit {currentVideoProfile.displayName}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* MODE 3: TIKTOK LIVE-MATCH SPLIT-SCREEN DUEL & SPEED-MATCH ARENA */}
          {datingMode === "tiktok_live" && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <Radio className="w-4 h-4" />
                    <span>
                      TIKTOK LIVE-MATCH ARENA ·{" "}
                      {liveMatchConnected
                        ? "Echtzeit-Synchronisation aktiv"
                        : "Verbinde Live-Match..."}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {currentLiveMatchRoom.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold">
                    {Math.floor(currentLiveMatchRoom.remainingSec / 60)}:
                    {String(currentLiveMatchRoom.remainingSec % 60).padStart(
                      2,
                      "0"
                    )}
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {currentLiveMatchRoom.viewerCount}
                  </span>
                </div>
              </div>

              {/* Room Switcher */}
              {liveMatchRoomsList.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {liveMatchRoomsList.map((rm) => (
                    <button
                      key={rm.roomId}
                      type="button"
                      onClick={() => {
                        setActiveLiveMatchRoomId(rm.roomId);
                        setCurrentLiveMatchRoom(rm);
                        liveMatchWsRef.current?.send(
                          JSON.stringify({
                            type: "dating:select_live_match",
                            matchRoomId: rm.roomId,
                          })
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        rm.roomId === currentLiveMatchRoom.roomId
                          ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {rm.regionLabel}
                    </button>
                  ))}
                </div>
              )}

              {/* TikTok Live Match Duel Power Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold font-mono tabular-nums">
                  <span className="text-rose-600 dark:text-rose-400">
                    {currentLiveMatchRoom.hostA.name}:{" "}
                    {currentLiveMatchRoom.hostA.score} Funken
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {currentLiveMatchRoom.hostB.name}:{" "}
                    {currentLiveMatchRoom.hostB.score} Funken
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-amber-500 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-fuchsia-600 transition-all duration-300"
                    style={{ width: `${hostAPct}%` }}
                  />
                </div>
              </div>

              {/* Split-Screen 2-Up TikTok Live Match Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { side: "A" as const, host: currentLiveMatchRoom.hostA },
                    { side: "B" as const, host: currentLiveMatchRoom.hostB },
                  ] as const
                ).map(({ side, host }) => (
                  <div
                    key={side}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800"
                  >
                    <SafeImage
                      src={host.photoUrl}
                      alt={host.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/45" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 font-bold">
                        LIVE CO-HOST {side}
                      </span>
                      <span className="font-mono tabular-nums bg-black/60 px-2 py-0.5 rounded-full">
                        {host.score} ♥
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 space-y-2 text-white">
                      <div>
                        <div className="text-sm font-bold">
                          {host.name}, {host.age} · {host.city}
                        </div>
                        <div className="text-[11px] text-amber-300">
                          {host.topicTag}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            liveMatchWsRef.current?.send(
                              JSON.stringify({
                                type: "dating:live_match_boost",
                                matchRoomId: currentLiveMatchRoom.roomId,
                                side,
                              })
                            )
                          }
                          className="py-2 px-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-md text-[11px] font-semibold min-h-[38px]"
                        >
                          +15 Funken
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTriggerLiveHostMatch(side)}
                          className="py-2 px-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[11px] font-bold min-h-[38px]"
                        >
                          Live-Match ♥
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-Time Chat inside TikTok Live Match Room */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Echtzeit-Chat im TikTok Live-Match
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {currentLiveMatchRoom.recentMessages.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs flex items-baseline justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-rose-600 dark:text-rose-400 mr-1.5">
                          {m.sender}:
                        </span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {m.text}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {m.timestamp}
                      </span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!liveMatchChatInput.trim()) return;
                    liveMatchWsRef.current?.send(
                      JSON.stringify({
                        type: "dating:live_match_chat",
                        matchRoomId: currentLiveMatchRoom.roomId,
                        sender: currentUser
                          ? currentUser.displayName
                          : "18+ Zuschauer",
                        text: liveMatchChatInput.trim(),
                      })
                    );
                    setLiveMatchChatInput("");
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={liveMatchChatInput}
                    onChange={(e) => setLiveMatchChatInput(e.target.value)}
                    placeholder="Nachricht in das Live-Match senden..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 min-h-[40px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Senden</span>
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* MODE 4: OWN 18+ DATING PROFILE EDITOR (FIRESTORE) */}
          {datingMode === "my_profile" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!currentUser || currentUser.ageGroup !== "adult") {
                  onOpenIdAustriaModal();
                  return;
                }
                setSavingProfile(true);
                setProfileError(null);
                setProfileFeedback(null);
                try {
                  await onSaveOwnDatingProfile({
                    displayName: myName.trim() || currentUser.displayName,
                    age: Math.max(18, Math.min(99, Number(myAge) || 26)),
                    city: myCity.trim() || "Wien",
                    bio: myBio.trim(),
                    photoUrl: myPhotoUrl,
                    videoHookTitle: myVideoHook.trim(),
                    sharedValues: myValues,
                  });
                  setProfileFeedback(
                    "Dein 18+ Dating- & TikTok-Match-Profil wurde in Firestore gespeichert."
                  );
                } catch (err) {
                  setProfileError(
                    err instanceof Error
                      ? err.message
                      : "Profil konnte nicht gespeichert werden."
                  );
                } finally {
                  setSavingProfile(false);
                }
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Eigenes 18+ Dating- & TikTok-Video-Match-Profil verwalten
                </h3>
                <p className="text-xs text-slate-500">
                  Nur für ID-Austria 18+ verifizierte Erwachsene sichtbar ·
                  DSGVO-konform
                </p>
              </div>

              {!isVerifiedAdult && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-amber-900 dark:text-amber-200">
                    Für das dauerhafte Veröffentlichen deines eigenen 18+
                    Dating-Profils in Firestore ist eine Anmeldung mit
                    ID-Austria 18+ Prüfung nötig.
                  </span>
                  <button
                    type="button"
                    onClick={onOpenIdAustriaModal}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                  >
                    Jetzt anmelden & prüfen
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Vorname / Anzeigename
                  </label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="z.B. Alex"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Alter (ab 18)
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={myAge}
                    onChange={(e) => setMyAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Stadt / Region
                  </label>
                  <input
                    type="text"
                    value={myCity}
                    onChange={(e) => setMyCity(e.target.value)}
                    placeholder="Wien, Graz, Linz..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Profilbild
                  </label>
                  <select
                    value={myPhotoUrl}
                    onChange={(e) => setMyPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    {PORTRAIT_CHOICES.map((p) => (
                      <option key={p.label} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    TikTok 9:16 Video-Match Hook
                  </label>
                  <input
                    type="text"
                    value={myVideoHook}
                    onChange={(e) => setMyVideoHook(e.target.value)}
                    maxLength={140}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Über mich & gemeinsame Werte
                </label>
                <textarea
                  rows={3}
                  value={myBio}
                  onChange={(e) => setMyBio(e.target.value)}
                  maxLength={400}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  required
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  Werte-Schwerpunkte (für kompatible Matches):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {YOUTH_SAFE_TOPICS.map((topic) => {
                    const active = myValues.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          setMyValues((prev) =>
                            prev.includes(topic)
                              ? prev.filter((t) => t !== topic)
                              : prev.length < 5
                              ? [...prev, topic]
                              : prev
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              {profileFeedback && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {profileFeedback}
                </p>
              )}
              {profileError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {profileError}
                </p>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold min-h-[42px]"
              >
                {savingProfile
                  ? "Speichere..."
                  : isVerifiedAdult
                  ? "18+ Dating-Profil in Firestore speichern"
                  : "Anmelden & 18+ Profil veröffentlichen"}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN (5 Cols): MUTUAL MATCHES STRIP + DIRECT MATCH CHAT + ICE RAGOTTI AI ICEBREAKERS */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mutual Matches List */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircleHeart className="w-4 h-4 text-rose-600" />
                <span>Deine Matches (Tinder & TikTok)</span>
              </h3>
              <span className="text-xs font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                {matches.length} aktiv
              </span>
            </div>

            {matches.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                Noch kein Match ausgewählt. Wische nach rechts, sende ein
                Super-Like oder matche über TikTok Video & Live!
              </p>
            ) : (
              <div className="flex items-start gap-3 overflow-x-auto pb-1">
                {matches.map((m) => {
                  const selected = m.id === selectedMatch?.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMatchId(m.id);
                        setAiIcebreakers([]);
                        setAiSafetyTip(null);
                      }}
                      className={`flex flex-col items-center gap-1.5 shrink-0 w-20 p-1.5 rounded-xl transition-colors ${
                        selected
                          ? "bg-rose-50 dark:bg-rose-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600">
                        <SafeImage
                          src={m.partnerPhotoUrl}
                          alt={m.partnerName}
                          className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate w-full text-center">
                        {m.partnerName}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {m.compatibilityPct} %
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Direct Match Chat + AI Icebreaker */}
          {selectedMatch && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <SafeImage
                    src={selectedMatch.partnerPhotoUrl}
                    alt={selectedMatch.partnerName}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-rose-500/40"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedMatch.partnerName}, {selectedMatch.partnerAge}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {MATCH_ORIGIN_LABELS[selectedMatch.matchOrigin]} ·{" "}
                      {selectedMatch.partnerCity}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenReportModal(
                      "user",
                      selectedMatch.partnerId,
                      `Match-Chat mit ${selectedMatch.partnerName}`
                    )
                  }
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                  aria-label="Match melden"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>

              {/* ICE Ragotti KI Icebreaker Generator */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGenerateAiIcebreakers}
                  disabled={loadingIcebreakers}
                  className="w-full py-2 px-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:opacity-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {loadingIcebreakers
                      ? "ICE Ragotti KI formuliert Eisbrecher..."
                      : "ICE Ragotti KI: 3 Gesprächs-Eisbrecher vorschlagen"}
                  </span>
                </button>

                {aiIcebreakers.length > 0 && (
                  <div className="space-y-1.5">
                    {aiIcebreakers.map((starter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMatchChatInput(starter)}
                        className="w-full text-left p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-slate-800 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        „{starter}“
                      </button>
                    ))}
                    {aiSafetyTip && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-0.5">
                        Schutzhinweis: {aiSafetyTip}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match Chat Messages */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {currentMatchMessages.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-300">
                    {selectedMatch.lastMessagePreview}
                  </div>
                ) : (
                  currentMatchMessages.map((msg) => {
                    const isSelf =
                      msg.senderId === (currentUser?.uid || "local_guest");
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          isSelf
                            ? "bg-rose-600 text-white ml-6"
                            : "bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                          <span className="font-bold">{msg.senderName}</span>
                          <span className="font-mono">{msg.timestampLabel}</span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Match Chat Composer */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!matchChatInput.trim()) return;
                  const text = matchChatInput.trim();
                  setMatchChatInput("");
                  await onSendMatchMessage(selectedMatch, text);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={matchChatInput}
                  onChange={(e) => setMatchChatInput(e.target.value)}
                  placeholder={`Nachricht an ${selectedMatch.partnerName} schreiben...`}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[42px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold flex items-center gap-1 min-h-[42px] shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Senden</span>
                </button>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* FULLSCREEN "IT'S A MATCH!" TINDER + TIKTOK HYBRID CELEBRATION OVERLAY */}
      {celebrationMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-celebration-title"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {MATCH_ORIGIN_LABELS[celebrationMatch.matchOrigin]} ·{" "}
              {celebrationMatch.compatibilityPct} % Übereinstimmung
            </div>

            <h3
              id="match-celebration-title"
              className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
            >
              It&apos;s a Match!
            </h3>

            {/* Side-by-side Dual Avatars */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600">
                <SafeImage
                  src={currentUser?.avatarUrl || MEDIA_ASSETS.avatarIceRagotti}
                  alt={currentUser?.displayName || "Du"}
                  className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                />
              </div>
              <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600">
                <SafeImage
                  src={celebrationMatch.partnerPhotoUrl}
                  alt={celebrationMatch.partnerName}
                  className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Du und <strong>{celebrationMatch.partnerName}</strong> (
              {celebrationMatch.partnerAge} · {celebrationMatch.partnerCity})
              habt euch gegenseitig geliked!
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const text =
                  celebrationNote.trim() ||
                  `Hallo ${celebrationMatch.partnerName}! Schön, dass wir gematcht haben.`;
                const target = celebrationMatch;
                setCelebrationNote("");
                setCelebrationMatch(null);
                setSelectedMatchId(target.id);
                await onSendMatchMessage(target, text);
              }}
              className="space-y-2.5"
            >
              <input
                type="text"
                value={celebrationNote}
                onChange={(e) => setCelebrationNote(e.target.value)}
                placeholder={`Eisbrecher an ${celebrationMatch.partnerName} schreiben...`}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[42px]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCelebrationMatch(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold min-h-[42px]"
                >
                  Weiter swipen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold min-h-[42px]"
                >
                  Nachricht senden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
