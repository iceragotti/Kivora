export type CivicTopic =
  | "Kinderschutz"
  | "Tierschutz"
  | "Frauenschutz"
  | "Männerschutz"
  | "Politische Aufklärung"
  | "Geopolitik"
  | "Blackout & Krisenvorsorge"
  | "Soziale Gerechtigkeit"
  | "18+ Debatte & Aufklärung";

export const YOUTH_SAFE_TOPICS: CivicTopic[] = [
  "Kinderschutz",
  "Tierschutz",
  "Frauenschutz",
  "Männerschutz",
  "Politische Aufklärung",
  "Geopolitik",
  "Blackout & Krisenvorsorge",
  "Soziale Gerechtigkeit",
];

export type VerifiedBadgeType = "none" | "id_austria" | "creator" | "protection_org";
export type AgeGroup = "minor" | "adult";
export type SubscriptionTier = "free" | "aktiv_verified" | "schutz_pro";

export interface UserProfile {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  verifiedBadge: VerifiedBadgeType;
  idAustriaVerified: boolean;
  ageGroup: AgeGroup;
  subscriptionTier: SubscriptionTier;
  topics: string[];
}

export interface UserPrivateIdentity {
  uid: string;
  email: string;
  idAustriaBpkHash: string;
  birthYear: number;
  dsgvoConsent: boolean;
  dsgvoConsentVersion?: string;
  dsgvoConsentTimestamp?: string;
  analyticsOptIn: boolean;
  childSafetyShield: boolean;
  protectionFocus?: string[];
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorVerified: VerifiedBadgeType;
  topic: CivicTopic;
  title: string;
  body: string;
  mediaUrl?: string;
  isAdultOnly: boolean;
  visibility: "public";
  likesCount: number;
  commentsCount: number;
  aiFactNote?: string;
  createdAtLabel: string;
  isFromFirestore?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAtLabel: string;
}

export interface StoryItem {
  id: string;
  authorId: string;
  authorName: string;
  topic: CivicTopic;
  headline: string;
  mediaUrl: string;
  isAdultOnly: boolean;
  createdAtLabel: string;
  isEphemeralSnap?: boolean;
  snapDurationSec?: number;
  snapFilterLabel?: string;
}

export interface VideoReel {
  id: string;
  authorId: string;
  authorName: string;
  topic: CivicTopic;
  title: string;
  coverUrl: string;
  videoUrl?: string;
  durationLabel?: string;
  filterPreset: string;
  captionSummary: string;
  isAdultOnly: boolean;
  likesCount: number;
  createdAtLabel: string;
}

export interface CreatorGrowthHookResult {
  openingHooks: string[];
  captionText: string;
  hashtags: string[];
  soundSuggestion: string;
  crossPostTip: string;
}

export interface LiveStreamSummary {
  streamId: string;
  hostName: string;
  title: string;
  topic: string;
  platforms: string[];
  viewerCount: number;
  isLive: boolean;
}

export type BetaFocusTopic =
  | "Kinderschutz"
  | "Tierschutz"
  | "Frauenschutz"
  | "Männerschutz"
  | "Alle Schutzthemen";

export type BetaPlatformInterest =
  | "Web & PWA"
  | "iOS"
  | "Android"
  | "Alle Plattformen";

export interface BetaPreregistrationInput {
  displayName: string;
  email: string;
  focusTopic: BetaFocusTopic;
  platformInterest: BetaPlatformInterest;
  dsgvoConsent: boolean;
}

export interface BetaPreregistrationResult {
  ticketCode: string;
  totalRegistered: number;
  focusTopic: BetaFocusTopic;
  platformInterest: BetaPlatformInterest;
  dsgvoVersion: string;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  vignette: number;
}

export interface CaptionCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  emphasisWord: string;
}

export interface TimelineClip {
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
  track: "video" | "overlay" | "audio";
}

export interface VideoProject {
  id: string;
  ownerId: string;
  title: string;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  filterPreset: string;
  filterSettings: FilterSettings;
  aiRecommendedFilter: string;
  captions: CaptionCue[];
  clips: TimelineClip[];
  exportFormats: string[];
  lastSyncedLabel: string;
}

export interface ChildSafetyScanResult {
  riskLevel: "safe" | "caution" | "high_risk" | "critical_predator_alert";
  riskScore: number;
  detectedTactics: string[];
  childWarningGerman: string;
  recommendedActions: string[];
  shouldBlockDelivery: boolean;
}

export interface EncryptedChatThread {
  id: string;
  ownerId: string;
  peerId: string;
  title: string;
  channelScope: "direct" | "secret_ephemeral" | "community";
  keyFingerprint: string;
  ephemeralSeconds: number;
  passphrase: string;
}

export interface DecryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  plaintext: string;
  ciphertext: string;
  iv: string;
  safetyStatus: "safe" | "warning" | "blocked";
  safetyReason?: string;
  timestampLabel: string;
}

export interface PushNotificationItem {
  id: string;
  category: "safety" | "livestream" | "verification" | "community";
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
}

export interface SafetyReportRecord {
  id: string;
  targetType: "post" | "reel" | "livestream" | "chat_message" | "user" | "emergency_police";
  targetId: string;
  category:
    | "Kinderschutz & Grooming-Verdacht"
    | "Tierschutzverstoß"
    | "Gewalt gegen Frauen oder Männer"
    | "Desinformation & Demokratiegefährdung"
    | "18+ Inhalt im Jugendbereich"
    | "Cybercrime & Akute Gefahrenlage";
  details: string;
  authorityRouting: "kivora_trust" | "rat_auf_draht_147" | "polizei_133_bkms" | "stopline";
  status: "submitted" | "escalated" | "resolved";
  timestamp: string;
}

export type DatingMatchOrigin =
  | "tinder_swipe"
  | "super_like"
  | "tiktok_video_duet"
  | "tiktok_live_match";

export interface DatingProfileItem {
  id: string;
  uid: string;
  displayName: string;
  handle: string;
  age: number;
  city: string;
  distanceKm: number;
  bio: string;
  photoUrl: string;
  secondaryPhotoUrl?: string;
  videoHookTitle: string;
  videoFilterPreset: string;
  tiktokSoundLabel: string;
  sharedValues: string[];
  promptQuestion: string;
  promptAnswer: string;
  idAustriaVerified: boolean;
  likesBackOnSwipe: boolean;
  isFromFirestore?: boolean;
}

export interface DatingMatchRecord {
  id: string;
  userAId: string;
  userBId: string;
  partnerId: string;
  partnerName: string;
  partnerHandle: string;
  partnerAge: number;
  partnerCity: string;
  partnerPhotoUrl: string;
  matchOrigin: DatingMatchOrigin;
  compatibilityPct: number;
  lastMessagePreview: string;
  createdAtLabel: string;
  isFromFirestore?: boolean;
}

export interface DatingMatchChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  text: string;
  safetyStatus: "safe" | "warning" | "blocked";
  timestampLabel: string;
}

export interface LiveMatchDuelHost {
  name: string;
  handle: string;
  age: number;
  city: string;
  photoUrl: string;
  topicTag: string;
  score: number;
}

export interface LiveMatchDuelRoom {
  roomId: string;
  title: string;
  regionLabel: string;
  topicFocus: string;
  hostA: LiveMatchDuelHost;
  hostB: LiveMatchDuelHost;
  viewerCount: number;
  remainingSec: number;
  recentMessages: {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
  }[];
}
