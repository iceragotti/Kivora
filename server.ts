import "dotenv/config";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import express from "express";
import type { Request, Response } from "express";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ist auf dem Server nicht konfiguriert.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// --- Server-Side State for Real-Time Livestream Polls, Live Subtitles & Age-Gated 18+ Forum ---
interface LivePollState {
  streamId: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
}

interface LiveStreamRoom {
  streamId: string;
  hostName: string;
  title: string;
  topic: string;
  platforms: string[];
  viewerCount: number;
  likesCount: number;
  pinnedMessage?: { sender: string; text: string } | null;
  isLive: boolean;
  activePoll: LivePollState;
  recentMessages: {
    id: string;
    sender: string;
    text: string;
    language: string;
    timestamp: string;
    isReaction?: boolean;
  }[];
  stageRequests: {
    id: string;
    userName: string;
    topicNote: string;
    status: "waiting" | "on_stage";
  }[];
}

interface AdultPostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  topic: string;
  title: string;
  body: string;
  createdAt: string;
  likesCount: number;
}

const liveRooms = new Map<string, LiveStreamRoom>([
  [
    "stream_civic_blackout",
    {
      streamId: "stream_civic_blackout",
      hostName: "ICE Ragotti · Kinderschutz & Krisenvorsorge",
      title: "Kinderschutz im Netz & Blackout-Vorsorge 2026 — Live-Analyse & Bürgerforum",
      topic: "Kinderschutz",
      platforms: ["KIVORA Native", "Instagram Live", "TikTok 9:16", "YouTube 16:9", "X Spaces"],
      viewerCount: 1428,
      likesCount: 28450,
      pinnedMessage: {
        sender: "ICE Ragotti (Host)",
        text: "Direkthilfe im Stream: Rat auf Draht 147 · Polizei 133 · Stell deine Frage direkt in den Live-Chat!",
      },
      isLive: true,
      activePoll: {
        streamId: "stream_civic_blackout",
        question: "Welches Schwerpunktthema soll im nächsten KIVORA-Bürgercheck vertieft werden?",
        options: [
          { id: "opt_1", label: "KI-Kinderschutz & Schul-Workshops", votes: 412 },
          { id: "opt_2", label: "Frauen- & Männerschutz-Soforthilfe", votes: 389 },
          { id: "opt_3", label: "Tierschutz-Kontrollen & Blackout-Vorsorge", votes: 294 },
        ],
      },
      recentMessages: [
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
          text: "Wie binden wir Schulen und Gemeinden direkt in das KIVORA-Schutznetz ein?",
          language: "de",
          timestamp: "Vor 1 Min.",
        },
      ],
      stageRequests: [
        {
          id: "sr_1",
          userName: "Dr. Elena Hofbauer (Jugendschutz)",
          topicNote: "Prävention gegen Cybergrooming an Mittelschulen",
          status: "waiting",
        },
      ],
    },
  ],
  [
    "stream_tierschutz_live",
    {
      streamId: "stream_tierschutz_live",
      hostName: "Tierschutz-Allianz DACH · Live-Einsatz",
      title: "Tierschutz-Vollzug & Rettungseinsätze: Illegale Tiertransporte stoppen",
      topic: "Tierschutz",
      platforms: ["KIVORA Native", "Instagram Live", "TikTok 9:16", "YouTube 16:9"],
      viewerCount: 864,
      likesCount: 14920,
      pinnedMessage: {
        sender: "Tierschutz-Allianz (Host)",
        text: "Verdächtige Tiertransporte oder illegalen Welpenhandel direkt über Melden -> Tierschutzverstoß dokumentieren.",
      },
      isLive: true,
      activePoll: {
        streamId: "stream_tierschutz_live",
        question: "Wo braucht der Tierschutz in Österreich sofortige Gesetzesverschärfungen?",
        options: [
          { id: "opt_t1", label: "Verbot von Online-Welpenhandel ohne ZVR-Prüfung", votes: 518 },
          { id: "opt_t2", label: "Strengere Kontrollen bei Tiertransporten", votes: 342 },
          { id: "opt_t3", label: "Direktförderung für Gnadenhöfe & Tierheime", votes: 279 },
        ],
      },
      recentMessages: [
        {
          id: "lm_t1",
          sender: "Tierheim_Steiermark",
          text: "Danke für die direkte Vernetzung mit den Amtstierärzten!",
          language: "de",
          timestamp: "Vor 2 Min.",
        },
      ],
      stageRequests: [
        {
          id: "sr_t1",
          userName: "Mag. Lukas Steiner (Veterinärrecht)",
          topicNote: "Anzeigepflicht & Beweissicherung nach § 5 TSchG",
          status: "waiting",
        },
      ],
    },
  ],
  [
    "stream_frauen_maenner_live",
    {
      streamId: "stream_frauen_maenner_live",
      hostName: "Schutznetz Österreich · Frauen- & Männerschutz",
      title: "Frauenschutz & Männerschutz gemeinsam denken: Gewaltschutz, Krisenhilfe & Recht",
      topic: "Frauenschutz",
      platforms: ["KIVORA Native", "Instagram Live", "TikTok 9:16", "X Spaces"],
      viewerCount: 1105,
      likesCount: 19380,
      pinnedMessage: {
        sender: "Schutznetz Österreich (Host)",
        text: "Anonym & kostenlos: Frauenhelpline 0800 222 555 · Männernotruf 0800 246 247 · Polizei 133.",
      },
      isLive: true,
      activePoll: {
        streamId: "stream_frauen_maenner_live",
        question: "Welche Schutzmaßnahme hat für Betroffene die höchste Dringlichkeit?",
        options: [
          { id: "opt_fm1", label: "Ausbau von Frauenhäusern & anonymen Notwohnungen", votes: 495 },
          { id: "opt_fm2", label: "Niederschwellige Krisen- & Schutzplätze für Männer", votes: 461 },
          { id: "opt_fm3", label: "Schnellere gerichtliche Wegweisungen & Opferschutz", votes: 388 },
        ],
      },
      recentMessages: [
        {
          id: "lm_fm1",
          sender: "Sozialberatung_Wien",
          text: "Endlich werden Frauenhelpline (0800 222 555) und Männernotruf (0800 246 247) gleichberechtigt gestärkt.",
          language: "de",
          timestamp: "Gerade eben",
        },
      ],
      stageRequests: [
        {
          id: "sr_fm1",
          userName: "Dr. Sarah Berger & Stefan Novak",
          topicNote: "Paritätische Krisenintervention für Frauen, Männer und Kinder",
          status: "waiting",
        },
      ],
    },
  ],
]);

