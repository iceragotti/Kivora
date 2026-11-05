import { useEffect, useRef, useState } from "react";
import {
  Bell,
  PhoneCall,
  Sun,
  Moon,
  ShieldCheck,
  Award,
  Home,
  Film,
  Radio,
  Lock,
  Sparkles,
  Flame,
} from "lucide-react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from "./lib/firebase";
import {
  computeSafetyFingerprint,
  decryptMessageE2EE,
  encryptMessageE2EE,
} from "./lib/crypto";
import {
  DEFAULT_VIDEO_PROJECT,
  INITIAL_DATING_MATCHES,
  INITIAL_DATING_PROFILES,
  INITIAL_NOTIFICATIONS,
  INITIAL_POSTS,
  INITIAL_REELS,
  INITIAL_STORIES,
} from "./lib/seedData";
import { MEDIA_ASSETS } from "./lib/mediaAssets";
import { SafeImage } from "./components/SafeImage";
import { FeedAndDashboardView } from "./components/FeedAndDashboardView";
import { ReelsAndVideoStudio } from "./components/ReelsAndVideoStudio";
import { LivestreamStudioView } from "./components/LivestreamStudioView";
import { DatingAndMatchesView } from "./components/DatingAndMatchesView";
import { EncryptedChatAndSafetyView } from "./components/EncryptedChatAndSafetyView";
import { IceRagottiAiView } from "./components/IceRagottiAiView";
import { ReportAndEmergencyModal } from "./components/ReportAndEmergencyModal";
import {
  AccountIdAustriaModal,
  type DsgvoRegistrationDraft,
} from "./components/AccountIdAustriaModal";
import type {
  BetaPreregistrationInput,
  BetaPreregistrationResult,
  CivicTopic,
  CommunityPost,
  DatingMatchChatMessage,
  DatingMatchOrigin,
  DatingMatchRecord,
  DatingProfileItem,
  DecryptedMessage,
  EncryptedChatThread,
  LiveStreamSummary,
  PostComment,
  PushNotificationItem,
  SafetyReportRecord,
  StoryItem,
  SubscriptionTier,
  UserPrivateIdentity,
  UserProfile,
  VerifiedBadgeType,
  VideoProject,
  VideoReel,
} from "./types/kivora";

type ActiveTab = "feed" | "studio" | "live" | "dating" | "chat" | "ai";

