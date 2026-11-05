import { useEffect, useState } from "react";
import {
  Lock,
  ShieldAlert,
  PhoneCall,
  Send,
  KeyRound,
  Timer,
  Flag,
  CheckCircle2,
  Search,
  Plus,
  CheckCheck,
} from "lucide-react";
import {
  encryptMessageE2EE,
  decryptMessageE2EE,
  computeSafetyFingerprint,
} from "../lib/crypto";
import { SafeImage } from "./SafeImage";
import { MEDIA_ASSETS } from "../lib/mediaAssets";
import type {
  ChildSafetyScanResult,
  DecryptedMessage,
  EncryptedChatThread,
  UserProfile,
  SafetyReportRecord,
} from "../types/kivora";

interface EncryptedChatAndSafetyViewProps {
  currentUser: UserProfile | null;
  aiAvatarUrl: string;
  chats: EncryptedChatThread[];
  messagesByChat: Record<string, DecryptedMessage[]>;
  onSendEncryptedMessage: (input: {
    chat: EncryptedChatThread;
    plaintext: string;
    ciphertext: string;
    iv: string;
    safetyStatus: "safe" | "warning" | "blocked";
    safetyReason?: string;
  }) => Promise<void>;
  onCreateSecretChat: (title: string, ephemeralSeconds: number) => Promise<void>;
  onOpenReportModal: (
    targetType: SafetyReportRecord["targetType"],
    targetId: string,
    targetTitle: string
  ) => void;
  onOpenIdAustriaModal: () => void;
}

const GROOMING_TEST_SCENARIOS = [
  {
    label: "Testfall 1: Geheimhaltungsdruck & Treffen (Grooming-Muster)",
    senderAge: "38 Jahre (gibt sich als Jugendlicher aus)",
    text: "Hey, schick mir bitte ein Foto von dir, aber sag deinen Eltern bloß nichts davon! Wir können uns morgen nach der Schule alleine am Bahnhof treffen, ich bringe dir auch Guthabenkarten mit.",
  },
  {
    label: "Testfall 2: Sachliche Nachbarschaftshilfe (Unbedenklich)",
    senderAge: "Verifiziertes Mitglied",
    text: "Hallo! Unser Gemeinde-Workshop zur Blackout-Vorsorge findet am Samstag um 14:00 Uhr im Rathaus statt. Alle Eltern und Jugendlichen sind herzlich eingeladen.",
  },
];