let betaWaitlistCounter = 1284;
const betaTickets = new Map<string, { ticketCode: string; focusTopic: string; createdAt: string }>();

// Strictly age-gated 18+ posts (never served without verified ID-Austria 18+ assertion)
const adultDebatePosts: AdultPostItem[] = [
  {
    id: "adult_1",
    authorId: "verified_adult_moderator",
    authorName: "Dr. Lukas Brenner",
    authorHandle: "@lukas.brenner.at",
    topic: "18+ Debatte & Aufklärung",
    title: "Strafrechtsreform & Opferschutz bei digitaler Gewalt (18+ Fachdebatte)",
    body: "Unzensierte juristische Analyse aktueller Fallzahlen zu digitaler Erpressung, Deepfake-Missbrauch und notwendigen Verschärfungen im Strafgesetzbuch. Dieser Bereich ist strikt auf ID-Austria-verifizierte Erwachsene (18+) beschränkt.",
    createdAt: new Date(Date.now() - 3600_000 * 3).toISOString(),
    likesCount: 184,
  },
  {
    id: "adult_2",
    authorId: "verified_adult_geopolitics",
    authorName: "Sicherheitspolitisches Forum Wien",
    authorHandle: "@sicherheitsforum.at",
    topic: "18+ Debatte & Aufklärung",
    title: "Geopolitische Hybride Bedrohungen & Kritische Infrastruktur (18+ Dossier)",
    body: "Ungeschönte Lagebeurteilung zu Cyberangriffen auf europäische Stromnetze, Desinformationskampagnen und ziviler Resilienz. Nur für volljährige Nutzerinnen und Nutzer freigeschaltet.",
    createdAt: new Date(Date.now() - 3600_000 * 7).toISOString(),
    likesCount: 249,
  },
];

interface ServerLiveMatchRoom {
  roomId: string;
  title: string;
  regionLabel: string;
  topicFocus: string;
  hostA: {
    name: string;
    handle: string;
    age: number;
    city: string;
    photoUrl: string;
    topicTag: string;
    score: number;
  };
  hostB: {
    name: string;
    handle: string;
    age: number;
    city: string;
    photoUrl: string;
    topicTag: string;
    score: number;
  };
  viewerCount: number;
  remainingSec: number;
  recentMessages: {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
  }[];
}

