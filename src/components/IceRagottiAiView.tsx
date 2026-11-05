import { useState } from "react";
import {
  Send,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  BookOpen,
  Flame,
  Upload,
  RotateCcw,
} from "lucide-react";
import { SafeImage } from "./SafeImage";
import { MEDIA_ASSETS } from "../lib/mediaAssets";
import type { AgeGroup } from "../types/kivora";

interface IceRagottiAiViewProps {
  ageGroup: AgeGroup;
  aiAvatarUrl: string;
  onChangeAiAvatarUrl: (url: string) => void;
  onOpenEmergencyModal: () => void;
}

interface ChatTurn {
  id: string;
  role: "user" | "model";
  text: string;
}

const AI_MODES = [
  {
    id: "schutz",
    label: "Kinderschutz, Frauen- & Männerschutz, Tierschutz",
    starterPrompts: [
      "Wie erkenne ich Cybergrooming bei Kindern und welche Schritte empfiehlt Rat auf Draht?",
      "Welche Soforthilfe und rechtlichen Schutzmaßnahmen gibt es bei häuslicher Gewalt gegen Frauen oder Männer?",
      "Wie melde ich illegalen Welpenhandel oder Tierquälerei in Österreich rechtssicher?",
    ],
  },
  {
    id: "krisenvorsorge",
    label: "Blackout & Krisenvorsorge",
    starterPrompts: [
      "Erstelle einen kompakten 72-Stunden-Blackout-Notfallplan für einen 4-Personen-Haushalt.",
      "Wie organisiere ich ein Nachbarschafts-Notfallnetzwerk ohne Mobilfunknetz?",
      "Welche Notstrom- und Wasserfilter-Lösungen sind für Mietwohnungen sinnvoll?",
    ],
  },
  {
    id: "aufklaerung",
    label: "Politische Aufklärung, Geopolitik & Soziale Gerechtigkeit",
    starterPrompts: [
      "Analysiere sachlich, wie europäische Energie-Souveränität und soziale Gerechtigkeit zusammenhängen.",
      "Woran erkenne ich koordinierte Desinformationskampagnen in sozialen Netzwerken?",
      "Welche demokratischen Beteiligungs- und Kontrollinstrumente stärken den Rechtsstaat?",
    ],
  },
  {
    id: "creator",
    label: "Creator-Skripte & DSGVO-Check",
    starterPrompts: [
      "Schreibe ein 45-Sekunden-Reel-Skript zum Thema Zivilcourage & Kinderschutz im Netz.",
      "Worauf muss ich bei Livestreams und Straßenumfragen nach DSGVO achten?",
    ],
  },
] as const;

export function IceRagottiAiView({
  ageGroup,
  aiAvatarUrl,
  onChangeAiAvatarUrl,
  onOpenEmergencyModal,
}: IceRagottiAiViewProps) {
  const [selectedMode, setSelectedMode] =
    useState<(typeof AI_MODES)[number]["id"]>("schutz");
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "welcome_1",
      role: "model",
      text: "Willkommen bei der eigenen KI von ICE Ragotti auf KIVORA. Ich unterstütze dich fundiert, sachlich und DSGVO-konform bei Kinderschutz, Tierschutz, Frauenschutz, Männerschutz, politischer Aufklärung, Geopolitik, Blackout-Krisenvorsorge sowie bei deinen Video- und Livestream-Projekten. Womit starten wir?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const activeModeObj =
    AI_MODES.find((m) => m.id === selectedMode) || AI_MODES[0];

  const handleUploadCustomAiImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChangeAiAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userTurn: ChatTurn = {
      id: `u_${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setErrorText(null);

    try {
      const res = await fetch("/api/ai/ice-ragotti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          userAgeGroup: ageGroup,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Antwort konnte nicht geladen werden.");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: "model",
          text: data.reply as string,
        },
      ]);
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "Verbindungsfehler zur KI."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Dedicated ICE Ragotti KI Portrait, Custom Image Upload & Mode Selector */}
      <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-rose-500/50 shadow-md bg-slate-900">
            <SafeImage
              src={aiAvatarUrl}
              alt="ICE Ragotti KI-System"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-3">
            ICE Ragotti KI
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aufklärung · Schutz · Krisenvorsorge
          </p>

          <div className="flex items-center justify-center gap-2 mt-3">
            <label className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-rose-500 cursor-pointer flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-rose-600" />
              <span>Eigenes KI-Bild wählen</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCustomAiImage}
                className="hidden"
              />
            </label>
            {aiAvatarUrl !== MEDIA_ASSETS.iceRagottiAi && (
              <button
                type="button"
                onClick={() => onChangeAiAvatarUrl(MEDIA_ASSETS.iceRagottiAi)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:text-slate-800"
                title="Standard ICE Ragotti KI-Bild wiederherstellen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Entwickelt für sachliche Information, aktiven Kinderschutz, Tierschutz,
          Frauen- & Männerschutz sowie krisenfeste Gemeinschaftsprojekte — ohne
          Algorithmen-Manipulation.
        </p>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Fachbereich wählen
          </p>
          <div className="space-y-1.5">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMode(m.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedMode === m.id
                    ? "bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white"
                    : "bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Altersmodus
            </span>
            <span className="font-semibold">
              {ageGroup === "adult" ? "18+ Verifiziert" : "Jugendschutz (<18)"}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenEmergencyModal}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Rat auf Draht (147) & Polizei (133)</span>
          </button>
        </div>
      </aside>

      {/* Right Main Chat Area */}
      <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col min-h-[600px]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <SafeImage
              src={aiAvatarUrl}
              alt="ICE Ragotti KI"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeModeObj.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ICE Ragotti KI · DSGVO-konforme Analyse
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            Fakten- & Schutzmodus
          </span>
        </div>

        {/* Starter Prompts */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
          {activeModeObj.starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="text-left px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:border-rose-500 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Thread with ICE Ragotti KI Avatar on every response */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[440px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-end gap-2.5 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "model" && (
                <SafeImage
                  src={aiAvatarUrl}
                  alt="ICE Ragotti KI"
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2.5 justify-start">
              <SafeImage
                src={aiAvatarUrl}
                alt="ICE Ragotti KI"
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="rounded-2xl px-4 py-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-600 animate-spin" />
                <span>ICE Ragotti KI analysiert und prüft Quellen...</span>
              </div>
            </div>
          )}
          {errorText && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stelle der ICE Ragotti KI eine Frage zu Schutz, Aufklärung, Blackout oder Content..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-600"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center gap-2 transition-opacity hover:opacity-95 disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Senden</span>
          </button>
        </form>
      </section>
    </div>
  );
}