export function EncryptedChatAndSafetyView({
  currentUser,
  aiAvatarUrl,
  chats,
  messagesByChat,
  onSendEncryptedMessage,
  onCreateSecretChat,
  onOpenReportModal,
  onOpenIdAustriaModal,
}: EncryptedChatAndSafetyViewProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>(
    chats[0]?.id || "chat_civic_1"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewSecretForm, setShowNewSecretForm] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeFingerprint, setActiveFingerprint] = useState(
    "A9F2-48C1-90E4-7B12"
  );
  const [showCiphertextDebug, setShowCiphertextDebug] = useState(false);

  // Child safety warning alert banner
  const [childAlert, setChildAlert] = useState<ChildSafetyScanResult | null>(
    null
  );

  // Secret chat creator
  const [newChatTitle, setNewChatTitle] = useState("");
  const [ephemeralSec, setEphemeralSec] = useState(300);

  // Interactive Kinderschutz-KI Prüflabor
  const [testText, setTestText] = useState(GROOMING_TEST_SCENARIOS[0].text);
  const [testSenderAge, setTestSenderAge] = useState(
    GROOMING_TEST_SCENARIOS[0].senderAge
  );
  const [scanningTest, setScanningTest] = useState(false);
  const [testScanResult, setTestScanResult] =
    useState<ChildSafetyScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const activeChat = chats.find((c) => c.id === selectedChatId) || chats[0];
  const currentMessages = activeChat ? messagesByChat[activeChat.id] || [] : [];

  useEffect(() => {
    if (!activeChat) return;
    computeSafetyFingerprint(activeChat.passphrase, activeChat.id).then(
      (fp) => {
        setActiveFingerprint(fp);
      }
    );
  }, [activeChat]);

  const getChatAvatar = (chat: EncryptedChatThread): string => {
    if (chat.peerId.includes("ice_ragotti") || chat.channelScope === "secret_ephemeral") {
      return aiAvatarUrl;
    }
    if (chat.id.includes("blackout")) {
      return MEDIA_ASSETS.blackoutKit;
    }
    if (chat.id.includes("civic")) {
      return MEDIA_ASSETS.youthProtection;
    }
    return MEDIA_ASSETS.avatarIceRagotti;
  };

  const runChildSafetyScan = async (
    text: string,
    senderAgeClaim: string
  ): Promise<ChildSafetyScanResult> => {
    const res = await fetch("/api/ai/child-safety-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageText: text,
        senderAgeClaim,
        recipientIsMinor: currentUser?.ageGroup !== "adult",
      }),
    });
    const data = (await res.json()) as ChildSafetyScanResult & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Kinderschutz-Prüfung fehlgeschlagen");
    }
    return data;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !messageInput.trim() || sending) return;
    if (!currentUser) {
      onOpenIdAustriaModal();
      return;
    }

    const plain = messageInput.trim();
    setSending(true);
    setScanError(null);

    try {
      // 1. Run ICE Ragotti KI Child-Safety & Grooming Check before delivery
      const scan = await runChildSafetyScan(plain, "Aktiver Chat-Teilnehmer");
      if (
        scan.riskLevel === "high_risk" ||
        scan.riskLevel === "critical_predator_alert"
      ) {
        setChildAlert(scan);
      }

      // 2. Encrypt client-side with Web Crypto AES-GCM 256-bit
      const { ciphertext, iv } = await encryptMessageE2EE(
        plain,
        activeChat.passphrase,
        activeChat.id
      );

      // Verify decryption round-trip
      await decryptMessageE2EE(
        ciphertext,
        iv,
        activeChat.passphrase,
        activeChat.id
      );

      const safetyStatus: "safe" | "warning" | "blocked" =
        scan.shouldBlockDelivery
          ? "blocked"
          : scan.riskLevel !== "safe"
          ? "warning"
          : "safe";

      await onSendEncryptedMessage({
        chat: activeChat,
        plaintext: scan.shouldBlockDelivery
          ? "[Nachricht durch KI-Kinderschutzschild zum Schutz Minderjähriger blockiert]"
          : plain,
        ciphertext,
        iv,
        safetyStatus,
        safetyReason: scan.childWarningGerman,
      });

      setMessageInput("");
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Senden fehlgeschlagen"
      );
    } finally {
      setSending(false);
    }
  };

  const handleRunSafetyLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim() || scanningTest) return;
    setScanningTest(true);
    setScanError(null);
    try {
      const result = await runChildSafetyScan(testText.trim(), testSenderAge);
      setTestScanResult(result);
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Analyse fehlgeschlagen"
      );
    } finally {
      setScanningTest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Emergency & Direct Police / Rat auf Draht Bar */}
      <section className="bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>
              Kinderschutz-Soforthilfe, Rat auf Draht & Polizei direkt erreichbar
            </span>
          </div>
          <p className="text-xs text-rose-800/90 dark:text-rose-300">
            Bei Verdacht auf Cybergrooming, Pädokriminalität, häusliche Gewalt
            oder akute Gefahr: Sofort kostenlos und anonym Hilfe rufen oder
            Beweise sichern.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="tel:147"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Rat auf Draht: 147</span>
          </a>
          <a
            href="tel:133"
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Polizei: 133 / 112</span>
          </a>
          <button
            type="button"
            onClick={() =>
              onOpenReportModal(
                "emergency_police",
                "chat_safety_escalation",
                "Akute Schutz- & Polizei-Meldung"
              )
            }
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold"
          >
            Vorfall & Beweise melden
          </button>
        </div>
      </section>

      {/* Unified Telegram-Style 2-Pane Split Messenger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left 4 Cols: Telegram-Style Searchable Chat & Channel List */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Top Search & New Secret Chat Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  KIVORA Messenger (E2EE)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSecretForm((v) => !v)}
                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                title="Neuen geheimen Chat erstellen"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chats & Kanäle durchsuchen..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-rose-500 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {showNewSecretForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!currentUser) {
                    onOpenIdAustriaModal();
                    return;
                  }
                  if (!newChatTitle.trim()) return;
                  await onCreateSecretChat(newChatTitle.trim(), ephemeralSec);
                  setNewChatTitle("");
                  setShowNewSecretForm(false);
                }}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Neuer geheimer Chat / Schutzkanal
                </div>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="Name des Chats oder Kanals..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={ephemeralSec}
                    onChange={(e) => setEphemeralSec(Number(e.target.value))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value={0}>Dauerhaft E2EE</option>
                    <option value={60}>Timer: 60 Sek.</option>
                    <option value={300}>Timer: 5 Min.</option>
                    <option value={3600}>Timer: 1 Std.</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shrink-0"
                  >
                    Starten
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Telegram-Style Thread List with Avatars & Last Message Preview */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredChats.map((chat) => {
              const threadMsgs = messagesByChat[chat.id] || [];
              const lastMsg = threadMsgs[threadMsgs.length - 1];
              const isSelected = activeChat?.id === chat.id;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? "bg-rose-50/90 dark:bg-rose-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <SafeImage
                    src={getChatAvatar(chat)}
                    alt={chat.title}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {chat.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {lastMsg?.timestampLabel || "E2EE"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {lastMsg
                        ? `${lastMsg.senderName.split(" ")[0]}: ${lastMsg.plaintext}`
                        : chat.channelScope === "secret_ephemeral"
                        ? "Geheimer Chat mit Selbstlösch-Timer"
                        : "AES-256-GCM geschützter Kanal"}
                    </p>
                    {chat.ephemeralSeconds > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                        <Timer className="w-3 h-3" />
                        <span>Selbstlöschung: {chat.ephemeralSeconds}s</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right 8 Cols: Active Telegram-Style Conversation Pane */}
        <section className="lg:col-span-8 flex flex-col bg-slate-50/50 dark:bg-slate-950/40">
          {/* Header with Avatar & SHA-256 Key Fingerprint */}
          <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeChat && (
                <SafeImage
                  src={getChatAvatar(activeChat)}
                  alt={activeChat.title}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activeChat?.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <KeyRound className="w-3 h-3 shrink-0" />
                  <span className="font-mono tabular-nums truncate">
                    AES-256 E2EE · Schlüssel: {activeFingerprint}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCiphertextDebug((v) => !v)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {showCiphertextDebug ? "Klartext" : "Chiffre prüfen"}
              </button>
              <button
                type="button"
                onClick={() =>
                  activeChat &&
                  onOpenReportModal(
                    "chat_message",
                    activeChat.id,
                    activeChat.title
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Melden</span>
              </button>
            </div>
          </div>

          {/* Live Child-Safety Warning Banner with Dedicated ICE Ragotti KI Portrait */}
          {childAlert && (
            <div className="m-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-start gap-3.5 shadow-sm">
              <SafeImage
                src={aiAvatarUrl}
                alt="ICE Ragotti KI Schutzschild"
                className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-rose-500"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    ICE Ragotti KI Kinderschutz-Warnung · Risiko-Index:{" "}
                    <span className="font-mono tabular-nums">
                      {childAlert.riskScore}/100
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChildAlert(null)}
                    className="text-xs text-rose-700 dark:text-rose-300 underline"
                  >
                    Ausblenden
                  </button>
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-100 leading-relaxed">
                  {childAlert.childWarningGerman}
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <a
                    href="tel:147"
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                  >
                    Rat auf Draht 147 anrufen
                  </a>
                  <a
                    href="tel:133"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                  >
                    Polizei 133 verständigen
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Telegram-Style Messages Thread */}
          <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[430px]">
            {currentMessages.map((msg) => {
              const isOwn = Boolean(
                currentUser && msg.senderId === currentUser.uid
              );
              const senderAvatar = msg.senderId.includes("ice_ragotti")
                ? aiAvatarUrl
                : MEDIA_ASSETS.avatarIceRagotti;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isOwn && (
                    <SafeImage
                      src={senderAvatar}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-sm shadow-xs ${
                      msg.safetyStatus === "blocked"
                        ? "rounded-2xl rounded-bl-xs bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                        : isOwn
                        ? "rounded-2xl rounded-br-xs bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white"
                        : "rounded-2xl rounded-bl-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {!isOwn && (
                      <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                        {msg.senderName}
                      </div>
                    )}
                    <p className="leading-relaxed">{msg.plaintext}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        isOwn ? "text-rose-100" : "text-slate-400"
                      }`}
                    >
                      <span>{msg.timestampLabel}</span>
                      <CheckCheck className="w-3.5 h-3.5" />
                    </div>
                    {showCiphertextDebug && (
                      <div className="mt-2 pt-2 border-t border-current/20 text-[10px] font-mono break-all opacity-85">
                        AES-GCM: {msg.ciphertext} | IV: {msg.iv}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {scanError && (
            <p className="px-5 pb-2 text-xs text-rose-600 dark:text-rose-400">
              {scanError}
            </p>
          )}

          {/* Telegram-Style Bottom Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Nachricht schreiben (AES-256 E2EE + Kinderschutz-KI)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-rose-500 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !messageInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? "Prüft..." : "Senden"}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Bottom Interactive KI-Kinderschutz-Frühwarnsystem (Predator & Grooming Pattern Lab) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SafeImage
              src={aiAvatarUrl}
              alt="ICE Ragotti KI Kinderschutz-Wächter"
              className="w-11 h-11 rounded-full object-cover border border-rose-600/40 shrink-0"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ICE Ragotti KI-Kinderschutz-Wächter (Grooming- &
                Gefahren-Früherkennung)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Erkennt verdächtige Kontaktmuster pädokrimineller Täter anhand
                sprachlicher Manipulationstaktiken und warnt Kinder & Jugendliche
                sofort altersgerecht.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {GROOMING_TEST_SCENARIOS.map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => {
                  setTestText(sc.text);
                  setTestSenderAge(sc.senderAge);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-rose-500"
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleRunSafetyLabTest}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >
          <div className="lg:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Zu prüfende Chat-Nachricht an ein Kind / einen Jugendlichen
            </label>
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>
          <div className="lg:col-span-4 flex flex-col justify-between gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kontext / Altersangabe Absender
              </label>
              <input
                type="text"
                value={testSenderAge}
                onChange={(e) => setTestSenderAge(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={scanningTest}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {scanningTest
                ? "KI analysiert Gefahrenmuster..."
                : "Nachricht mit Kinderschutz-KI prüfen"}
            </button>
          </div>
        </form>

        {testScanResult && (
          <div
            className={`p-5 rounded-xl border space-y-3 ${
              testScanResult.riskLevel === "safe"
                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                {testScanResult.riskLevel === "safe" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                )}
                <span>
                  Bewertung:{" "}
                  {testScanResult.riskLevel === "safe"
                    ? "Unbedenklich"
                    : "Akute Kinderschutz-Warnung ausgelöst"}
                </span>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold">
                Gefahren-Score: {testScanResult.riskScore} / 100
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
              <span className="font-semibold">Warnhinweis für das Kind: </span>
              {testScanResult.childWarningGerman}
            </p>

            {testScanResult.detectedTactics.length > 0 && (
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Erkannte Muster: </span>
                {testScanResult.detectedTactics.join(" · ")}
              </div>
            )}

            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Empfohlene Schutzschritte: </span>
              {testScanResult.recommendedActions.join(" · ")}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