const liveMatchRooms = new Map<string, ServerLiveMatchRoom>([
  [
    "match_room_vienna",
    {
      roomId: "match_room_vienna",
      title: "TikTok Live-Match Duell: Tierschutz, Kultur & Herz (18+)",
      regionLabel: "Wien & Graz · Live-Split",
      topicFocus: "Tierschutz & Kultur",
      hostA: {
        name: "Clara",
        handle: "clara.wien",
        age: 27,
        city: "Wien · Neubau",
        photoUrl: "/src/assets/images/dating_portrait_clara_1793916601075.jpg",
        topicTag: "Tierschutz & Kinderschutz",
        score: 340,
      },
      hostB: {
        name: "Lukas",
        handle: "lukas.alpen",
        age: 30,
        city: "Graz · St. Leonhard",
        photoUrl: "/src/assets/images/dating_portrait_lukas_1793916601379.jpg",
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
        {
          id: "dm_live_2",
          sender: "Tobias_Graz",
          text: "Clara & Lukas: Wann macht ihr euer erstes gemeinsames Tierheim-Live?",
          timestamp: "Vor 1 Min.",
        },
      ],
    },
  ],
  [
    "match_room_dach",
    {
      roomId: "match_room_dach",
      title: "TikTok Live Speed-Match: Aufklärung, Bergsport & Werte (18+)",
      regionLabel: "Linz & Innsbruck · Live-Split",
      topicFocus: "Aufklärung & Outdoor",
      hostA: {
        name: "Sofia",
        handle: "sofia.kultur",
        age: 26,
        city: "Linz · Urfahr",
        photoUrl: "/src/assets/images/dating_portrait_sofia_1793916601363.jpg",
        topicTag: "Demokratie & Frauenschutz",
        score: 290,
      },
      hostB: {
        name: "David",
        handle: "david.tirol",
        age: 32,
        city: "Innsbruck · Hötting",
        photoUrl: "/src/assets/images/dating_portrait_david_1793916601868.jpg",
        topicTag: "Bergsport & Krisenvorsorge",
        score: 275,
      },
      viewerCount: 196,
      remainingSec: 180,
      recentMessages: [
        {
          id: "dm_live_3",
          sender: "Elena_Linz",
          text: "Super Gespräch über Medienkompetenz & Bergtouren!",
          timestamp: "Gerade eben",
        },
      ],
    },
  ],
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // --- 1. ICE Ragotti Personal AI Assistant ---
  app.post("/api/ai/ice-ragotti", async (req: Request, res: Response) => {
    try {
      const { messages, mode, userAgeGroup } = req.body as {
        messages?: { role: "user" | "model"; text: string }[];
        mode?: string;
        userAgeGroup?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Nachrichtenverlauf darf nicht leer sein." });
        return;
      }

      const ai = getGeminiClient();
      const ageDirective =
        userAgeGroup === "adult"
          ? "Der Nutzer ist über ID-Austria als volljährig (18+) verifiziert."
          : "WICHTIG: Der Nutzer befindet sich im geschützten Jugendmodus (<18). Antworte strikt jugendfrei, schützend, altersgerecht und weise bei jeglichen Gefahren auf Rat auf Draht (147) und Polizei (133) hin.";

      const modeFocus: Record<string, string> = {
        aufklaerung:
          "Fokus: Politische Aufklärung, Geopolitik, soziale Gerechtigkeit, transparente Faktenprüfung ohne Parteipropaganda.",
        krisenvorsorge:
          "Fokus: Blackout-Vorsorge, 72h- bis 14-Tage-Notfallpläne, Trinkwasser, Notstrom, Funkkommunikation und Nachbarschaftshilfe.",
        schutz:
          "Fokus: Kinderschutz, Tierschutz, Frauenschutz, Männerschutz, Prävention, rechtliche Hilfsangebote und Notrufnummern in Österreich/EU.",
        creator:
          "Fokus: DSGVO-konforme Content-Erstellung, Reels-Skripte, Video-Schnitt-Tipps, Livestream-Dramaturgie und Community-Wachstum.",
      };

      const systemInstruction = `Du bist die eigene KI von ICE Ragotti auf der souveränen Plattform KIVORA.
Deine Kernmission: Aktiver Beitrag zu positivem gesellschaftlichem Wandel durch fundierte Aufklärung, kompromisslosen Kinderschutz, Tierschutz, Frauenschutz, Männerschutz, politische Bildung, Geopolitik-Analyse, Blackout- & Krisenvorsorge sowie soziale Gerechtigkeit.
${ageDirective}
${modeFocus[mode || "aufklaerung"] || modeFocus.aufklaerung}
Antworte präzise, strukturiert, empathisch und auf Deutsch. Nenne bei akuten Notlagen immer die österreichischen/europäischen Notrufnummern: Polizei 133 / Euronotruf 112, Rat auf Draht 147, Frauenhelpline 0800 222 555, Männernotruf 0800 246 247.`;

      const formattedContents = messages.map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.text).slice(0, 4000) }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      res.json({
        reply: response.text || "Keine Antwort generiert.",
        model: "gemini-3.8-flash",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter KI-Fehler";
      res.status(500).json({ error: msg });
    }
  });

  // --- 2. KI-Kinderschutz & Grooming/Predator Detection ---
  app.post("/api/ai/child-safety-scan", async (req: Request, res: Response) => {
    try {
      const { messageText, senderAgeClaim, recipientIsMinor } = req.body as {
        messageText?: string;
        senderAgeClaim?: string;
        recipientIsMinor?: boolean;
      };

      if (!messageText || typeof messageText !== "string") {
        res.status(400).json({ error: "Nachrichtentext fehlt." });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Analysiere diese Chat-Nachricht auf Anzeichen von Cybergrooming, Pädokriminalität, emotionaler Manipulation von Minderjährigen, Geheimhaltungsdruck, Altersgrenzverletzung, Erpressung (Sextortion) oder Treffpunkt-Anbahnung.
Empfänger ist minderjährig: ${recipientIsMinor !== false ? "JA" : "NEIN"}.
Angebliches Alter des Absenders: ${senderAgeClaim || "Unbekannt"}.
Nachricht: "${messageText.slice(0, 2500)}"`,
        config: {
          systemInstruction:
            "Du bist das KI-Kinderschutz-Frühwarnsystem von KIVORA. Erkenne selbst subtile Grooming-Muster (z.B. 'Sag es nicht deinen Eltern', Geschenke/Guthabenkarten, schnelle Intimität, Treffen ohne Begleitung, Bildanfragen, Altersunterschied-Verharmlosung). Bei Verdacht warne Kinder klar, verständlich und schützend auf Deutsch.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: {
                type: Type.STRING,
                enum: ["safe", "caution", "high_risk", "critical_predator_alert"],
              },
              riskScore: { type: Type.INTEGER },
              detectedTactics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              childWarningGerman: { type: Type.STRING },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              shouldBlockDelivery: { type: Type.BOOLEAN },
            },
            required: [
              "riskLevel",
              "riskScore",
              "detectedTactics",
              "childWarningGerman",
              "recommendedActions",
              "shouldBlockDelivery",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kinderschutz-Analyse fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 3. KI-gestützte Stil-Filter-Empfehlung (CapCut Studio) ---
  app.post("/api/ai/recommend-filter", async (req: Request, res: Response) => {
    try {
      const { topic, userStyleHistory, moodDescription, targetPlatform } = req.body as {
        topic?: string;
        userStyleHistory?: string;
        moodDescription?: string;
        targetPlatform?: string;
      };

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Empfiehl ein maßgeschneidertes Color-Grading- & Filter-Preset für ein Video.
Thema: ${topic || "Politische Aufklärung"}
Bisheriger persönlicher Stil des Nutzers: ${userStyleHistory || "Klar, dokumentarisch, kontrastreich"}
Gewünschte Stimmung: ${moodDescription || "Authentisch und seriös"}
Zielplattform: ${targetPlatform || "9:16 Reels / TikTok"}`,
        config: {
          systemInstruction:
            "Du bist der KI-Colorist im KIVORA Video-Studio. Passe die Filterwerte exakt an den persönlichen Stil des Creators und das gesellschaftliche Thema an.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetName: { type: Type.STRING },
              rationale: { type: Type.STRING },
              brightness: { type: Type.NUMBER },
              contrast: { type: Type.NUMBER },
              saturation: { type: Type.NUMBER },
              warmth: { type: Type.NUMBER },
              vignette: { type: Type.NUMBER },
              recommendedFormat: {
                type: Type.STRING,
                enum: ["9:16", "1:1", "16:9", "4:5"],
              },
            },
            required: [
              "presetName",
              "rationale",
              "brightness",
              "contrast",
              "saturation",
              "warmth",
              "vignette",
              "recommendedFormat",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Filter-Empfehlung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 4. Intuitive Auto-Caption-Funktion (Synchronisierte Untertitel) ---
  app.post("/api/ai/auto-captions", async (req: Request, res: Response) => {
    try {
      const { scriptOrTranscript, durationSeconds, targetLanguage } = req.body as {
        scriptOrTranscript?: string;
        durationSeconds?: number;
        targetLanguage?: string;
      };

      if (!scriptOrTranscript || typeof scriptOrTranscript !== "string") {
        res.status(400).json({ error: "Bitte gib einen Video-Text oder ein Transkript ein." });
        return;
      }

      const totalSec = Math.max(6, Math.min(180, Number(durationSeconds) || 18));
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Erstelle präzise zeitlich synchronisierte Video-Untertitel (Auto-Captions) über ${totalSec} Sekunden in der Sprache "${targetLanguage || "Deutsch"}" für folgenden Inhalt:
"${scriptOrTranscript.slice(0, 2500)}"`,
        config: {
          systemInstruction:
            "Zerlege den Text in prägnante, gut lesbare Untertitel-Segmente (max. 6-8 Wörter pro Cue) mit exakten Start- und Endzeiten in Sekunden sowie einem hervorgehobenen Schlüsselwort.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                startSec: { type: Type.NUMBER },
                endSec: { type: Type.NUMBER },
                text: { type: Type.STRING },
                emphasisWord: { type: Type.STRING },
              },
              required: ["id", "startSec", "endSec", "text", "emphasisWord"],
            },
          },
        },
      });

      const captions = JSON.parse((response.text ?? "[]").trim());
      res.json({ captions });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto-Caption Generierung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 4b. TikTok & Instagram Reichweiten- & Hook-Assistent (ICE Ragotti KI) ---
  app.post("/api/ai/creator-growth-hook", async (req: Request, res: Response) => {
    try {
      const { topic, videoIdea, tiktokHandle, instagramHandle } = req.body as {
        topic?: string;
        videoIdea?: string;
        tiktokHandle?: string;
        instagramHandle?: string;
      };

      const cleanTopic = (topic || "Kinderschutz").slice(0, 80);
      const cleanIdea = (videoIdea || "Aufklärung & Direkthilfe für die Community").slice(0, 600);
      const cleanTikTok = (tiktokHandle || "@ice.ragotti").slice(0, 50);
      const cleanIg = (instagramHandle || "@ice.ragotti").slice(0, 50);

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Erstelle eine maßgeschneiderte TikTok- & Instagram-Reels-Reichweitenstrategie auf Deutsch für den Creator (${cleanTikTok} auf TikTok, ${cleanIg} auf Instagram) zum gesellschaftlichen Thema "${cleanTopic}".
Video-Idee / Botschaft: "${cleanIdea}"`,
        config: {
          systemInstruction:
            "Du bist der TikTok- & Instagram-Reichweiten-Stratege von ICE Ragotti auf KIVORA. Entwickle 3 fesselnde 3-Sekunden-Einstiege (Hooks) ohne Clickbait-Lügen, eine fertige Caption mit Call-to-Action zur sicheren KIVORA-Community (inkl. Hilfsnummern bei Schutzthemen), 6 reichweitenstarke deutsche Hashtags, eine Sound-/Sprechtempo-Empfehlung sowie einen konkreten Tipp, wie TikTok-Zuschauer nachhaltig in KIVORA-Livestreams und Schutzkanäle begleitet werden.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              openingHooks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              captionText: { type: Type.STRING },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              soundSuggestion: { type: Type.STRING },
              crossPostTip: { type: Type.STRING },
            },
            required: [
              "openingHooks",
              "captionText",
              "hashtags",
              "soundSuggestion",
              "crossPostTip",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reichweiten-Analyse fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 5. Livestream Automatische Untertitelung & Mehrsprachige Übersetzung ---
  app.post("/api/ai/live-translate", async (req: Request, res: Response) => {
    try {
      const { spokenText } = req.body as { spokenText?: string };
      if (!spokenText || typeof spokenText !== "string") {
        res.status(400).json({ error: "Gesprochener Text fehlt." });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Übersetze diese Live-Stream-Aussage simultan und sinngemäß in Deutsch (de), Englisch (en), Französisch (fr), Spanisch (es), Türkisch (tr) und Ukrainisch (uk):
"${spokenText.slice(0, 1000)}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              de: { type: Type.STRING },
              en: { type: Type.STRING },
              fr: { type: Type.STRING },
              es: { type: Type.STRING },
              tr: { type: Type.STRING },
              uk: { type: Type.STRING },
            },
            required: ["de", "en", "fr", "es", "tr", "uk"],
          },
        },
      });

      const translations = JSON.parse((response.text ?? "{}").trim());
      res.json({ translations });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Live-Übersetzung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 6. Mehrsprachige KI-Sprachsynchronisierung (TTS Audio Dubbing) ---
  app.post("/api/ai/tts-dub", async (req: Request, res: Response) => {
    try {
      const { text, language } = req.body as { text?: string; language?: string };
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Text für Sprachsynchronisierung fehlt." });
        return;
      }

      const ai = getGeminiClient();
      const voiceMap: Record<string, string> = {
        de: "Kore",
        en: "Zephyr",
        fr: "Aoede",
        es: "Puck",
        tr: "Charon",
        uk: "Fenrir",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text.slice(0, 600),
                speechMetadata: {
                  style: `Clear, calm, broadcast-quality simultaneous interpreter speaking in ${language || "de"}`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceMap[language || "de"] || "Kore",
              },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: "Kein Audiosignal vom TTS-Modell erhalten." });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "TTS-Synchronisierung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 7. Fakten- & Aufklärungskontext für Beiträge ---
  app.post("/api/ai/fact-check", async (req: Request, res: Response) => {
    try {
      const { title, body, topic } = req.body as {
        title?: string;
        body?: string;
        topic?: string;
      };
      if (!title || !body) {
        res.status(400).json({ error: "Titel und Inhalt erforderlich." });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Prüfe diesen Community-Beitrag im Bereich "${topic || "Allgemein"}" auf sachliche Einordnung, DSGVO-Konformität (keine Klarnamen-Pranger) und Jugendschutz. Gib eine kompakte 2-Satz-Einordnung auf Deutsch zurück.
Titel: ${title.slice(0, 140)}
Text: ${body.slice(0, 2000)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ factNote: (response.text || "").slice(0, 580) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Faktenprüfung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- 8. ID-Austria eID Cryptographic Verification ---
  app.post("/api/auth/id-austria/verify", (req: Request, res: Response) => {
    const { uid, birthYear, tanCode, citizenName } = req.body as {
      uid?: string;
      birthYear?: number;
      tanCode?: string;
      citizenName?: string;
    };

    if (!uid || !tanCode || String(tanCode).trim().length < 4) {
      res.status(400).json({ error: "Bitte gib eine gültige ID-Austria Signatur-TAN (mind. 4 Zeichen) ein." });
      return;
    }

    const parsedYear = Number(birthYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1920 || parsedYear > 2020) {
      res.status(400).json({ error: "Bitte gib ein gültiges Geburtsjahr (1920–2020) ein." });
      return;
    }

    const currentYear = new Date().getFullYear();
    const isAdult = currentYear - parsedYear >= 18;
    const idAustriaBpkHash = crypto
      .createHash("sha256")
      .update(`AT-EID:${uid}:${parsedYear}:${tanCode}`)
      .digest("hex");

    res.json({
      verified: true,
      idAustriaBpkHash,
      ageGroup: isAdult ? "adult" : "minor",
      birthYear: parsedYear,
      citizenLabel: citizenName || "ID-Austria Bürgerkonto",
      verifiedAt: new Date().toISOString(),
    });
  });

  // --- 9. Strictly Age-Gated 18+ Forum Endpoints ---
  app.get("/api/posts/adult", (req: Request, res: Response) => {
    const isAdultHeader = req.header("x-kivora-age-group") === "adult";
    const hasBpk = Boolean(req.header("x-kivora-bpk"));
    if (!isAdultHeader || !hasBpk) {
      res.status(403).json({
        error: "Zugriff verweigert: 18+ Inhalte sind für Minderjährige strikt gesperrt und erfordern eine aktive ID-Austria Volljährigkeitsprüfung.",
      });
      return;
    }
    res.json({ posts: adultDebatePosts });
  });

  app.post("/api/posts/adult", (req: Request, res: Response) => {
    const isAdultHeader = req.header("x-kivora-age-group") === "adult";
    const hasBpk = Boolean(req.header("x-kivora-bpk"));
    if (!isAdultHeader || !hasBpk) {
      res.status(403).json({
        error: "Zugriff verweigert: Nur ID-Austria-verifizierte Erwachsene (18+) können im 18+ Bereich veröffentlichen.",
      });
      return;
    }

    const { authorId, authorName, authorHandle, title, body } = req.body as Partial<AdultPostItem>;
    if (!title || !body) {
      res.status(400).json({ error: "Titel und Text erforderlich." });
      return;
    }

    const newPost: AdultPostItem = {
      id: `adult_${Date.now()}`,
      authorId: authorId || "verified_user",
      authorName: authorName || "Verifiziertes Mitglied",
      authorHandle: authorHandle || "@mitglied.at",
      topic: "18+ Debatte & Aufklärung",
      title: String(title).slice(0, 140),
      body: String(body).slice(0, 3000),
      createdAt: new Date().toISOString(),
      likesCount: 1,
    };

    adultDebatePosts.unshift(newPost);
    res.status(201).json({ post: newPost });
  });

  // --- 10. Livestream Room State & Demographics REST Endpoint ---
  app.get("/api/livestreams", (_req: Request, res: Response) => {
    res.json({
      streams: Array.from(liveRooms.values()),
    });
  });

  // --- 11. DSGVO Beta Pre-Registration Endpoints ---
  app.get("/api/beta/status", (_req: Request, res: Response) => {
    res.json({
      totalRegistered: betaWaitlistCounter,
      dsgvoVersion: "DSGVO-2026-v1",
      betaWave: "Beta-Welle 1 (DACH & EU)",
    });
  });

  app.post("/api/beta/preregister", (req: Request, res: Response) => {
    const { displayName, email, focusTopic, platformInterest, dsgvoConsent } = req.body as {
      displayName?: string;
      email?: string;
      focusTopic?: string;
      platformInterest?: string;
      dsgvoConsent?: boolean;
    };

    if (!displayName || displayName.trim().length < 2) {
      res.status(400).json({ error: "Bitte gib deinen Namen oder ein Pseudonym (mind. 2 Zeichen) ein." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });
      return;
    }
    if (dsgvoConsent !== true) {
      res.status(400).json({
        error: "Für die Beta-Vorregistrierung ist deine ausdrückliche DSGVO-Einwilligung (Art. 6 DSGVO) erforderlich.",
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = betaTickets.get(cleanEmail);
    if (existing) {
      res.json({
        registered: true,
        ticketCode: existing.ticketCode,
        totalRegistered: betaWaitlistCounter,
        dsgvoVersion: "DSGVO-2026-v1",
      });
      return;
    }

    betaWaitlistCounter += 1;
    const ticketCode = `KIVORA-BETA-${betaWaitlistCounter}`;
    betaTickets.set(cleanEmail, {
      ticketCode,
      focusTopic: focusTopic || "Alle Schutzthemen",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      registered: true,
      ticketCode,
      totalRegistered: betaWaitlistCounter,
      platformInterest: platformInterest || "Alle Plattformen",
      dsgvoVersion: "DSGVO-2026-v1",
    });
  });

  // --- 12. 18+ Dating AI Icebreaker & Safety Endpoint ---
  app.post("/api/ai/dating-icebreaker", async (req: Request, res: Response) => {
    try {
      const { partnerName, partnerCity, sharedValues, matchOrigin, userAgeGroup } =
        req.body as {
          partnerName?: string;
          partnerCity?: string;
          sharedValues?: string[];
          matchOrigin?: string;
          userAgeGroup?: string;
        };

      if (userAgeGroup === "minor") {
        res.status(403).json({
          error:
            "Jugendschutz (<18): Dating-Funktionen sind auf KIVORA strikt für Erwachsene (18+) getrennt.",
        });
        return;
      }

      const ai = getGeminiClient();
      const originLabel =
        matchOrigin === "tiktok_live_match"
          ? "einem TikTok-Live-Match-Duell"
          : matchOrigin === "tiktok_video_duet"
          ? "einem TikTok-9:16-Video-Match"
          : matchOrigin === "super_like"
          ? "einem Tinder-Super-Like"
          : "einem Tinder-Swipe-Match";

      const promptText = `Erstelle 3 charmante, respektvolle, authentische Gesprächs-Eisbrecher auf Deutsch für ein neues 18+ Match auf KIVORA.
Match-Partner: ${partnerName || "Clara"} aus ${partnerCity || "Wien"}
Gemeinsame Werte & Themen: ${(sharedValues || ["Tierschutz", "Aufklärung"]).join(", ")}
Entstanden über: ${originLabel}
Gib außerdem einen kurzen, sympathischen Sicherheitstipp (1 Satz) für sicheres Kennenlernen im DACH-Raum.`;

      let responseText = "{}";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: promptText,
          config: {
            systemInstruction:
              "Du bist der respektvolle Dating- & Sicherheits-Assistent von KIVORA. Formuliere warmherzige, geistreiche Eisbrecher ohne Plattitüden oder Übergriffigkeit.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                icebreakers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                safetyTip: { type: Type.STRING },
              },
              required: ["icebreakers", "safetyTip"],
            },
          },
        });
        responseText = response.text ?? "{}";
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptText,
          config: {
            systemInstruction:
              "Du bist der respektvolle Dating- & Sicherheits-Assistent von KIVORA. Formuliere warmherzige, geistreiche Eisbrecher ohne Plattitüden oder Übergriffigkeit.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                icebreakers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                safetyTip: { type: Type.STRING },
              },
              required: ["icebreakers", "safetyTip"],
            },
          },
        });
        responseText = fallbackResp.text ?? "{}";
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Eisbrecher-Generierung fehlgeschlagen";
      res.status(500).json({ error: msg });
    }
  });

  // --- HTTP + WebSocket Server ---
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  function broadcastToAll(payload: unknown) {
    const serialized = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }

  wss.on("connection", (ws: WebSocket) => {
    const room = liveRooms.get("stream_civic_blackout");
    if (room) {
      room.viewerCount += 1;
      ws.send(
        JSON.stringify({
          type: "stream:sync",
          room,
          allRooms: Array.from(liveRooms.values()),
        })
      );
      broadcastToAll({
        type: "stream:viewers",
        streamId: room.streamId,
        viewerCount: room.viewerCount,
      });
    }

    const defaultMatchRoom = liveMatchRooms.get("match_room_vienna");
    if (defaultMatchRoom) {
      ws.send(
        JSON.stringify({
          type: "dating:live_match_sync",
          matchRoom: defaultMatchRoom,
          allMatchRooms: Array.from(liveMatchRooms.values()),
        })
      );
    }

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          streamId?: string;
          optionId?: string;
          sender?: string;
          text?: string;
          language?: string;
          userName?: string;
          topicNote?: string;
          title?: string;
          topic?: string;
          platforms?: string[];
          translations?: Record<string, string>;
          chatId?: string;
          encryptedEnvelope?: unknown;
          reel?: unknown;
          burstCount?: number;
          reactionLabel?: string;
          requestId?: string;
          pinnedMessage?: { sender: string; text: string } | null;
          matchRoomId?: string;
          side?: "A" | "B";
        };

        if (msg.type === "stream:select_room" && msg.streamId) {
          const chosen = liveRooms.get(msg.streamId);
          if (chosen) {
            ws.send(
              JSON.stringify({
                type: "stream:sync",
                room: chosen,
                allRooms: Array.from(liveRooms.values()),
              })
            );
          }
          return;
        }

        if (msg.type === "stream:create_room" && msg.title) {
          const newId = `stream_${Date.now()}`;
          const hostStr = String(msg.sender || "KIVORA Creator").slice(0, 60);
          const titleStr = String(msg.title).slice(0, 140);
          const newRoom: LiveStreamRoom = {
            streamId: newId,
            hostName: hostStr,
            title: titleStr,
            topic: String(msg.topic || "Kinderschutz").slice(0, 60),
            platforms:
              Array.isArray(msg.platforms) && msg.platforms.length > 0
                ? msg.platforms
                : ["KIVORA Native", "Instagram Live", "TikTok 9:16"],
            viewerCount: 1,
            likesCount: 1,
            pinnedMessage: {
              sender: hostStr,
              text: `Willkommen im Live-Raum „${titleStr.slice(0, 80)}“! Stelle deine Fragen direkt im Chat.`,
            },
            isLive: true,
            activePoll: {
              streamId: newId,
              question: `Wie können wir "${String(msg.topic || "Kinderschutz").slice(0, 40)}" gemeinsam stärken?`,
              options: [
                { id: "opt_a", label: "Direkte Aufklärung & Prävention", votes: 1 },
                { id: "opt_b", label: "Ehrenamtliche Hilfsnetzwerke ausbauen", votes: 1 },
                { id: "opt_c", label: "Rechtliche Schutzstandards verschärfen", votes: 1 },
              ],
            },
            recentMessages: [
              {
                id: `lm_${Date.now()}`,
                sender: "KIVORA Live-System",
                text: `Livestream "${titleStr.slice(0, 80)}" wurde gestartet. Kinderschutz-Moderation aktiv.`,
                language: "de",
                timestamp: "Gerade eben",
              },
            ],
            stageRequests: [],
          };
          liveRooms.set(newId, newRoom);
          broadcastToAll({
            type: "stream:rooms_list",
            allRooms: Array.from(liveRooms.values()),
          });
          ws.send(
            JSON.stringify({
              type: "stream:sync",
              room: newRoom,
              allRooms: Array.from(liveRooms.values()),
            })
          );
          return;
        }

        const targetRoom = liveRooms.get(msg.streamId || "stream_civic_blackout");

        if (msg.type === "stream:like" && targetRoom) {
          const delta = Math.max(1, Math.min(25, Number(msg.burstCount) || 1));
          targetRoom.likesCount += delta;
          broadcastToAll({
            type: "stream:likes_updated",
            streamId: targetRoom.streamId,
            likesCount: targetRoom.likesCount,
          });
        } else if (msg.type === "stream:gift_support" && targetRoom && msg.reactionLabel) {
          const cleanReaction = String(msg.reactionLabel).slice(0, 60);
          const senderName = String(msg.sender || "Zuschauer").slice(0, 60);
          targetRoom.likesCount += 50;
          const entry = {
            id: `lm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sender: senderName,
            text: `hat den Schutz-Impuls „${cleanReaction}“ an den Stream gesendet`,
            language: "de",
            timestamp: "Gerade eben",
            isReaction: true,
          };
          targetRoom.recentMessages = [entry, ...targetRoom.recentMessages].slice(0, 40);
          broadcastToAll({
            type: "stream:chat_message",
            streamId: targetRoom.streamId,
            message: entry,
          });
          broadcastToAll({
            type: "stream:likes_updated",
            streamId: targetRoom.streamId,
            likesCount: targetRoom.likesCount,
          });
        } else if (msg.type === "stream:pin_message" && targetRoom) {
          targetRoom.pinnedMessage = msg.pinnedMessage
            ? {
                sender: String(msg.pinnedMessage.sender).slice(0, 60),
                text: String(msg.pinnedMessage.text).slice(0, 220),
              }
            : null;
          broadcastToAll({
            type: "stream:pinned_updated",
            streamId: targetRoom.streamId,
            pinnedMessage: targetRoom.pinnedMessage,
          });
        } else if (msg.type === "stream:accept_stage" && targetRoom && msg.requestId) {
          targetRoom.stageRequests = targetRoom.stageRequests.map((sr) =>
            sr.id === msg.requestId
              ? { ...sr, status: sr.status === "on_stage" ? "waiting" : "on_stage" }
              : sr
          );
          broadcastToAll({
            type: "stream:stage_updated",
            streamId: targetRoom.streamId,
            stageRequests: targetRoom.stageRequests,
          });
        } else if (msg.type === "stream:poll_vote" && targetRoom && msg.optionId) {
          const opt = targetRoom.activePoll.options.find((o) => o.id === msg.optionId);
          if (opt) {
            opt.votes += 1;
            broadcastToAll({
              type: "stream:poll_updated",
              streamId: targetRoom.streamId,
              activePoll: targetRoom.activePoll,
            });
          }
        } else if (msg.type === "stream:chat" && targetRoom && msg.text) {
          const entry = {
            id: `lm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sender: String(msg.sender || "Zuschauer").slice(0, 60),
            text: String(msg.text).slice(0, 400),
            language: String(msg.language || "de").slice(0, 10),
            timestamp: "Gerade eben",
          };
          targetRoom.recentMessages = [entry, ...targetRoom.recentMessages].slice(0, 40);
          broadcastToAll({
            type: "stream:chat_message",
            streamId: targetRoom.streamId,
            message: entry,
          });
        } else if (msg.type === "stream:stage_request" && targetRoom && msg.userName) {
          const reqEntry = {
            id: `sr_${Date.now()}`,
            userName: String(msg.userName).slice(0, 60),
            topicNote: String(msg.topicNote || "Live-Beitrag").slice(0, 120),
            status: "waiting" as const,
          };
          targetRoom.stageRequests = [reqEntry, ...targetRoom.stageRequests].slice(0, 15);
          broadcastToAll({
            type: "stream:stage_updated",
            streamId: targetRoom.streamId,
            stageRequests: targetRoom.stageRequests,
          });
        } else if (msg.type === "stream:subtitle_broadcast" && targetRoom && msg.translations) {
          broadcastToAll({
            type: "stream:subtitle_live",
            streamId: targetRoom.streamId,
            translations: msg.translations,
          });
        } else if (msg.type === "stream:start_broadcast" && targetRoom) {
          if (msg.title) targetRoom.title = String(msg.title).slice(0, 140);
          if (msg.topic) targetRoom.topic = String(msg.topic).slice(0, 60);
          if (msg.sender) targetRoom.hostName = String(msg.sender).slice(0, 60);
          if (Array.isArray(msg.platforms) && msg.platforms.length > 0) {
            targetRoom.platforms = msg.platforms;
          }
          targetRoom.isLive = true;
          broadcastToAll({
            type: "stream:sync",
            room: targetRoom,
            allRooms: Array.from(liveRooms.values()),
          });
        } else if (msg.type === "reel:published" && msg.reel) {
          broadcastToAll({
            type: "reel:published",
            reel: msg.reel,
          });
        } else if (msg.type === "chat:encrypted_message" && msg.chatId && msg.encryptedEnvelope) {
          broadcastToAll({
            type: "chat:encrypted_message",
            chatId: msg.chatId,
            encryptedEnvelope: msg.encryptedEnvelope,
          });
        } else if (msg.type === "dating:select_live_match" && msg.matchRoomId) {
          const chosenMatchRoom = liveMatchRooms.get(msg.matchRoomId);
          if (chosenMatchRoom) {
            ws.send(
              JSON.stringify({
                type: "dating:live_match_sync",
                matchRoom: chosenMatchRoom,
                allMatchRooms: Array.from(liveMatchRooms.values()),
              })
            );
          }
        } else if (msg.type === "dating:live_match_boost" && msg.matchRoomId) {
          const chosenMatchRoom = liveMatchRooms.get(msg.matchRoomId);
          if (chosenMatchRoom) {
            if (msg.side === "B") {
              chosenMatchRoom.hostB.score += 15;
            } else {
              chosenMatchRoom.hostA.score += 15;
            }
            broadcastToAll({
              type: "dating:live_match_updated",
              matchRoom: chosenMatchRoom,
              allMatchRooms: Array.from(liveMatchRooms.values()),
            });
          }
        } else if (msg.type === "dating:live_match_chat" && msg.matchRoomId && msg.text) {
          const chosenMatchRoom = liveMatchRooms.get(msg.matchRoomId);
          if (chosenMatchRoom) {
            const chatEntry = {
              id: `dm_live_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              sender: String(msg.sender || "18+ Gast").slice(0, 60),
              text: String(msg.text).slice(0, 320),
              timestamp: "Gerade eben",
            };
            chosenMatchRoom.recentMessages = [
              chatEntry,
              ...chosenMatchRoom.recentMessages,
            ].slice(0, 30);
            broadcastToAll({
              type: "dating:live_match_updated",
              matchRoom: chosenMatchRoom,
              allMatchRooms: Array.from(liveMatchRooms.values()),
            });
          }
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on("close", () => {
      const currentRoom = liveRooms.get("stream_civic_blackout");
      if (currentRoom && currentRoom.viewerCount > 1) {
        currentRoom.viewerCount -= 1;
        broadcastToAll({
          type: "stream:viewers",
          streamId: currentRoom.streamId,
          viewerCount: currentRoom.viewerCount,
        });
      }
    });
  });

  // --- Vite Middleware or Production Dist ---
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`KIVORA full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