const INITIAL_LIVE_ROOMS_FALLBACK: LiveStreamSummary[] = [
  {
    streamId: "stream_civic_blackout",
    hostName: "ICE Ragotti · Kinderschutz & Krisenvorsorge",
    title:
      "Kinderschutz im Netz & Blackout-Vorsorge 2026 — Live-Analyse & Bürgerforum",
    topic: "Kinderschutz",
    platforms: [
      "KIVORA Native",
      "Instagram Live",
      "TikTok 9:16",
      "YouTube 16:9",
      "X Spaces",
    ],
    viewerCount: 1428,
    isLive: true,
  },
  {
    streamId: "stream_tierschutz_live",
    hostName: "Tierschutz-Allianz DACH · Live-Einsatz",
    title:
      "Tierschutz-Vollzug & Rettungseinsätze: Illegale Tiertransporte stoppen",
    topic: "Tierschutz",
    platforms: [
      "KIVORA Native",
      "Instagram Live",
      "TikTok 9:16",
      "YouTube 16:9",
    ],
    viewerCount: 864,
    isLive: true,
  },
  {
    streamId: "stream_frauen_maenner_live",
    hostName: "Schutznetz Österreich · Frauen- & Männerschutz",
    title:
      "Frauenschutz & Männerschutz gemeinsam denken: Gewaltschutz, Krisenhilfe & Recht",
    topic: "Frauenschutz",
    platforms: ["KIVORA Native", "Instagram Live", "TikTok 9:16", "X Spaces"],
    viewerCount: 1105,
    isLive: true,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("feed");
  const [darkMode, setDarkMode] = useState(false);
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("kivora_ai_avatar") || MEDIA_ASSETS.iceRagottiAi
      );
    } catch {
      return MEDIA_ASSETS.iceRagottiAi;
    }
  });

  const handleChangeAiAvatarUrl = (nextUrl: string) => {
    setAiAvatarUrl(nextUrl);
    try {
      if (nextUrl === MEDIA_ASSETS.iceRagottiAi) {
        localStorage.removeItem("kivora_ai_avatar");
      } else {
        localStorage.setItem("kivora_ai_avatar", nextUrl);
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  // Creator TikTok & Instagram Reach Channels
  const [tiktokHandle, setTiktokHandle] = useState<string>(() => {
    try {
      return localStorage.getItem("kivora_tiktok_handle") || "@ice.ragotti";
    } catch {
      return "@ice.ragotti";
    }
  });
  const [instagramHandle, setInstagramHandle] = useState<string>(() => {
    try {
      return localStorage.getItem("kivora_instagram_handle") || "@ice.ragotti";
    } catch {
      return "@ice.ragotti";
    }
  });
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);

  const handleUpdateSocialHandles = (nextTikTok: string, nextIg: string) => {
    const cleanTt = nextTikTok.trim()
      ? nextTikTok.trim().startsWith("@")
        ? nextTikTok.trim()
        : `@${nextTikTok.trim()}`
      : "@ice.ragotti";
    const cleanIg = nextIg.trim()
      ? nextIg.trim().startsWith("@")
        ? nextIg.trim()
        : `@${nextIg.trim()}`
      : "@ice.ragotti";
    setTiktokHandle(cleanTt);
    setInstagramHandle(cleanIg);
    try {
      localStorage.setItem("kivora_tiktok_handle", cleanTt);
      localStorage.setItem("kivora_instagram_handle", cleanIg);
    } catch {
      // Ignore storage errors
    }
  };

  // Auth & DSGVO User Profile State
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [privateIdentity, setPrivateIdentity] =
    useState<UserPrivateIdentity | null>(null);
  const [idAustriaBpkHash, setIdAustriaBpkHash] = useState<string>("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const pendingRegDraftRef = useRef<DsgvoRegistrationDraft | null>(null);

  // Feed, Stories, Reels, Comments
  const [firestorePosts, setFirestorePosts] = useState<CommunityPost[]>([]);
  const [firestoreStories, setFirestoreStories] = useState<StoryItem[]>([]);
  const [localStories, setLocalStories] = useState<StoryItem[]>([]);
  const [firestoreReels, setFirestoreReels] = useState<VideoReel[]>([]);
  const [localReels, setLocalReels] = useState<VideoReel[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, PostComment[]>
  >({
    post_seed_1: [
      {
        id: "c_seed_1",
        postId: "post_seed_1",
        authorId: "parent_vienna",
        authorName: "Sabine K. (Elternbeirat Wien)",
        text: "Endlich eine Plattform, auf der Kinder nicht mit 18+ Inhalten vermischt werden und Rat auf Draht direkt verankert ist.",
        createdAtLabel: "Vor 12 Min.",
      },
    ],
  });

  // Live Streams & Multi-Room Selection
  const [liveStreams, setLiveStreams] = useState<LiveStreamSummary[]>(
    INITIAL_LIVE_ROOMS_FALLBACK
  );
  const [selectedLiveStreamId, setSelectedLiveStreamId] = useState<string>(
    "stream_civic_blackout"
  );

  // Beta Pre-Registration State
  const [betaCount, setBetaCount] = useState<number>(1284);
  const [betaReceipt, setBetaReceipt] =
    useState<BetaPreregistrationResult | null>(null);

  // Video Projects (Cloud-Synced)
  const [savedProjects, setSavedProjects] = useState<VideoProject[]>([
    DEFAULT_VIDEO_PROJECT,
  ]);
  const [activeProject, setActiveProject] = useState<VideoProject>(
    DEFAULT_VIDEO_PROJECT
  );

  // Encrypted Chats & Messages
  const [chats, setChats] = useState<EncryptedChatThread[]>([
    {
      id: "chat_civic_1",
      ownerId: "system",
      peerId: "community_all",
      title: "Kinderschutz & Zivilcourage Aktionskanal",
      channelScope: "community",
      keyFingerprint: "A9F2-48C1-90E4-7B12",
      ephemeralSeconds: 0,
      passphrase: "KIVORA-CIVIC-CHANNEL-KEY-2026",
    },
    {
      id: "chat_blackout_2",
      ownerId: "system",
      peerId: "community_blackout",
      title: "Tierschutz, Frauen- & Männerschutz Hilfsnetz",
      channelScope: "community",
      keyFingerprint: "D41C-77E9-20B8-5F01",
      ephemeralSeconds: 0,
      passphrase: "KIVORA-BLACKOUT-MESH-KEY-2026",
    },
    {
      id: "chat_secret_3",
      ownerId: "system",
      peerId: "ice_ragotti_direct",
      title: "Geheimer Hinweis-Chat (Selbstlöschung 5 Min.)",
      channelScope: "secret_ephemeral",
      keyFingerprint: "91B0-33A7-E814-4C99",
      ephemeralSeconds: 300,
      passphrase: "KIVORA-SECRET-EPHEMERAL-2026",
    },
  ]);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, DecryptedMessage[]>
  >({});

  // 18+ Dating & TikTok-Matches State
  const [firestoreDatingProfiles, setFirestoreDatingProfiles] = useState<
    DatingProfileItem[]
  >([]);
  const [localDatingProfiles, setLocalDatingProfiles] = useState<
    DatingProfileItem[]
  >([]);
  const [firestoreDatingMatches, setFirestoreDatingMatches] = useState<
    DatingMatchRecord[]
  >([]);
  const [localDatingMatches, setLocalDatingMatches] = useState<
    DatingMatchRecord[]
  >(INITIAL_DATING_MATCHES);
  const [messagesByMatch, setMessagesByMatch] = useState<
    Record<string, DatingMatchChatMessage[]>
  >({
    match_seed_1: [
      {
        id: "mm_seed_1",
        matchId: "match_seed_1",
        senderId: "seed_clara",
        senderName: "Clara",
        text: "Hey! Unser 9:16 Video-Duet zum Ehrenamt im Kinderschutz hat richtig gut gepasst — Lust auf einen Kaffee an der Donau?",
        safetyStatus: "safe",
        timestampLabel: "Vor 14 Min.",
      },
    ],
    match_seed_2: [
      {
        id: "mm_seed_2",
        matchId: "match_seed_2",
        senderId: "seed_lukas",
        senderName: "Lukas",
        text: "Servus! Super Match im Tierschutz-Live — mein Golden Retriever Bruno sagt Hallo!",
        safetyStatus: "safe",
        timestampLabel: "Vor 32 Min.",
      },
    ],
  });

  // Push Notifications
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  // Safety Report Modal State
  const [reportModalState, setReportModalState] = useState<{
    isOpen: boolean;
    targetType: SafetyReportRecord["targetType"];
    targetId: string;
    targetTitle: string;
  }>({
    isOpen: false,
    targetType: "post",
    targetId: "",
    targetTitle: "",
  });

  const wsChatRef = useRef<WebSocket | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Fetch initial Livestream list & Beta waitlist status
  useEffect(() => {
    fetch("/api/livestreams")
      .then((r) => r.json())
      .then((data: { streams?: LiveStreamSummary[] }) => {
        if (Array.isArray(data.streams) && data.streams.length > 0) {
          setLiveStreams(data.streams);
        }
      })
      .catch(() => {});

    fetch("/api/beta/status")
      .then((r) => r.json())
      .then((data: { totalRegistered?: number }) => {
        if (typeof data.totalRegistered === "number") {
          setBetaCount(data.totalRegistered);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize initial encrypted messages for seed chats
  useEffect(() => {
    async function seedEncryptedDemoMessages() {
      const chat1 = chats[0];
      const chat2 = chats[1];
      const enc1 = await encryptMessageE2EE(
        "Willkommen im verschlüsselten Kinderschutz-Kanal. Alle Nachrichten sind clientseitig AES-256-GCM geschützt.",
        chat1.passphrase,
        chat1.id
      );
      const enc2 = await encryptMessageE2EE(
        "Update aus der Schutz-Allianz: Tierschutz-Vereine, Frauenhäuser und Männerberatung sind jetzt direkt im KIVORA-Netzwerk verknüpft.",
        chat2.passphrase,
        chat2.id
      );
      setMessagesByChat({
        [chat1.id]: [
          {
            id: "m_seed_1",
            chatId: chat1.id,
            senderId: "ice_ragotti_official",
            senderName: "ICE Ragotti · Moderation",
            plaintext:
              "Willkommen im verschlüsselten Kinderschutz-Kanal. Alle Nachrichten sind clientseitig AES-256-GCM geschützt.",
            ciphertext: enc1.ciphertext,
            iv: enc1.iv,
            safetyStatus: "safe",
            timestampLabel: "Vor 10 Min.",
          },
        ],
        [chat2.id]: [
          {
            id: "m_seed_2",
            chatId: chat2.id,
            senderId: "zivilschutz_at",
            senderName: "Schutznetz-Koordination",
            plaintext:
              "Update aus der Schutz-Allianz: Tierschutz-Vereine, Frauenhäuser und Männerberatung sind jetzt direkt im KIVORA-Netzwerk verknüpft.",
            ciphertext: enc2.ciphertext,
            iv: enc2.iv,
            safetyStatus: "safe",
            timestampLabel: "Vor 25 Min.",
          },
        ],
      });
    }
    seedEncryptedDemoMessages();
  }, []);

  // Listen to real-time WebSocket encrypted messages, new reels, and live stream rooms
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsChatRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          chatId?: string;
          allRooms?: LiveStreamSummary[];
          reel?: VideoReel;
          encryptedEnvelope?: {
            id: string;
            senderId: string;
            senderName: string;
            ciphertext: string;
            iv: string;
            safetyStatus: "safe" | "warning" | "blocked";
            safetyReason?: string;
          };
        };

        if (Array.isArray(msg.allRooms) && msg.allRooms.length > 0) {
          setLiveStreams(msg.allRooms);
        }

        if (msg.type === "reel:published" && msg.reel) {
          const incomingReel = msg.reel;
          setLocalReels((prev) => {
            if (prev.some((r) => r.id === incomingReel.id)) return prev;
            return [incomingReel, ...prev];
          });
          setNotifications((prev) => [
            {
              id: `notif_${Date.now()}`,
              category: "community",
              title: `Neues Reel in ${incomingReel.topic}`,
              detail: `${incomingReel.authorName}: ${incomingReel.title}`,
              timestamp: "Gerade eben",
              read: false,
            },
            ...prev,
          ]);
        }

        if (
          msg.type === "chat:encrypted_message" &&
          msg.chatId &&
          msg.encryptedEnvelope
        ) {
          const targetChat = chats.find((c) => c.id === msg.chatId);
          if (!targetChat) return;

          const env = msg.encryptedEnvelope;
          const plaintext =
            env.safetyStatus === "blocked"
              ? "[Nachricht durch KI-Kinderschutzschild blockiert]"
              : await decryptMessageE2EE(
                  env.ciphertext,
                  env.iv,
                  targetChat.passphrase,
                  targetChat.id
                );

          setMessagesByChat((prev) => {
            const existingList = prev[targetChat.id] || [];
            if (existingList.some((m) => m.id === env.id)) return prev;
            return {
              ...prev,
              [targetChat.id]: [
                ...existingList,
                {
                  id: env.id,
                  chatId: targetChat.id,
                  senderId: env.senderId,
                  senderName: env.senderName,
                  plaintext,
                  ciphertext: env.ciphertext,
                  iv: env.iv,
                  safetyStatus: env.safetyStatus,
                  safetyReason: env.safetyReason,
                  timestampLabel: "Gerade eben",
                },
              ],
            };
          });

          setNotifications((prev) => [
            {
              id: `notif_${Date.now()}`,
              category: env.safetyStatus === "safe" ? "community" : "safety",
              title: `Verschlüsselte Nachricht in ${targetChat.title}`,
              detail: `${env.senderName}: ${plaintext.slice(0, 70)}`,
              timestamp: "Gerade eben",
              read: false,
            },
            ...prev,
          ]);
        }
      } catch {
        // Ignore non-chat frames
      }
    };

    return () => ws.close();
  }, [chats]);

  // Firebase Auth State Listener & DSGVO-Compliant User Profile Loader
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setPrivateIdentity(null);
        setIdAustriaBpkHash("");
        setAuthReady(true);
        return;
      }

      const userPath = `users/${fbUser.uid}`;
      const privPath = `users/${fbUser.uid}/private/identity`;

      try {
        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const regDraft = pendingRegDraftRef.current;
          const rawHandle =
            regDraft?.handle ||
            fbUser.email?.split("@")[0] ||
            fbUser.displayName ||
            "kivora_user";
          const cleanHandle =
            rawHandle.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 28) ||
            "kivora_user";
          const chosenDisplayName = (
            regDraft?.displayName ||
            fbUser.displayName ||
            "KIVORA Mitglied"
          ).slice(0, 60);
          const chosenTopics =
            regDraft && regDraft.protectionFocus.length > 0
              ? regDraft.protectionFocus.slice(0, 6)
              : ["Kinderschutz", "Tierschutz", "Frauenschutz", "Männerschutz"];
          const chosenBirthYear =
            regDraft &&
            regDraft.birthYear >= 1910 &&
            regDraft.birthYear <= 2026
              ? Math.floor(regDraft.birthYear)
              : 2010;

          await setDoc(userRef, {
            uid: fbUser.uid,
            displayName: chosenDisplayName,
            handle: cleanHandle.length >= 2 ? cleanHandle : `u_${cleanHandle}`,
            bio: "Aktiv auf KIVORA für Kinderschutz, Tierschutz, Frauen- & Männerschutz.",
            avatarUrl: fbUser.photoURL || MEDIA_ASSETS.avatarIceRagotti,
            verifiedBadge: "none",
            idAustriaVerified: false,
            ageGroup: "minor",
            subscriptionTier: "free",
            topics: chosenTopics,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await setDoc(doc(db, "users", fbUser.uid, "private", "identity"), {
            uid: fbUser.uid,
            email: fbUser.email || "",
            idAustriaBpkHash: "",
            birthYear: chosenBirthYear,
            dsgvoConsent: regDraft?.dsgvoConsent ?? true,
            dsgvoConsentVersion: "DSGVO-2026-v1",
            dsgvoConsentTimestamp: new Date().toISOString(),
            analyticsOptIn: regDraft?.analyticsOptIn ?? false,
            childSafetyShield: true,
            protectionFocus: chosenTopics,
            updatedAt: serverTimestamp(),
          });
          pendingRegDraftRef.current = null;
        }

        const freshSnap = await getDoc(userRef);
        const data = freshSnap.data();
        if (data) {
          setCurrentUser({
            uid: fbUser.uid,
            displayName: data.displayName || "KIVORA Mitglied",
            handle: data.handle || "kivora_user",
            bio: data.bio || "",
            avatarUrl: data.avatarUrl || MEDIA_ASSETS.avatarIceRagotti,
            verifiedBadge: data.verifiedBadge || "none",
            idAustriaVerified: Boolean(data.idAustriaVerified),
            ageGroup: data.ageGroup || "minor",
            subscriptionTier: data.subscriptionTier || "free",
            topics: Array.isArray(data.topics) ? data.topics : [],
          });
        }

        const privSnap = await getDoc(
          doc(db, "users", fbUser.uid, "private", "identity")
        );
        if (privSnap.exists()) {
          const pData = privSnap.data();
          setPrivateIdentity({
            uid: fbUser.uid,
            email: pData.email || fbUser.email || "",
            idAustriaBpkHash: pData.idAustriaBpkHash || "",
            birthYear: Number(pData.birthYear || 2010),
            dsgvoConsent: Boolean(pData.dsgvoConsent),
            dsgvoConsentVersion:
              pData.dsgvoConsentVersion || "DSGVO-2026-v1",
            dsgvoConsentTimestamp: pData.dsgvoConsentTimestamp || "",
            analyticsOptIn: Boolean(pData.analyticsOptIn),
            childSafetyShield: Boolean(pData.childSafetyShield),
            protectionFocus: Array.isArray(pData.protectionFocus)
              ? pData.protectionFocus
              : [],
          });
          setIdAustriaBpkHash(pData.idAustriaBpkHash || "");
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath || privPath);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Firestore Real-Time Listeners for Youth-Safe Posts, Reels & Stories (only after authReady)
  useEffect(() => {
    if (!authReady) return;

    const postsQuery = query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      where("isAdultOnly", "==", false)
    );
    const unsubPosts = onSnapshot(
      postsQuery,
      (snap) => {
        const list: CommunityPost[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId,
            authorName: data.authorName,
            authorHandle: data.authorHandle,
            authorVerified: data.authorVerified || "none",
            topic: data.topic,
            title: data.title,
            body: data.body,
            mediaUrl: data.mediaUrl || undefined,
            isAdultOnly: false,
            visibility: "public",
            likesCount: Number(data.likesCount || 0),
            commentsCount: Number(data.commentsCount || 0),
            aiFactNote: data.aiFactNote || undefined,
            createdAtLabel: "Gerade eben · Cloud",
            isFromFirestore: true,
          };
        });
        setFirestorePosts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "posts");
      }
    );

    const reelsQuery = query(
      collection(db, "reels"),
      where("visibility", "==", "public"),
      where("isAdultOnly", "==", false)
    );
    const unsubReels = onSnapshot(
      reelsQuery,
      (snap) => {
        const list: VideoReel[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId,
            authorName: data.authorName,
            topic: data.topic,
            title: data.title,
            coverUrl: data.coverUrl || MEDIA_ASSETS.youthProtection,
            filterPreset: data.filterPreset || "Insta Warm Protection",
            captionSummary: data.captionSummary || "",
            isAdultOnly: false,
            likesCount: Number(data.likesCount || 0),
            createdAtLabel: "Cloud-Reel",
          };
        });
        setFirestoreReels(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reels");
      }
    );

    const storiesQuery = query(
      collection(db, "stories"),
      where("visibility", "==", "public"),
      where("isAdultOnly", "==", false)
    );
    const unsubStories = onSnapshot(
      storiesQuery,
      (snap) => {
        const list: StoryItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId,
            authorName: data.authorName,
            topic: data.topic,
            headline: data.headline,
            mediaUrl: data.mediaUrl || MEDIA_ASSETS.youthProtection,
            isAdultOnly: false,
            createdAtLabel: "24h Story",
          };
        });
        setFirestoreStories(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "stories");
      }
    );

    return () => {
      unsubPosts();
      unsubReels();
      unsubStories();
    };
  }, [authReady]);

  // Load Owner-Private Cloud Video Projects when signed in
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const projQuery = query(
      collection(db, "video_projects"),
      where("ownerId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(
      projQuery,
      (snap) => {
        if (snap.empty) return;
        const list: VideoProject[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            title: data.title,
            aspectRatio: data.aspectRatio,
            filterPreset: data.filterPreset,
            filterSettings: data.filterSettings,
            aiRecommendedFilter: data.aiRecommendedFilter || "",
            captions: Array.isArray(data.captions) ? data.captions : [],
            clips: Array.isArray(data.clips) ? data.clips : [],
            exportFormats: Array.isArray(data.exportFormats)
              ? data.exportFormats
              : [],
            lastSyncedLabel: "Cloud-Synchronisiert (Firestore)",
          };
        });
        setSavedProjects(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "video_projects");
      }
    );
    return () => unsub();
  }, [authReady, currentUser]);

  // Firestore Real-Time Listeners for 18+ Verified Adult Dating Profiles & Matches
  useEffect(() => {
    if (!authReady || !currentUser || currentUser.ageGroup !== "adult") {
      setFirestoreDatingProfiles([]);
      setFirestoreDatingMatches([]);
      return;
    }

    const profilesQuery = query(
      collection(db, "dating_profiles"),
      where("isActive", "==", true),
      where("adultAgeConfirmed", "==", true)
    );
    const unsubProfiles = onSnapshot(
      profilesQuery,
      (snap) => {
        const list: DatingProfileItem[] = snap.docs
          .filter((d) => d.data().uid !== currentUser.uid)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid,
              displayName: data.displayName,
              handle: data.handle,
              age: Number(data.age || 24),
              city: data.city || "Wien",
              distanceKm: Number(data.distanceKm || 12),
              bio: data.bio || "",
              photoUrl: data.photoUrl || MEDIA_ASSETS.datingClara,
              videoHookTitle:
                data.videoHookTitle || "18+ KIVORA Video-Match Profil",
              videoFilterPreset:
                data.videoFilterPreset || "Warmes Tageslicht",
              tiktokSoundLabel:
                data.tiktokSoundLabel || "KIVORA Originalton · 18+ Community",
              sharedValues: Array.isArray(data.sharedValues)
                ? data.sharedValues
                : [],
              promptQuestion:
                data.promptQuestion ||
                "Welches gesellschaftliche Thema verbindet uns?",
              promptAnswer:
                data.promptAnswer ||
                data.bio ||
                "Respekt, Schutz und ehrliche Begegnungen auf KIVORA.",
              idAustriaVerified: true,
              likesBackOnSwipe: true,
              isFromFirestore: true,
            };
          });
        setFirestoreDatingProfiles(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "dating_profiles");
      }
    );

    const matchesQueryA = query(
      collection(db, "dating_matches"),
      where("userAId", "==", currentUser.uid)
    );
    const unsubMatchesA = onSnapshot(
      matchesQueryA,
      (snap) => {
        const list: DatingMatchRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userAId: data.userAId,
            userBId: data.userBId,
            partnerId: data.userBId || d.id,
            partnerName: data.partnerName,
            partnerHandle: data.partnerHandle,
            partnerAge: Number(data.partnerAge || 24),
            partnerCity: data.partnerCity || "Wien",
            partnerPhotoUrl: data.partnerPhotoUrl || MEDIA_ASSETS.datingClara,
            matchOrigin: data.matchOrigin || "tinder_swipe",
            compatibilityPct: Number(data.compatibilityPct || 91),
            lastMessagePreview:
              data.lastMessagePreview || "Neues 18+ Match — starte den Chat!",
            createdAtLabel: "Cloud-Match (18+)",
            isFromFirestore: true,
          };
        });
        setFirestoreDatingMatches(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "dating_matches");
      }
    );

    return () => {
      unsubProfiles();
      unsubMatchesA();
    };
  }, [authReady, currentUser]);

  // Firestore Real-Time Listeners for Persisted 18+ Match Messages
  useEffect(() => {
    if (
      !authReady ||
      !currentUser ||
      currentUser.ageGroup !== "adult" ||
      firestoreDatingMatches.length === 0
    ) {
      return;
    }

    const unsubs = firestoreDatingMatches
      .filter((m) => !m.id.startsWith("match_seed_"))
      .map((match) => {
        const msgQuery = query(
          collection(db, "dating_matches", match.id, "messages"),
          where("matchId", "==", match.id),
          where("userAId", "==", match.userAId)
        );
        return onSnapshot(
          msgQuery,
          (snap) => {
            const list: DatingMatchChatMessage[] = snap.docs
              .map((d) => {
                const data = d.data();
                const createdSec =
                  typeof data.createdAt?.seconds === "number"
                    ? data.createdAt.seconds
                    : 0;
                return {
                  id: d.id,
                  matchId: match.id,
                  senderId: data.senderId,
                  senderName: data.senderName || "18+ Mitglied",
                  text: data.text || "",
                  safetyStatus: data.safetyStatus || "safe",
                  timestampLabel: "Cloud-Chat (18+)",
                  _sortTs: createdSec,
                };
              })
              .sort((a, b) => a._sortTs - b._sortTs)
              .map(({ _sortTs: _ignored, ...rest }) => rest);

            setMessagesByMatch((prev) => ({
              ...prev,
              [match.id]: list,
            }));
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.LIST,
              `dating_matches/${match.id}/messages`
            );
          }
        );
      });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, currentUser, firestoreDatingMatches]);

  // --- Action Handlers ---
  const handleGoogleSignIn = async (draft?: DsgvoRegistrationDraft) => {
    if (draft) {
      pendingRegDraftRef.current = draft;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setAccountModalOpen(false);
  };

  const handleSubmitBetaPreregistration = async (
    input: BetaPreregistrationInput
  ): Promise<BetaPreregistrationResult> => {
    const res = await fetch("/api/beta/preregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      registered?: boolean;
      ticketCode?: string;
      totalRegistered?: number;
      dsgvoVersion?: string;
      error?: string;
    };

    if (!res.ok || !data.ticketCode) {
      throw new Error(
        data.error || "Beta-Vorregistrierung konnte nicht gespeichert werden."
      );
    }

    const regId = `reg_${Date.now()}`;
    try {
      await setDoc(doc(db, "beta_preregistrations", regId), {
        id: regId,
        ...(auth.currentUser ? { userId: auth.currentUser.uid } : {}),
        displayName: input.displayName.trim().slice(0, 60),
        email: input.email.trim().slice(0, 160),
        focusTopic: input.focusTopic,
        platformInterest: input.platformInterest,
        dsgvoConsent: true,
        dsgvoConsentVersion: "DSGVO-2026-v1",
        status: "registered",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `beta_preregistrations/${regId}`
      );
    }

    const receipt: BetaPreregistrationResult = {
      ticketCode: data.ticketCode,
      totalRegistered: Number(data.totalRegistered || betaCount + 1),
      focusTopic: input.focusTopic,
      platformInterest: input.platformInterest,
      dsgvoVersion: data.dsgvoVersion || "DSGVO-2026-v1",
    };

    setBetaCount(receipt.totalRegistered);
    setBetaReceipt(receipt);
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        category: "verification",
        title: `Beta-Vorregistrierung bestätigt (${receipt.ticketCode})`,
        detail: `Schwerpunkt: ${receipt.focusTopic} · DSGVO-Einwilligung gespeichert`,
        timestamp: "Gerade eben",
        read: false,
      },
      ...prev,
    ]);

    return receipt;
  };

  const handleSelectLiveStream = (streamId: string) => {
    setSelectedLiveStreamId(streamId);
    setActiveTab("live");
  };

  const handleCompleteIdAustriaVerify = async (input: {
    birthYear: number;
    tanCode: string;
    citizenName: string;
  }) => {
    if (!currentUser || !auth.currentUser) {
      throw new Error("Bitte melde dich zuerst an.");
    }

    const res = await fetch("/api/auth/id-austria/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: currentUser.uid,
        birthYear: input.birthYear,
        tanCode: input.tanCode,
        citizenName: input.citizenName,
      }),
    });
    const data = (await res.json()) as {
      verified?: boolean;
      idAustriaBpkHash?: string;
      ageGroup?: "minor" | "adult";
      birthYear?: number;
      error?: string;
    };

    if (!res.ok || !data.verified || !data.idAustriaBpkHash) {
      throw new Error(data.error || "ID-Austria Prüfung fehlgeschlagen.");
    }

    const batch = writeBatch(db);
    const privRef = doc(db, "users", currentUser.uid, "private", "identity");
    const userRef = doc(db, "users", currentUser.uid);

    batch.set(privRef, {
      uid: currentUser.uid,
      email: auth.currentUser.email || privateIdentity?.email || "",
      idAustriaBpkHash: data.idAustriaBpkHash,
      birthYear: Number(input.birthYear),
      dsgvoConsent: privateIdentity?.dsgvoConsent ?? true,
      dsgvoConsentVersion:
        privateIdentity?.dsgvoConsentVersion || "DSGVO-2026-v1",
      dsgvoConsentTimestamp:
        privateIdentity?.dsgvoConsentTimestamp || new Date().toISOString(),
      analyticsOptIn: privateIdentity?.analyticsOptIn ?? false,
      childSafetyShield: true,
      protectionFocus:
        privateIdentity?.protectionFocus &&
        privateIdentity.protectionFocus.length > 0
          ? privateIdentity.protectionFocus
          : ["Kinderschutz", "Tierschutz", "Frauenschutz", "Männerschutz"],
      updatedAt: serverTimestamp(),
    });

    batch.update(userRef, {
      idAustriaVerified: true,
      ageGroup: data.ageGroup || "minor",
      verifiedBadge: "id_austria",
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setIdAustriaBpkHash(data.idAustriaBpkHash);
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              idAustriaVerified: true,
              ageGroup: data.ageGroup || "minor",
              verifiedBadge: "id_austria",
            }
          : null
      );
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          category: "verification",
          title: "ID-Austria Identität verifiziert",
          detail:
            data.ageGroup === "adult"
              ? "Volljährigkeit (18+) bestätigt. Getrennter 18+ Bereich freigeschaltet."
              : "Jugendschutz-Modus (<18) aktiv. Alle 18+ Inhalte bleiben strikt getrennt.",
          timestamp: "Gerade eben",
          read: false,
        },
        ...prev,
      ]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const handleCreatePost = async (input: {
    topic: CivicTopic;
    title: string;
    body: string;
    mediaUrl?: string;
    isAdultOnly: boolean;
    aiFactNote?: string;
  }) => {
    if (!currentUser) return;
    const postId = `post_${Date.now()}`;
    try {
      await setDoc(doc(db, "posts", postId), {
        id: postId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorHandle: currentUser.handle,
        authorVerified: currentUser.verifiedBadge,
        topic: input.topic,
        title: input.title,
        body: input.body,
        mediaUrl: input.mediaUrl || MEDIA_ASSETS.heroCivic,
        isAdultOnly: false,
        visibility: "public",
        likesCount: 0,
        commentsCount: 0,
        aiFactNote: input.aiFactNote || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}`);
    }
  };

  const handleCreateStory = async (input: {
    topic: CivicTopic;
    headline: string;
    mediaUrl: string;
    isEphemeralSnap?: boolean;
    snapDurationSec?: number;
    snapFilterLabel?: string;
  }) => {
    if (!currentUser) return;
    const storyId = `story_${Date.now()}`;
    const newStoryItem: StoryItem = {
      id: storyId,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      topic: input.topic,
      headline: input.headline,
      mediaUrl: input.mediaUrl,
      isAdultOnly: false,
      createdAtLabel: input.isEphemeralSnap
        ? `${input.snapDurationSec || 8}s Snap · Gerade eben`
        : "24h Story · Gerade eben",
      isEphemeralSnap: input.isEphemeralSnap,
      snapDurationSec: input.snapDurationSec,
      snapFilterLabel: input.snapFilterLabel,
    };
    setLocalStories((prev) => [newStoryItem, ...prev]);

    try {
      await setDoc(doc(db, "stories", storyId), {
        id: storyId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        topic: input.topic,
        headline: input.headline,
        mediaUrl: input.mediaUrl,
        isAdultOnly: false,
        visibility: "public",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
    }
  };

  const handleLikePost = async (post: CommunityPost) => {
    if (!currentUser || !post.isFromFirestore) return;
    try {
      await updateDoc(doc(db, "posts", post.id), {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) return;
    const commentId = `comment_${Date.now()}`;
    const newComment: PostComment = {
      id: commentId,
      postId,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      text,
      createdAtLabel: "Gerade eben",
    };

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));

    const isFirestorePost = firestorePosts.some((p) => p.id === postId);
    if (isFirestorePost) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "posts", postId, "comments", commentId), {
          id: commentId,
          postId,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          text,
          createdAt: serverTimestamp(),
        });
        batch.update(doc(db, "posts", postId), {
          commentsCount: increment(1),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `posts/${postId}/comments/${commentId}`
        );
      }
    }
  };

  const handleSaveProjectToCloud = async (proj: VideoProject) => {
    if (!currentUser) return;
    const projId = proj.id.startsWith("proj_") ? proj.id : `proj_${Date.now()}`;
    try {
      await setDoc(doc(db, "video_projects", projId), {
        id: projId,
        ownerId: currentUser.uid,
        title: proj.title.slice(0, 120),
        aspectRatio: proj.aspectRatio,
        filterPreset: proj.filterPreset.slice(0, 60),
        filterSettings: {
          brightness: Number(proj.filterSettings.brightness),
          contrast: Number(proj.filterSettings.contrast),
          saturation: Number(proj.filterSettings.saturation),
          warmth: Number(proj.filterSettings.warmth),
          vignette: Number(proj.filterSettings.vignette),
        },
        aiRecommendedFilter: proj.aiRecommendedFilter.slice(0, 120),
        captions: proj.captions.slice(0, 50),
        clips: proj.clips.slice(0, 20),
        exportFormats: proj.exportFormats.slice(0, 10),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `video_projects/${projId}`
      );
    }
  };

  const handlePublishReel = async (input: {
    topic: CivicTopic;
    title: string;
    filterPreset: string;
    captionSummary: string;
    coverUrl: string;
    videoUrl?: string;
    durationLabel?: string;
  }) => {
    const reelId = `reel_${Date.now()}`;
    const safeCoverUrl =
      input.coverUrl &&
      input.coverUrl.length <= 480 &&
      !input.coverUrl.startsWith("blob:")
        ? input.coverUrl
        : MEDIA_ASSETS.youthProtection;

    const newLocalReel: VideoReel = {
      id: reelId,
      authorId: currentUser?.uid || "kivora_creator",
      authorName: currentUser?.displayName || "KIVORA Creator",
      topic: input.topic,
      title: input.title.slice(0, 140),
      coverUrl: safeCoverUrl,
      videoUrl: input.videoUrl,
      durationLabel: input.durationLabel || "0:15",
      filterPreset: input.filterPreset.slice(0, 60),
      captionSummary: input.captionSummary.slice(0, 600),
      isAdultOnly: false,
      likesCount: 0,
      createdAtLabel: "Gerade eben",
    };

    // Immediately make uploaded Reel playable & visible at top of feed
    setLocalReels((prev) => [newLocalReel, ...prev]);

    wsChatRef.current?.send(
      JSON.stringify({
        type: "reel:published",
        reel: { ...newLocalReel, videoUrl: undefined },
      })
    );

    if (currentUser) {
      try {
        await setDoc(doc(db, "reels", reelId), {
          id: reelId,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          topic: input.topic,
          title: input.title.slice(0, 140),
          coverUrl: safeCoverUrl,
          filterPreset: input.filterPreset.slice(0, 60),
          captionSummary: input.captionSummary.slice(0, 600),
          isAdultOnly: false,
          visibility: "public",
          likesCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `reels/${reelId}`);
      }
    }
  };

  const handleLikeReel = async (reel: VideoReel) => {
    if (!currentUser) return;
    const existsInFs = firestoreReels.some((r) => r.id === reel.id);
    if (!existsInFs) return;
    try {
      await updateDoc(doc(db, "reels", reel.id), {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reels/${reel.id}`);
    }
  };

  const handleSendEncryptedMessage = async (input: {
    chat: EncryptedChatThread;
    plaintext: string;
    ciphertext: string;
    iv: string;
    safetyStatus: "safe" | "warning" | "blocked";
    safetyReason?: string;
  }) => {
    if (!currentUser) return;
    const msgId = `msg_${Date.now()}`;

    setMessagesByChat((prev) => ({
      ...prev,
      [input.chat.id]: [
        ...(prev[input.chat.id] || []),
        {
          id: msgId,
          chatId: input.chat.id,
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          plaintext: input.plaintext,
          ciphertext: input.ciphertext,
          iv: input.iv,
          safetyStatus: input.safetyStatus,
          safetyReason: input.safetyReason,
          timestampLabel: "Gerade eben",
        },
      ],
    }));

    wsChatRef.current?.send(
      JSON.stringify({
        type: "chat:encrypted_message",
        chatId: input.chat.id,
        encryptedEnvelope: {
          id: msgId,
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          ciphertext: input.ciphertext,
          iv: input.iv,
          safetyStatus: input.safetyStatus,
          safetyReason: input.safetyReason,
        },
      })
    );

    try {
      const chatRef = doc(db, "chats", input.chat.id);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          id: input.chat.id,
          ownerId: currentUser.uid,
          peerId: input.chat.peerId,
          title: input.chat.title,
          channelScope: input.chat.channelScope,
          keyFingerprint: input.chat.keyFingerprint,
          ephemeralSeconds: input.chat.ephemeralSeconds,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const freshChat = await getDoc(chatRef);
      const cData = freshChat.data();
      if (cData) {
        await setDoc(doc(db, "chats", input.chat.id, "messages", msgId), {
          id: msgId,
          chatId: input.chat.id,
          chatOwnerId: cData.ownerId,
          chatPeerId: cData.peerId,
          chatScope: cData.channelScope,
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          ciphertext: input.ciphertext,
          iv: input.iv,
          safetyStatus: input.safetyStatus,
          safetyReason: input.safetyReason || "",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `chats/${input.chat.id}/messages/${msgId}`
      );
    }
  };

  const handleCreateSecretChat = async (
    title: string,
    ephemeralSeconds: number
  ) => {
    if (!currentUser) return;
    const chatId = `chat_${Date.now()}`;
    const passphrase = `KIVORA-${chatId}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const fp = await computeSafetyFingerprint(passphrase, chatId);

    const newThread: EncryptedChatThread = {
      id: chatId,
      ownerId: currentUser.uid,
      peerId: currentUser.uid,
      title,
      channelScope: ephemeralSeconds > 0 ? "secret_ephemeral" : "direct",
      keyFingerprint: fp,
      ephemeralSeconds,
      passphrase,
    };

    setChats((prev) => [newThread, ...prev]);

    try {
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        ownerId: currentUser.uid,
        peerId: currentUser.uid,
        title: title.slice(0, 100),
        channelScope: newThread.channelScope,
        keyFingerprint: fp,
        ephemeralSeconds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const handleSubmitSafetyReport = async (
    report: Omit<SafetyReportRecord, "id" | "status" | "timestamp">
  ): Promise<string> => {
    const reportId = `rep_${Date.now()}`;
    if (currentUser) {
      try {
        await setDoc(doc(db, "safety_reports", reportId), {
          id: reportId,
          reporterId: currentUser.uid,
          targetType: report.targetType,
          targetId: report.targetId.slice(0, 128),
          category: report.category,
          details: report.details.slice(0, 2000),
          authorityRouting: report.authorityRouting,
          status:
            report.authorityRouting === "polizei_133_bkms" ||
            report.authorityRouting === "rat_auf_draht_147"
              ? "escalated"
              : "submitted",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `safety_reports/${reportId}`
        );
      }
    }

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        category: "safety",
        title: `Schutzmeldung protokolliert (${reportId})`,
        detail: `Kategorie: ${report.category}`,
        timestamp: "Gerade eben",
        read: false,
      },
      ...prev,
    ]);

    return reportId;
  };

  const handleSubmitVerificationRequest = async (input: {
    badgeType: Exclude<VerifiedBadgeType, "none">;
    organizationOrRole: string;
    proofSummary: string;
  }) => {
    if (!currentUser) return;
    const reqId = `ver_${Date.now()}`;
    try {
      await setDoc(doc(db, "verification_requests", reqId), {
        id: reqId,
        userId: currentUser.uid,
        badgeType: input.badgeType,
        organizationOrRole: input.organizationOrRole,
        proofSummary: input.proofSummary,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `verification_requests/${reqId}`
      );
    }
  };

  const handleActivateSubscription = async (input: {
    tier: SubscriptionTier;
    billingCycle: "monthly" | "annual";
    causeAllocation:
      | "Kinderschutz"
      | "Tierschutz"
      | "Frauenschutz"
      | "Männerschutz"
      | "Krisenvorsorge";
  }) => {
    if (!currentUser) return;
    const subId = `sub_${Date.now()}`;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "subscriptions", subId), {
        id: subId,
        userId: currentUser.uid,
        tier: input.tier,
        billingCycle: input.billingCycle,
        causeAllocation: input.causeAllocation,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, "users", currentUser.uid), {
        subscriptionTier: input.tier,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setCurrentUser((prev) =>
        prev ? { ...prev, subscriptionTier: input.tier } : null
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `subscriptions/${subId}`);
    }
  };

  const handleUpdateDsgvoSettings = async (input: {
    dsgvoConsent: boolean;
    analyticsOptIn: boolean;
    childSafetyShield: boolean;
  }) => {
    if (!currentUser || !auth.currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid, "private", "identity"), {
        uid: currentUser.uid,
        email: auth.currentUser.email || privateIdentity?.email || "",
        idAustriaBpkHash: idAustriaBpkHash || "",
        birthYear: privateIdentity?.birthYear || 2010,
        dsgvoConsent: input.dsgvoConsent,
        dsgvoConsentVersion:
          privateIdentity?.dsgvoConsentVersion || "DSGVO-2026-v1",
        dsgvoConsentTimestamp:
          privateIdentity?.dsgvoConsentTimestamp || new Date().toISOString(),
        analyticsOptIn: input.analyticsOptIn,
        childSafetyShield: input.childSafetyShield,
        protectionFocus:
          privateIdentity?.protectionFocus &&
          privateIdentity.protectionFocus.length > 0
            ? privateIdentity.protectionFocus
            : ["Kinderschutz", "Tierschutz", "Frauenschutz", "Männerschutz"],
        updatedAt: serverTimestamp(),
      });
      setPrivateIdentity((prev) =>
        prev ? { ...prev, ...input } : null
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${currentUser.uid}/private/identity`
      );
    }
  };

  const handleExportDsgvoData = () => {
    const exportBundle = {
      exportedAt: new Date().toISOString(),
      gdprRegulation: "EU-DSGVO Art. 20 Datenübertragbarkeit",
      profile: currentUser,
      privateIdentity,
      savedVideoProjects: savedProjects,
      betaRegistration: betaReceipt,
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KIVORA_DSGVO_Datenauskunft_${Date.now()}.json`;
    a.click();
  };

  const handleDeleteAccountData = async () => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "private", "identity"));
      setPrivateIdentity(null);
      setIdAustriaBpkHash("");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${currentUser.uid}/private/identity`
      );
    }
  };

  // --- 18+ Dating & TikTok-Matches Handlers ---
  const handleRecordSwipeAndMatch = async (input: {
    profile: DatingProfileItem;
    decision: "pass" | "like" | "super_like" | "tiktok_match";
    sourceMode: "tinder_swipe" | "tiktok_video" | "tiktok_live";
    originOverride?: DatingMatchOrigin;
  }): Promise<DatingMatchRecord | null> => {
    const swipeId = `swipe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const isAdultFirestore =
      Boolean(currentUser) && currentUser?.ageGroup === "adult";

    if (isAdultFirestore && currentUser) {
      try {
        await setDoc(doc(db, "dating_swipes", swipeId), {
          id: swipeId,
          fromUid: currentUser.uid,
          toProfileId: input.profile.id,
          decision: input.decision,
          sourceMode: input.sourceMode,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `dating_swipes/${swipeId}`
        );
      }
    }

    if (input.decision === "pass") {
      return null;
    }

    // Mutual match resolution (Super-Likes, TikTok Video/Live Matches, or mutual community interest)
    const isMatch =
      input.decision === "super_like" ||
      input.decision === "tiktok_match" ||
      input.profile.likesBackOnSwipe !== false;

    if (!isMatch) {
      return null;
    }

    const matchOrigin: DatingMatchOrigin =
      input.originOverride ||
      (input.decision === "super_like"
        ? "super_like"
        : input.sourceMode === "tiktok_video"
        ? "tiktok_video_duet"
        : input.sourceMode === "tiktok_live"
        ? "tiktok_live_match"
        : "tinder_swipe");

    const compat =
      input.decision === "super_like"
        ? 98
        : input.sourceMode === "tiktok_live"
        ? 95
        : 92;

    const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const cleanHandle =
      input.profile.handle.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 32) ||
      "kivora_match";

    const newMatch: DatingMatchRecord = {
      id: matchId,
      userAId: currentUser?.uid || "preview_adult_user",
      userBId: input.profile.uid,
      partnerId: input.profile.id,
      partnerName: input.profile.displayName,
      partnerHandle: cleanHandle.length >= 2 ? cleanHandle : `m_${cleanHandle}`,
      partnerAge: Math.max(18, Math.min(99, Math.floor(input.profile.age))),
      partnerCity: input.profile.city,
      partnerPhotoUrl: input.profile.photoUrl,
      matchOrigin,
      compatibilityPct: compat,
      lastMessagePreview: "Neues 18+ Match — schreib jetzt die erste Nachricht!",
      createdAtLabel: "Gerade eben",
    };

    if (isAdultFirestore && currentUser) {
      try {
        await setDoc(doc(db, "dating_matches", matchId), {
          id: newMatch.id,
          userAId: currentUser.uid,
          userBId: newMatch.userBId,
          partnerName: newMatch.partnerName,
          partnerHandle: newMatch.partnerHandle,
          partnerAge: newMatch.partnerAge,
          partnerCity: newMatch.partnerCity,
          partnerPhotoUrl: newMatch.partnerPhotoUrl,
          matchOrigin: newMatch.matchOrigin,
          compatibilityPct: newMatch.compatibilityPct,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `dating_matches/${matchId}`
        );
      }
    } else {
      setLocalDatingMatches((prev) => [newMatch, ...prev]);
    }

    setNotifications((prev) => [
      {
        id: `notif_match_${Date.now()}`,
        category: "community",
        title: `Neues 18+ Match mit ${newMatch.partnerName}!`,
        detail: `${
          matchOrigin === "tiktok_live_match"
            ? "TikTok Live-Match"
            : matchOrigin === "tiktok_video_duet"
            ? "TikTok 9:16 Video-Match"
            : "Tinder Swipe-Match"
        } (${newMatch.compatibilityPct}% Übereinstimmung)`,
        timestamp: "Gerade eben",
        read: false,
      },
      ...prev,
    ]);

    return newMatch;
  };

  const handleSendMatchMessage = async (
    match: DatingMatchRecord,
    text: string
  ) => {
    const clean = text.trim().slice(0, 1500);
    if (!clean) return;

    const msgId = `mmsg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const senderName = currentUser?.displayName || "Du (18+ Verifiziert)";
    const newMsg: DatingMatchChatMessage = {
      id: msgId,
      matchId: match.id,
      senderId: currentUser?.uid || "preview_adult_user",
      senderName,
      text: clean,
      safetyStatus: "safe",
      timestampLabel: "Gerade eben",
    };

    setMessagesByMatch((prev) => ({
      ...prev,
      [match.id]: [...(prev[match.id] || []), newMsg],
    }));

    setLocalDatingMatches((prev) =>
      prev.map((m) =>
        m.id === match.id ? { ...m, lastMessagePreview: clean.slice(0, 120) } : m
      )
    );

    if (
      currentUser &&
      currentUser.ageGroup === "adult" &&
      !match.id.startsWith("match_seed_")
    ) {
      try {
        const batch = writeBatch(db);
        batch.set(
          doc(db, "dating_matches", match.id, "messages", msgId),
          {
            id: msgId,
            matchId: match.id,
            userAId: match.userAId,
            userBId: match.userBId,
            senderId: currentUser.uid,
            senderName: senderName.slice(0, 60),
            text: clean,
            safetyStatus: "safe",
            createdAt: serverTimestamp(),
          }
        );
        batch.update(doc(db, "dating_matches", match.id), {
          lastMessagePreview: clean.slice(0, 240),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `dating_matches/${match.id}/messages/${msgId}`
        );
      }
    }
  };

  const handleSaveOwnDatingProfile = async (input: {
    displayName: string;
    age: number;
    city: string;
    bio: string;
    photoUrl: string;
    videoHookTitle: string;
    sharedValues: string[];
  }) => {
    const profileId = currentUser
      ? `dp_${currentUser.uid}`
      : `dp_local_${Date.now()}`;
    const rawHandle =
      currentUser?.handle ||
      input.displayName.toLowerCase().replace(/[^a-z0-9_.]/g, "") ||
      "kivora_adult";
    const cleanHandle = rawHandle.slice(0, 32);

    const profileItem: DatingProfileItem = {
      id: profileId,
      uid: currentUser?.uid || "preview_adult_user",
      displayName: input.displayName.trim().slice(0, 60),
      handle: cleanHandle.length >= 2 ? cleanHandle : `u_${cleanHandle}`,
      age: Math.max(18, Math.min(99, Math.floor(input.age))),
      city: input.city.trim().slice(0, 60),
      distanceKm: 5,
      bio: input.bio.trim().slice(0, 400),
      photoUrl: input.photoUrl,
      videoHookTitle: input.videoHookTitle.trim().slice(0, 140),
      videoFilterPreset: "Warmes Tageslicht",
      tiktokSoundLabel: "KIVORA Originalton · 18+ Community",
      sharedValues: input.sharedValues.slice(0, 6),
      promptQuestion: "Was mir auf KIVORA besonders wichtig ist:",
      promptAnswer:
        input.bio.trim().slice(0, 200) ||
        "Ehrlicher Austausch, Respekt und gemeinsame Schutzwerte.",
      idAustriaVerified: Boolean(currentUser?.idAustriaVerified),
      likesBackOnSwipe: true,
    };

    if (currentUser && currentUser.ageGroup === "adult") {
      try {
        await setDoc(doc(db, "dating_profiles", profileId), {
          id: profileItem.id,
          uid: currentUser.uid,
          displayName: profileItem.displayName,
          handle: profileItem.handle,
          age: profileItem.age,
          city: profileItem.city,
          distanceKm: 5,
          bio: profileItem.bio,
          photoUrl: profileItem.photoUrl,
          videoHookTitle: profileItem.videoHookTitle,
          videoFilterPreset: profileItem.videoFilterPreset,
          tiktokSoundLabel: profileItem.tiktokSoundLabel,
          sharedValues: profileItem.sharedValues,
          adultAgeConfirmed: true,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `dating_profiles/${profileId}`
        );
      }
    } else {
      setLocalDatingProfiles((prev) => [
        profileItem,
        ...prev.filter((p) => p.id !== profileId),
      ]);
    }
  };

  // Deduplicate local uploaded Reels + Firestore Reels + Seed Reels (preserving local videoUrl)
  const reelMap = new Map<string, VideoReel>();
  for (const r of localReels) {
    reelMap.set(r.id, r);
  }
  for (const r of firestoreReels) {
    const existing = reelMap.get(r.id);
    reelMap.set(r.id, existing?.videoUrl ? { ...r, videoUrl: existing.videoUrl } : r);
  }
  for (const r of INITIAL_REELS) {
    if (!reelMap.has(r.id)) {
      reelMap.set(r.id, r);
    }
  }
  const allReels = Array.from(reelMap.values());

  const storyMap = new Map<string, StoryItem>();
  for (const s of localStories) {
    storyMap.set(s.id, s);
  }
  for (const s of firestoreStories) {
    const existing = storyMap.get(s.id);
    storyMap.set(
      s.id,
      existing
        ? {
            ...s,
            isEphemeralSnap: existing.isEphemeralSnap,
            snapDurationSec: existing.snapDurationSec,
            snapFilterLabel: existing.snapFilterLabel,
            createdAtLabel: existing.createdAtLabel,
          }
        : s
    );
  }
  for (const s of INITIAL_STORIES) {
    if (!storyMap.has(s.id)) {
      storyMap.set(s.id, s);
    }
  }
  const allStories = Array.from(storyMap.values());

  const allPosts = [...firestorePosts, ...INITIAL_POSTS];
  const allDatingProfiles = [
    ...localDatingProfiles,
    ...firestoreDatingProfiles,
    ...INITIAL_DATING_PROFILES,
  ];
  const datingMatchMap = new Map<string, DatingMatchRecord>();
  for (const m of firestoreDatingMatches) {
    datingMatchMap.set(m.id, m);
  }
  for (const m of localDatingMatches) {
    if (!datingMatchMap.has(m.id)) {
      datingMatchMap.set(m.id, m);
    }
  }
  const allDatingMatches = Array.from(datingMatchMap.values());
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-20 md:pb-8">
      {/* Strict 3-Zone Top Navigation Bar with Instagram Warm Accent */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("feed");
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2 font-display"
          >
            <span className="w-3 h-3 rounded-xs bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600 inline-block" />
            <span>KIVORA</span>
          </a>

          {/* Zone 2: Single-Line Navigation Links */}
          <nav
            aria-label="Hauptnavigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: "feed", label: "Feed & Stories" },
                { id: "studio", label: "Reels & Studio" },
                { id: "live", label: "Livestream" },
                { id: "dating", label: "Dating & Matches" },
                { id: "chat", label: "Chat & Schutz" },
                { id: "ai", label: "ICE Ragotti KI" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === item.id
                    ? "border-rose-600 text-slate-900 dark:text-white font-semibold"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {item.id === "ai" && (
                  <SafeImage
                    src={aiAvatarUrl}
                    alt="ICE Ragotti KI"
                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-rose-500/40"
                  />
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 hover:opacity-95 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity shadow-xs"
            >
              {currentUser
                ? `${currentUser.displayName.split(" ")[0]} · DSGVO-Konto`
                : "Anmelden / Registrieren"}
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Utility Bar (DSGVO Status, Notifications, Verification/Beta, Emergency, Theme) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              {currentUser?.ageGroup === "adult"
                ? "ID-Austria 18+ Verifiziert"
                : "Jugendschutz-Modus (<18) aktiv"}
            </span>
            <span aria-hidden="true">·</span>
            <span>EU-DSGVO Art. 6/8/13 konform</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Beta ({betaCount.toLocaleString("de-AT")}) & Abo</span>
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() =>
                setReportModalState({
                  isOpen: true,
                  targetType: "emergency_police",
                  targetId: "global_emergency_bar",
                  targetTitle: "Direkte Schutz- & Notrufzentrale",
                })
              }
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5 hover:bg-rose-100 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Notruf 147 / Polizei 133</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNotifPopover((v) => !v);
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, read: true }))
                );
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
              aria-label="Push-Benachrichtigungen"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{unreadCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              aria-label="Farbschema wechseln"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 top-10 z-40 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Push-Benachrichtigungen
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifPopover(false)}
                    className="text-xs text-slate-500"
                  >
                    Schließen
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs space-y-0.5"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {n.detail}
                      </p>
                      <div className="text-[10px] text-slate-400">
                        {n.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "feed" && (
          <FeedAndDashboardView
            currentUser={currentUser}
            idAustriaBpkHash={idAustriaBpkHash}
            aiAvatarUrl={aiAvatarUrl}
            tiktokHandle={tiktokHandle}
            instagramHandle={instagramHandle}
            onUpdateSocialHandles={handleUpdateSocialHandles}
            posts={allPosts}
            stories={allStories}
            reels={allReels}
            liveStreams={liveStreams}
            commentsByPost={commentsByPost}
            betaCount={betaCount}
            betaReceipt={betaReceipt}
            onSubmitBetaPreregistration={handleSubmitBetaPreregistration}
            onCreatePost={handleCreatePost}
            onCreateStory={handleCreateStory}
            onLikePost={handleLikePost}
            onAddComment={handleAddComment}
            onOpenReportModal={(targetType, targetId, targetTitle) =>
              setReportModalState({
                isOpen: true,
                targetType,
                targetId,
                targetTitle,
              })
            }
            onOpenIdAustriaModal={() => setAccountModalOpen(true)}
            onSelectLiveStream={handleSelectLiveStream}
            onSelectReel={(reelId) => {
              setSelectedReelId(reelId);
              setActiveTab("studio");
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "studio" && (
          <ReelsAndVideoStudio
            currentUser={currentUser}
            aiAvatarUrl={aiAvatarUrl}
            tiktokHandle={tiktokHandle}
            instagramHandle={instagramHandle}
            onUpdateSocialHandles={handleUpdateSocialHandles}
            selectedReelId={selectedReelId}
            reels={allReels}
            savedProjects={savedProjects}
            activeProject={activeProject}
            onChangeActiveProject={setActiveProject}
            onSaveProjectToCloud={handleSaveProjectToCloud}
            onPublishReel={handlePublishReel}
            onLikeReel={handleLikeReel}
            onOpenReportModal={(targetType, targetId, targetTitle) =>
              setReportModalState({
                isOpen: true,
                targetType,
                targetId,
                targetTitle,
              })
            }
            onOpenIdAustriaModal={() => setAccountModalOpen(true)}
          />
        )}

        {activeTab === "live" && (
          <LivestreamStudioView
            currentUser={currentUser}
            aiAvatarUrl={aiAvatarUrl}
            tiktokHandle={tiktokHandle}
            instagramHandle={instagramHandle}
            selectedStreamId={selectedLiveStreamId}
            onSelectStreamId={setSelectedLiveStreamId}
            onOpenReportModal={(targetType, targetId, targetTitle) =>
              setReportModalState({
                isOpen: true,
                targetType,
                targetId,
                targetTitle,
              })
            }
            onOpenIdAustriaModal={() => setAccountModalOpen(true)}
          />
        )}

        {activeTab === "dating" && (
          <DatingAndMatchesView
            currentUser={currentUser}
            profiles={allDatingProfiles}
            matches={allDatingMatches}
            messagesByMatch={messagesByMatch}
            onRecordSwipeAndMatch={handleRecordSwipeAndMatch}
            onSendMatchMessage={handleSendMatchMessage}
            onSaveOwnDatingProfile={handleSaveOwnDatingProfile}
            onOpenIdAustriaModal={() => setAccountModalOpen(true)}
            onOpenReportModal={(targetType, targetId, targetTitle) =>
              setReportModalState({
                isOpen: true,
                targetType,
                targetId,
                targetTitle,
              })
            }
            onNavigateFeed={() => setActiveTab("feed")}
          />
        )}

        {activeTab === "chat" && (
          <EncryptedChatAndSafetyView
            currentUser={currentUser}
            aiAvatarUrl={aiAvatarUrl}
            chats={chats}
            messagesByChat={messagesByChat}
            onSendEncryptedMessage={handleSendEncryptedMessage}
            onCreateSecretChat={handleCreateSecretChat}
            onOpenReportModal={(targetType, targetId, targetTitle) =>
              setReportModalState({
                isOpen: true,
                targetType,
                targetId,
                targetTitle,
              })
            }
            onOpenIdAustriaModal={() => setAccountModalOpen(true)}
          />
        )}

        {activeTab === "ai" && (
          <IceRagottiAiView
            ageGroup={currentUser?.ageGroup || "minor"}
            aiAvatarUrl={aiAvatarUrl}
            onChangeAiAvatarUrl={handleChangeAiAvatarUrl}
            onOpenEmergencyModal={() =>
              setReportModalState({
                isOpen: true,
                targetType: "emergency_police",
                targetId: "ai_emergency_trigger",
                targetTitle: "Notruf & Schutzmeldung",
              })
            }
          />
        )}
      </main>

      {/* Clean Editorial Footer with Legal & DSGVO Links */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          KIVORA · Kinderschutz · Tierschutz · Frauenschutz · Männerschutz · Powered
          by ICE Ragotti KI
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href="tel:147" className="hover:text-slate-800 dark:hover:text-slate-200">
            Rat auf Draht: 147
          </a>
          <a href="tel:133" className="hover:text-slate-800 dark:hover:text-slate-200">
            Polizei: 133 / 112
          </a>
          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className="hover:text-rose-600 dark:hover:text-rose-400 font-medium"
          >
            DSGVO, Impressum & Beta
          </button>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-6 items-center"
      >
        {(
          [
            { id: "feed", label: "Feed", icon: Home },
            { id: "studio", label: "Reels", icon: Film },
            { id: "live", label: "Live", icon: Radio },
            { id: "dating", label: "Dating", icon: Flame },
            { id: "chat", label: "Schutz", icon: Lock },
            { id: "ai", label: "KI", icon: Sparkles },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                active
                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="mt-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <ReportAndEmergencyModal
        isOpen={reportModalState.isOpen}
        onClose={() =>
          setReportModalState((prev) => ({ ...prev, isOpen: false }))
        }
        targetType={reportModalState.targetType}
        targetId={reportModalState.targetId}
        targetTitle={reportModalState.targetTitle}
        onSubmitReport={handleSubmitSafetyReport}
      />

      <AccountIdAustriaModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        currentUser={currentUser}
        privateIdentity={privateIdentity}
        betaCount={betaCount}
        betaReceipt={betaReceipt}
        onSubmitBetaPreregistration={handleSubmitBetaPreregistration}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onCompleteIdAustriaVerify={handleCompleteIdAustriaVerify}
        onSubmitVerificationRequest={handleSubmitVerificationRequest}
        onActivateSubscription={handleActivateSubscription}
        onUpdateDsgvoSettings={handleUpdateDsgvoSettings}
        onExportDsgvoData={handleExportDsgvoData}
        onDeleteAccountData={handleDeleteAccountData}
      />
    </div>
  );
}
