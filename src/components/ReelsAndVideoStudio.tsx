import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Sparkles,
  CloudUpload,
  Download,
  Heart,
  Flag,
  Video,
  Captions,
  Sliders,
  CheckCircle2,
  FolderSync,
  Upload,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Share2,
  Plus,
  X,
  Film,
  Bookmark,
  Check,
  Music,
  ExternalLink,
  Copy,
  TrendingUp,
} from "lucide-react";
import { SafeImage } from "./SafeImage";
import { MEDIA_ASSETS } from "../lib/mediaAssets";
import {
  YOUTH_SAFE_TOPICS,
  type CivicTopic,
  type CreatorGrowthHookResult,
  type FilterSettings,
  type UserProfile,
  type VideoProject,
  type VideoReel,
  type SafetyReportRecord,
} from "../types/kivora";

interface ReelsAndVideoStudioProps {
  currentUser: UserProfile | null;
  aiAvatarUrl: string;
  tiktokHandle: string;
  instagramHandle: string;
  onUpdateSocialHandles: (tt: string, ig: string) => void;
  selectedReelId?: string | null;
  reels: VideoReel[];
  savedProjects: VideoProject[];
  activeProject: VideoProject;
  onChangeActiveProject: (proj: VideoProject) => void;
  onSaveProjectToCloud: (proj: VideoProject) => Promise<void>;
  onPublishReel: (input: {
    topic: CivicTopic;
    title: string;
    filterPreset: string;
    captionSummary: string;
    coverUrl: string;
    videoUrl?: string;
    durationLabel?: string;
  }) => Promise<void>;
  onLikeReel: (reel: VideoReel) => Promise<void>;
  onOpenReportModal: (
    targetType: SafetyReportRecord["targetType"],
    targetId: string,
    targetTitle: string
  ) => void;
  onOpenIdAustriaModal: () => void;
}

const FILTER_PRESETS: { name: string; settings: FilterSettings }[] = [
  {
    name: "Insta Warm Protection",
    settings: { brightness: 1.05, contrast: 1.15, saturation: 1.08, warmth: 12, vignette: 0.16 },
  },
  {
    name: "Krisen-Kontrast Amber",
    settings: { brightness: 0.98, contrast: 1.24, saturation: 1.08, warmth: 16, vignette: 0.32 },
  },
  {
    name: "Klarblick Dokumentar",
    settings: { brightness: 1.04, contrast: 1.14, saturation: 0.96, warmth: 6, vignette: 0.18 },
  },
  {
    name: "Schutzschild Neutral",
    settings: { brightness: 1.06, contrast: 1.05, saturation: 0.9, warmth: -8, vignette: 0.1 },
  },
];

const EXPORT_FORMATS: {
  id: string;
  label: string;
  aspect: VideoProject["aspectRatio"];
  width: number;
  height: number;
}[] = [
  { id: "tiktok_reels", label: "9:16 TikTok / Instagram Reels", aspect: "9:16", width: 540, height: 960 },
  { id: "instagram_square", label: "1:1 Instagram Feed", aspect: "1:1", width: 720, height: 720 },
  { id: "youtube_x", label: "16:9 YouTube / X", aspect: "16:9", width: 960, height: 540 },
  { id: "portrait_4_5", label: "4:5 Portrait Editorial", aspect: "4:5", width: 640, height: 800 },
];

function getDefaultCoverForTopic(topic: CivicTopic): string {
  if (topic === "Tierschutz") return MEDIA_ASSETS.animalWelfare;
  if (topic === "Blackout & Krisenvorsorge") return MEDIA_ASSETS.blackoutKit;
  if (topic === "Frauenschutz" || topic === "Männerschutz") return MEDIA_ASSETS.heroCivic;
  return MEDIA_ASSETS.youthProtection;
}

export function ReelsAndVideoStudio({
  currentUser,
  aiAvatarUrl,
  tiktokHandle,
  instagramHandle,
  onUpdateSocialHandles,
  selectedReelId,
  reels,
  savedProjects,
  activeProject,
  onChangeActiveProject,
  onSaveProjectToCloud,
  onPublishReel,
  onLikeReel,
  onOpenReportModal,
  onOpenIdAustriaModal,
}: ReelsAndVideoStudioProps) {
  const [subTab, setSubTab] = useState<"reels" | "studio">("reels");
  const [reelTopicFilter, setReelTopicFilter] = useState<"Alle" | CivicTopic>("Alle");
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [savedReels, setSavedReels] = useState<Record<string, boolean>>({});
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({
    ice_ragotti: true,
    "ICE Ragotti": true,
  });
  const [copiedReelId, setCopiedReelId] = useState<string | null>(null);

  const youthSafeReels = reels.filter((r) => !r.isAdultOnly);
  const filteredReels =
    reelTopicFilter === "Alle"
      ? youthSafeReels
      : youthSafeReels.filter((r) => r.topic === reelTopicFilter);

  const [activeReelIdx, setActiveReelIdx] = useState<number>(0);
  const [reelPlaying, setReelPlaying] = useState(true);
  const touchStartYRef = useRef<number | null>(null);
  const wheelCooldownRef = useRef<number>(0);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const [reelComments, setReelComments] = useState<
    Record<string, { author: string; text: string }[]>
  >({
    reel_1: [
      {
        author: "Julia_Graz",
        text: "Super wichtiges Video! Habe es direkt mit unserer Schulklasse geteilt.",
      },
    ],
  });
  const [reelCommentInput, setReelCommentInput] = useState("");

  // TikTok & Instagram Reach Bridge & AI Hook Generator state
  const [localTiktok, setLocalTiktok] = useState(tiktokHandle);
  const [localInstagram, setLocalInstagram] = useState(instagramHandle);
  const [handlesSavedMsg, setHandlesSavedMsg] = useState<string | null>(null);
  const [bioCopiedMsg, setBioCopiedMsg] = useState<string | null>(null);
  const [hookTopic, setHookTopic] = useState<CivicTopic>("Kinderschutz");
  const [hookIdea, setHookIdea] = useState(
    "3 Warnsignale bei Cyber-Grooming erkennen & Kinder sofort schützen"
  );
  const [hookResult, setHookResult] = useState<CreatorGrowthHookResult | null>(null);
  const [selectedHookIdx, setSelectedHookIdx] = useState<number>(0);
  const [loadingHook, setLoadingHook] = useState<boolean>(false);
  const [hookError, setHookError] = useState<string | null>(null);
  const [hookCopiedMsg, setHookCopiedMsg] = useState<string | null>(null);

  // Instant Direct Reel Upload Panel
  const [showReelUploader, setShowReelUploader] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTopic, setUploadTopic] = useState<CivicTopic>("Kinderschutz");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFilter, setUploadFilter] = useState("Insta Warm Protection");
  const [uploadVideoBlobUrl, setUploadVideoBlobUrl] = useState<string | undefined>(undefined);
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState<string | null>(null);

  // Studio states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(1.5);
  const [usingWebcam, setUsingWebcam] = useState(false);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [studioVideoUrl, setStudioVideoUrl] = useState<string | undefined>(undefined);

  // AI Filter Advisor
  const [studioTopic, setStudioTopic] = useState<CivicTopic>("Kinderschutz");
  const [styleHistory, setStyleHistory] = useState(
    "Warme Instagram-Ästhetik, klare Lesbarkeit für Untertitel"
  );
  const [moodInput, setMoodInput] = useState("Empathisch, schützend, eindringlich");
  const [aiFilterRationale, setAiFilterRationale] = useState<string | null>(null);
  const [loadingAiFilter, setLoadingAiFilter] = useState(false);

  // AI Auto-Captions
  const [scriptText, setScriptText] = useState(
    "Digitaler Kinderschutz, Tierschutz sowie Frauen- und Männerschutz brauchen starke Gemeinschaften. Direkte Hilfe über Rat auf Draht 147 und Polizei 133."
  );
  const [captionLanguage, setCaptionLanguage] = useState("Deutsch");
  const [loadingCaptions, setLoadingCaptions] = useState(false);

  // Cloud Sync & Export feedback
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string | null>(null);
  const [exportStatusMsg, setExportStatusMsg] = useState<string | null>(null);
  const [publishingReel, setPublishingReel] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);

  useEffect(() => {
    setLocalTiktok(tiktokHandle);
    setLocalInstagram(instagramHandle);
  }, [tiktokHandle, instagramHandle]);

  useEffect(() => {
    if (!selectedReelId) return;
    setSubTab("reels");
    setReelTopicFilter("Alle");
    const foundIdx = youthSafeReels.findIndex((r) => r.id === selectedReelId);
    if (foundIdx >= 0) {
      setActiveReelIdx(foundIdx);
    }
  }, [selectedReelId, youthSafeReels]);

  const currentReel =
    filteredReels[activeReelIdx] || filteredReels[0] || youthSafeReels[0];

  // Load background image onto imgElRef for canvas compositing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = uploadedMediaUrl || MEDIA_ASSETS.youthProtection;
    img.onload = () => {
      imgElRef.current = img;
    };
  }, [uploadedMediaUrl]);

  // Playback timer
  useEffect(() => {
    if (subTab !== "studio" || !isPlayingPreview) return;
    const timer = window.setInterval(() => {
      setPlayheadSec((prev) => (prev + 0.1 >= 12 ? 0 : Number((prev + 0.1).toFixed(1))));
    }, 100);
    return () => window.clearInterval(timer);
  }, [subTab, isPlayingPreview]);

  // Render live filtered video/image + synchronized auto-captions onto HTML5 Canvas
  useEffect(() => {
    if (subTab !== "studio") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { brightness, contrast, saturation, warmth, vignette } = activeProject.filterSettings;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const sepiaPct = warmth > 0 ? Math.min(0.45, warmth / 100) : 0;
    const hueDeg = warmth < 0 ? warmth * 0.6 : 0;
    ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${sepiaPct}) hue-rotate(${hueDeg}deg)`;

    const videoEl = videoElRef.current;
    const imgEl = imgElRef.current;
    if ((usingWebcam || studioVideoUrl) && videoEl && videoEl.readyState >= 2) {
      ctx.drawImage(videoEl, 0, 0, w, h);
    } else if (imgEl) {
      const scale = 1 + (playheadSec / 12) * 0.08;
      const drawW = w * scale;
      const drawH = h * scale;
      ctx.drawImage(imgEl, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.filter = "none";

    if (warmth < 0) {
      ctx.fillStyle = `rgba(225, 29, 72, ${Math.min(0.16, Math.abs(warmth) / 170)})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (vignette > 0) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.78);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${vignette})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    const activeCue = activeProject.captions.find(
      (c) => playheadSec >= c.startSec && playheadSec <= c.endSec
    );
    if (activeCue) {
      const boxWidth = w * 0.86;
      const boxX = (w - boxWidth) / 2;
      const boxY = h - 108;

      ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, 68, 12);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const words = activeCue.text.split(" ");
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(" ");
      const line2 = words.slice(mid).join(" ");

      if (line2) {
        ctx.fillText(line1, w / 2, boxY + 23, boxWidth - 24);
        ctx.fillStyle = "#fb7185";
        ctx.fillText(line2, w / 2, boxY + 46, boxWidth - 24);
      } else {
        ctx.fillText(line1, w / 2, boxY + 34, boxWidth - 24);
      }
    }
  }, [subTab, activeProject, playheadSec, usingWebcam, studioVideoUrl]);

  const handleToggleWebcam = async () => {
    if (usingWebcam) {
      const stream = videoElRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      setUsingWebcam(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        videoElRef.current.src = "";
        await videoElRef.current.play();
      }
      setStudioVideoUrl(undefined);
      setUsingWebcam(true);
      setStudioError(null);
    } catch {
      setStudioError(
        "Kamera im Browser nicht verfügbar — Studio verwendet Dokumentations-Szene oder hochgeladenes Video/Bild."
      );
    }
  };

  const handleUploadLocalMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUsingWebcam(false);
    if (file.type.startsWith("video/")) {
      setStudioVideoUrl(url);
      setUploadedMediaUrl(null);
      if (videoElRef.current) {
        videoElRef.current.srcObject = null;
        videoElRef.current.src = url;
        videoElRef.current.loop = true;
        videoElRef.current.play().catch(() => {});
      }
    } else {
      setStudioVideoUrl(undefined);
      setUploadedMediaUrl(url);
    }
  };

  const handleDirectReelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const url = URL.createObjectURL(file);
    setUploadVideoBlobUrl(url);
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 120));
    }
  };

  const handleSubmitDirectReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setStudioError("Bitte gib einen Titel für dein Reel ein.");
      return;
    }
    setUploadingDirect(true);
    setStudioError(null);
    setUploadSuccessBanner(null);
    try {
      await onPublishReel({
        topic: uploadTopic,
        title: uploadTitle.trim(),
        filterPreset: uploadFilter,
        captionSummary:
          uploadCaption.trim() ||
          `${uploadTopic}: Aufklärung, Direkthilfe & Schutz auf KIVORA (Rat auf Draht 147 · Polizei 133).`,
        coverUrl: getDefaultCoverForTopic(uploadTopic),
        videoUrl: uploadVideoBlobUrl,
        durationLabel: uploadVideoBlobUrl ? "Original-Video" : "0:15",
      });
      setSubTab("reels");
      setActiveReelIdx(0);
      setShowReelUploader(false);
      setUploadTitle("");
      setUploadCaption("");
      setUploadFileName("");
      setUploadVideoBlobUrl(undefined);
      setUploadSuccessBanner(
        "Dein Reel wurde hochgeladen und ist ab sofort im Reels-Feed verfügbar!"
      );
    } catch (err) {
      setStudioError(
        err instanceof Error ? err.message : "Reel-Upload fehlgeschlagen"
      );
    } finally {
      setUploadingDirect(false);
    }
  };

  const handleAiRecommendFilter = async () => {
    setLoadingAiFilter(true);
    setStudioError(null);
    try {
      const res = await fetch("/api/ai/recommend-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: studioTopic,
          userStyleHistory: styleHistory,
          moodDescription: moodInput,
          targetPlatform: activeProject.aspectRatio,
        }),
      });
      const data = (await res.json()) as {
        presetName?: string;
        rationale?: string;
        brightness?: number;
        contrast?: number;
        saturation?: number;
        warmth?: number;
        vignette?: number;
        recommendedFormat?: VideoProject["aspectRatio"];
        error?: string;
      };
      if (!res.ok || !data.presetName) {
        throw new Error(data.error || "Filter-Empfehlung fehlgeschlagen");
      }
      setAiFilterRationale(data.rationale || null);
      onChangeActiveProject({
        ...activeProject,
        filterPreset: data.presetName,
        aspectRatio: data.recommendedFormat || activeProject.aspectRatio,
        aiRecommendedFilter: `${data.presetName}: ${data.rationale || ""}`.slice(0, 120),
        filterSettings: {
          brightness: Number(data.brightness ?? 1.04),
          contrast: Number(data.contrast ?? 1.15),
          saturation: Number(data.saturation ?? 1.0),
          warmth: Number(data.warmth ?? 8),
          vignette: Number(data.vignette ?? 0.2),
        },
      });
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "KI-Filterfehler");
    } finally {
      setLoadingAiFilter(false);
    }
  };

  const handleGenerateAutoCaptions = async () => {
    if (!scriptText.trim()) return;
    setLoadingCaptions(true);
    setStudioError(null);
    try {
      const res = await fetch("/api/ai/auto-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptOrTranscript: scriptText.trim(),
          durationSeconds: 12,
          targetLanguage: captionLanguage,
        }),
      });
      const data = (await res.json()) as {
        captions?: VideoProject["captions"];
        error?: string;
      };
      if (!res.ok || !data.captions) {
        throw new Error(data.error || "Auto-Caption Generierung fehlgeschlagen");
      }
      onChangeActiveProject({
        ...activeProject,
        captions: data.captions,
      });
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Untertitel-Fehler");
    } finally {
      setLoadingCaptions(false);
    }
  };

  const handleCloudSync = async () => {
    if (!currentUser) {
      onOpenIdAustriaModal();
      return;
    }
    setSyncingCloud(true);
    setCloudStatusMsg(null);
    setStudioError(null);
    try {
      const updated: VideoProject = {
        ...activeProject,
        ownerId: currentUser.uid,
        lastSyncedLabel: `Cloud-Synchronisiert · ${new Date().toLocaleTimeString("de-AT", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      };
      await onSaveProjectToCloud(updated);
      onChangeActiveProject(updated);
      setCloudStatusMsg(
        "Projekt erfolgreich in der Cloud gespeichert — auf allen Geräten sofort fortsetzbar."
      );
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Cloud-Sync fehlgeschlagen");
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleOneClickExport = (formatObj: (typeof EXPORT_FORMATS)[number]) => {
    onChangeActiveProject({
      ...activeProject,
      aspectRatio: formatObj.aspect,
      exportFormats: Array.from(new Set([...activeProject.exportFormats, formatObj.label])),
    });

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = formatObj.width;
    exportCanvas.height = formatObj.height;
    const ctx = exportCanvas.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, formatObj.width, formatObj.height);
      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `KIVORA_${formatObj.id}_${Date.now()}.png`;
      link.click();
    }

    const srtContent = activeProject.captions
      .map((c, idx) => {
        const formatTime = (sec: number) => {
          const s = Math.floor(sec);
          const ms = Math.round((sec - s) * 1000);
          return `00:00:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
        };
        return `${idx + 1}\n${formatTime(c.startSec)} --> ${formatTime(c.endSec)}\n${c.text}\n`;
      })
      .join("\n");

    const srtBlob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const srtUrl = URL.createObjectURL(srtBlob);
    const srtLink = document.createElement("a");
    srtLink.href = srtUrl;
    srtLink.download = `KIVORA_${formatObj.id}_Untertitel.srt`;
    srtLink.click();

    setExportStatusMsg(
      `1-Klick-Export abgeschlossen: ${formatObj.label} (Render-Frame + .SRT Untertitel heruntergeladen).`
    );
  };

  const handlePublishStudioAsReel = async () => {
    setPublishingReel(true);
    setStudioError(null);
    setUploadSuccessBanner(null);
    try {
      await onPublishReel({
        topic: studioTopic,
        title: activeProject.title,
        filterPreset: activeProject.filterPreset,
        captionSummary: activeProject.captions.map((c) => c.text).join(" · ").slice(0, 500),
        coverUrl: getDefaultCoverForTopic(studioTopic),
        videoUrl: studioVideoUrl,
        durationLabel: studioVideoUrl ? "Studio-Video" : "0:12",
      });
      setSubTab("reels");
      setReelTopicFilter("Alle");
      setActiveReelIdx(0);
      setUploadSuccessBanner(
        "Studio-Projekt als Reel veröffentlicht und sofort abspielbar!"
      );
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Reel-Veröffentlichung fehlgeschlagen");
    } finally {
      setPublishingReel(false);
    }
  };

  const handleGenerateGrowthHooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hookIdea.trim()) return;
    setLoadingHook(true);
    setHookError(null);
    setHookCopiedMsg(null);
    try {
      const res = await fetch("/api/ai/creator-growth-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: hookTopic,
          videoIdea: hookIdea.trim(),
          tiktokHandle: localTiktok,
          instagramHandle: localInstagram,
        }),
      });
      const data = (await res.json()) as CreatorGrowthHookResult & { error?: string };
      if (!res.ok || !data.openingHooks) {
        throw new Error(data.error || "Hook-Generierung fehlgeschlagen");
      }
      setHookResult(data);
      setSelectedHookIdx(0);
    } catch (err) {
      setHookError(err instanceof Error ? err.message : "KI-Hook-Fehler");
    } finally {
      setLoadingHook(false);
    }
  };

  const stepReel = (dir: 1 | -1) => {
    if (filteredReels.length === 0) return;
    setActiveReelIdx((prev) =>
      dir === 1
        ? prev + 1 < filteredReels.length
          ? prev + 1
          : 0
        : prev > 0
        ? prev - 1
        : filteredReels.length - 1
    );
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Direct Reel Upload Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Reels (TikTok- & Instagram-Modus) & CapCut-Videostudio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Videos hochladen & sofort abspielen · KI-Filter-Empfehlung · Auto-Captions · Cloud-Sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReelUploader((v) => !v)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Reel hochladen</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab("reels")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === "reels"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              TikTok-Reels ({youthSafeReels.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab("studio")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === "studio"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              CapCut Video-Studio
            </button>
          </div>
        </div>
      </div>

      {/* Upload Confirmation Banner */}
      {uploadSuccessBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccessBanner(null)}
            className="text-emerald-700 dark:text-emerald-300"
            aria-label="Hinweis schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Direct Video / Reel Uploader Drawer */}
      {showReelUploader && (
        <form
          onSubmit={handleSubmitDirectReel}
          className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-600" />
              <span>Neues Schutz- oder Aufklärungs-Reel hochladen</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowReelUploader(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Video- oder Bilddatei auswählen
              </label>
              <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer hover:bg-rose-50">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {uploadFileName ? uploadFileName : "MP4 / MOV / Bild hochladen"}
                </span>
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleDirectReelFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Schutz-Kategorie
              </label>
              <select
                value={uploadTopic}
                onChange={(e) => setUploadTopic(e.target.value as CivicTopic)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {YOUTH_SAFE_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Instagram / TikTok Farbstil
              </label>
              <select
                value={uploadFilter}
                onChange={(e) => setUploadFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              >
                {FILTER_PRESETS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Reel-Titel (erscheint sofort im Feed)
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="z.B. 5 Warnzeichen im Netz — Kinderschutz & Zivilcourage"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Untertitel / Kernaussage (Auto-Caption)
              </label>
              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Kurze Zusammenfassung für Untertitel und Gehörlose..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              Alle hochgeladenen Reels werden jugendfrei geprüft, sofort im Feed bereitgestellt und für angemeldete Nutzer dauerhaft gespeichert.
            </span>
            <button
              type="submit"
              disabled={uploadingDirect}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              {uploadingDirect ? "Wird hochgeladen..." : "Reel jetzt hochladen & abspielen"}
            </button>
          </div>
        </form>
      )}

      {subTab === "reels" && currentReel ? (
        /* TikTok & Instagram Vertical 9:16 Reels Theatre + Creator Reach Bridge */
        <div className="space-y-4">
          {/* TikTok "Für dich" & Hashtag-Filterleiste */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {(
                [
                  { id: "Alle", label: "Für dich · Alle" },
                  { id: "Kinderschutz", label: "#Kinderschutz" },
                  { id: "Frauenschutz", label: "#Frauenschutz" },
                  { id: "Männerschutz", label: "#Männerschutz" },
                  { id: "Tierschutz", label: "#Tierschutz" },
                  { id: "Politische Aufklärung", label: "#PolitischeAufklärung" },
                  { id: "Blackout & Krisenvorsorge", label: "#Krisenvorsorge" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setReelTopicFilter(tab.id);
                    setActiveReelIdx(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px] transition-colors ${
                    reelTopicFilter === tab.id
                      ? "bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 px-2">
              Swipe / Scroll · {activeReelIdx + 1} / {filteredReels.length}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 3 Cols: Reel Queue Playlist */}
            <aside className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Verfügbare Reels
                </span>
                <span className="text-[11px] font-mono tabular-nums text-rose-600 font-semibold">
                  {filteredReels.length} Aktiv
                </span>
              </div>
              {filteredReels.map((r, idx) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveReelIdx(idx)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors ${
                    idx === activeReelIdx
                      ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <SafeImage
                    src={r.coverUrl}
                    alt={r.title}
                    className="w-12 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {r.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {r.authorName} · {r.topic}
                    </div>
                  </div>
                </button>
              ))}
            </aside>

            {/* Center 5 Cols: Authentic TikTok & IG 9:16 Vertical Stage + Right-Edge Action Rail */}
            <div
              onWheel={(e) => {
                if (Math.abs(e.deltaY) < 35) return;
                const now = Date.now();
                if (now - wheelCooldownRef.current < 350) return;
                wheelCooldownRef.current = now;
                stepReel(e.deltaY > 0 ? 1 : -1);
              }}
              onTouchStart={(e) => {
                touchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartYRef.current === null) return;
                const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
                const diff = touchStartYRef.current - endY;
                touchStartYRef.current = null;
                if (Math.abs(diff) > 45) {
                  stepReel(diff > 0 ? 1 : -1);
                }
              }}
              className="lg:col-span-5 flex items-center justify-center gap-3 sm:gap-4"
            >
              <div className="relative w-[320px] sm:w-[360px] aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
                {currentReel.videoUrl ? (
                  <video
                    key={currentReel.id}
                    src={currentReel.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    onClick={() => setReelPlaying((p) => !p)}
                    className="w-full h-full cursor-pointer"
                  >
                    <SafeImage
                      src={currentReel.coverUrl}
                      alt={currentReel.title}
                      className={`w-full h-full object-cover transition-transform duration-1000 ${
                        reelPlaying ? "scale-105" : "scale-100"
                      }`}
                    />
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/30 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-white/95">
                    <span className="font-semibold">Für dich · {currentReel.topic}</span>
                    <span className="text-white/80">{currentReel.filterPreset}</span>
                  </div>

                  <div className="space-y-2.5 pb-2">
                    {/* Live Auto-Caption Box */}
                    <div className="p-3 rounded-xl bg-slate-950/85 border border-white/15 text-xs text-white leading-relaxed">
                      {currentReel.captionSummary}
                    </div>

                    {/* TikTok & Instagram Creator Handle + Inline Follow */}
                    <div className="pointer-events-auto flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-rose-300">
                        {currentReel.authorName.toLowerCase().includes("ragotti")
                          ? tiktokHandle
                          : `@${currentReel.authorName.toLowerCase().replace(/\s+/g, ".")}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFollowedCreators((prev) => ({
                            ...prev,
                            [currentReel.authorName]: !prev[currentReel.authorName],
                          }))
                        }
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          followedCreators[currentReel.authorName]
                            ? "bg-white/20 text-white"
                            : "bg-rose-600 text-white hover:bg-rose-500"
                        }`}
                      >
                        {followedCreators[currentReel.authorName] ? "Gefolgt ✓" : "+ Folgen"}
                      </button>
                      <span className="text-white/75">· {currentReel.createdAtLabel}</span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">
                      {currentReel.title}
                    </h3>

                    {/* Clickable Topic Hashtags */}
                    <div className="pointer-events-auto flex flex-wrap items-center gap-2 text-[11px] font-semibold text-amber-300">
                      <button
                        type="button"
                        onClick={() => {
                          setReelTopicFilter(currentReel.topic);
                          setActiveReelIdx(0);
                        }}
                        className="hover:underline"
                      >
                        #{currentReel.topic.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "")}
                      </button>
                      <span>#KivoraAT</span>
                      <span>#Aufklärung</span>
                    </div>

                    {/* TikTok Sound Track Line */}
                    <div className="flex items-center gap-1.5 text-[11px] text-white/85 pt-0.5">
                      <Music className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">
                        Originalton · {currentReel.authorName} ·{" "}
                        {currentReel.durationLabel || "0:45"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical TikTok Right-Edge Action Rail + Up/Down Switcher */}
              <div className="flex flex-col items-center gap-3">
                {/* Creator Avatar + Follow Badge */}
                <button
                  type="button"
                  onClick={() =>
                    setFollowedCreators((prev) => ({
                      ...prev,
                      [currentReel.authorName]: !prev[currentReel.authorName],
                    }))
                  }
                  className="relative mb-1"
                  aria-label={`${currentReel.authorName} folgen`}
                >
                  <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-600 to-fuchsia-600">
                    <SafeImage
                      src={aiAvatarUrl}
                      alt={currentReel.authorName}
                      className="w-full h-full rounded-full object-cover bg-slate-900"
                    />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-950">
                    {followedCreators[currentReel.authorName] ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => stepReel(-1)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-rose-500"
                  aria-label="Vorheriges Reel"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!likedReels[currentReel.id]) {
                      setLikedReels((prev) => ({ ...prev, [currentReel.id]: true }));
                      onLikeReel(currentReel);
                    }
                  }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${
                      likedReels[currentReel.id]
                        ? "bg-rose-600 border-rose-600 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        likedReels[currentReel.id] ? "fill-current" : ""
                      }`}
                    />
                  </span>
                  <span className="text-[11px] font-mono tabular-nums font-semibold">
                    {currentReel.likesCount + (likedReels[currentReel.id] ? 1 : 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-mono tabular-nums font-semibold">
                    {(reelComments[currentReel.id] || []).length + 14}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSavedReels((prev) => ({
                      ...prev,
                      [currentReel.id]: !prev[currentReel.id],
                    }))
                  }
                  className="flex flex-col items-center gap-0.5"
                >
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors ${
                      savedReels[currentReel.id]
                        ? "bg-amber-500 border-amber-500 text-slate-950"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <Bookmark
                      className={`w-5 h-5 ${
                        savedReels[currentReel.id] ? "fill-current" : ""
                      }`}
                    />
                  </span>
                  <span className="text-[11px] font-mono tabular-nums font-semibold">
                    {48 + (savedReels[currentReel.id] ? 1 : 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeActiveProject({
                      ...activeProject,
                      title: `Remix: ${currentReel.title}`,
                      filterPreset: currentReel.filterPreset,
                    });
                    setSubTab("studio");
                  }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-rose-600">
                    <Sliders className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-semibold">Remix</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shareText = `${currentReel.title} — ${currentReel.captionSummary} · TikTok: ${tiktokHandle} · IG: ${instagramHandle} · KIVORA: ${window.location.href}`;
                    navigator.clipboard?.writeText(shareText).catch(() => {});
                    setCopiedReelId(currentReel.id);
                    window.setTimeout(() => setCopiedReelId(null), 2000);
                  }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                    <Share2 className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-semibold">
                    {copiedReelId === currentReel.id ? "Kopiert" : "Teilen"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenReportModal("reel", currentReel.id, currentReel.title)
                  }
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-rose-600">
                    <Flag className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-semibold">Melden</span>
                </button>

                <button
                  type="button"
                  onClick={() => stepReel(1)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-rose-500"
                  aria-label="Nächstes Reel"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Comments + TikTok & Instagram Reach Bridge & AI Hook Studio */}
            <aside className="lg:col-span-4 space-y-5">
              {/* 1. Comments & Transcript */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-rose-600" />
                    <span>Kommentare & Auto-Captions</span>
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {activeReelIdx + 1} / {filteredReels.length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Vollständiges Untertitel-Transkript:{" "}
                  </span>
                  {currentReel.captionSummary}
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {(reelComments[currentReel.id] || []).map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {c.author}:{" "}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{c.text}</span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reelCommentInput.trim()) return;
                    const author = currentUser ? currentUser.displayName : "Zuschauer";
                    setReelComments((prev) => ({
                      ...prev,
                      [currentReel.id]: [
                        ...(prev[currentReel.id] || []),
                        { author, text: reelCommentInput.trim() },
                      ],
                    }));
                    setReelCommentInput("");
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={reelCommentInput}
                    onChange={(e) => setReelCommentInput(e.target.value)}
                    placeholder="Kommentar zum Reel schreiben..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold min-h-[40px]"
                  >
                    Senden
                  </button>
                </form>
              </div>

              {/* 2. TikTok- & Instagram-Reichweiten-Brücke & KI-Hook-Studio */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    Creator-Reichweite & Cross-Posting
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    <span>TikTok & Instagram Reichweiten-Studio</span>
                  </h3>
                </div>

                {/* Linked TikTok & Instagram Channels */}
                <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Dein TikTok-Kanal
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={localTiktok}
                          onChange={(e) => setLocalTiktok(e.target.value)}
                          placeholder="@ice.ragotti"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                        />
                        <a
                          href={`https://www.tiktok.com/${
                            localTiktok.startsWith("@")
                              ? localTiktok
                              : `@${localTiktok}`
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 shrink-0"
                          aria-label="TikTok-Profil öffnen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Dein Instagram-Profil
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={localInstagram}
                          onChange={(e) => setLocalInstagram(e.target.value)}
                          placeholder="@ice.ragotti"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                        />
                        <a
                          href={`https://www.instagram.com/${localInstagram.replace(
                            /^@/,
                            ""
                          )}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 shrink-0"
                          aria-label="Instagram-Profil öffnen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSocialHandles(localTiktok, localInstagram);
                        setHandlesSavedMsg("Kanäle gespeichert");
                        window.setTimeout(() => setHandlesSavedMsg(null), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold min-h-[36px]"
                    >
                      {handlesSavedMsg || "Kanäle speichern"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bioText = `Schutz, Aufklärung & Livestreams auf KIVORA: ${window.location.origin} · TikTok ${localTiktok} · IG ${localInstagram}`;
                        navigator.clipboard?.writeText(bioText).catch(() => {});
                        setBioCopiedMsg("Bio-Text kopiert!");
                        window.setTimeout(() => setBioCopiedMsg(null), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-rose-500 flex items-center gap-1 min-h-[36px]"
                    >
                      <Copy className="w-3.5 h-3.5 text-rose-600" />
                      <span>{bioCopiedMsg || "TikTok-Bio kopieren"}</span>
                    </button>
                  </div>
                </div>

                {/* ICE Ragotti KI Viral Hook & Reach Generator */}
                <form
                  onSubmit={handleGenerateGrowthHooks}
                  className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <SafeImage
                      src={aiAvatarUrl}
                      alt="ICE Ragotti KI"
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ICE Ragotti KI: TikTok- & Reels-Hook-Assistent
                    </span>
                  </div>

                  <select
                    value={hookTopic}
                    onChange={(e) => setHookTopic(e.target.value as CivicTopic)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    {YOUTH_SAFE_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={hookIdea}
                    onChange={(e) => setHookIdea(e.target.value)}
                    placeholder="Video-Idee (z.B. Warnzeichen im Chat erkennen)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loadingHook || !hookIdea.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[40px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {loadingHook
                        ? "KI entwickelt TikTok-Hooks..."
                        : "3-Sekunden-Hooks & Hashtags generieren"}
                    </span>
                  </button>
                </form>

                {hookError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{hookError}</p>
                )}

                {hookResult && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Wähle deinen 3-Sekunden-Hook:
                      </div>
                      {hookResult.openingHooks.map((hk, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedHookIdx(idx)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors ${
                            selectedHookIdx === idx
                              ? "border-rose-600 bg-rose-50/70 dark:bg-rose-950/30 text-slate-900 dark:text-white font-semibold"
                              : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {idx + 1}. „{hk}“
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        TikTok & Instagram Caption:
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {hookResult.captionText}
                      </p>
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {hookResult.hashtags.join(" ")}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Schnitt & Sound:{" "}
                        </span>
                        {hookResult.soundSuggestion}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Cross-Post:{" "}
                        </span>
                        {hookResult.crossPostTip}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const chosenHook =
                            hookResult.openingHooks[selectedHookIdx] || hookIdea;
                          setStudioTopic(hookTopic);
                          setScriptText(`${chosenHook}. ${hookResult.captionText}`);
                          onChangeActiveProject({
                            ...activeProject,
                            title: chosenHook.slice(0, 80),
                          });
                          setSubTab("studio");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1 min-h-[40px]"
                      >
                        <span>Ins CapCut-Studio</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const chosenHook =
                            hookResult.openingHooks[selectedHookIdx] || "";
                          const fullCopy = `${chosenHook}\n\n${hookResult.captionText}\n\n${hookResult.hashtags.join(" ")}\n\nTikTok: ${localTiktok} · IG: ${localInstagram}`;
                          navigator.clipboard?.writeText(fullCopy).catch(() => {});
                          setHookCopiedMsg("Kopiert!");
                          window.setTimeout(() => setHookCopiedMsg(null), 2000);
                        }}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-rose-500 min-h-[40px]"
                      >
                        {hookCopiedMsg || "Caption kopieren"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        /* CapCut-Style Video & Filter Studio */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Live Canvas Compositor & Multi-Track Timeline */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={activeProject.title}
                onChange={(e) =>
                  onChangeActiveProject({ ...activeProject, title: e.target.value })
                }
                className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-rose-600 focus:outline-none flex-1 truncate"
              />
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                {activeProject.aspectRatio}
              </span>
            </div>

            <video ref={videoElRef} className="hidden" playsInline muted />

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={360}
                height={
                  activeProject.aspectRatio === "16:9"
                    ? 202
                    : activeProject.aspectRatio === "1:1"
                    ? 360
                    : 540
                }
                className="max-h-[440px] w-auto object-contain"
              />
            </div>

            {/* Playback & Source Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview((p) => !p)}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Abspielen</span>
                    </>
                  )}
                </button>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {playheadSec.toFixed(1)}s / 12.0s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleWebcam}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{usingWebcam ? "Kamera aus" : "Kamera"}</span>
                </button>

                <label className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-rose-600" />
                  <span>Video/Bild</span>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleUploadLocalMedia}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Scrubber & Multi-Track Timeline */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <input
                type="range"
                min={0}
                max={12}
                step={0.1}
                value={playheadSec}
                onChange={(e) => setPlayheadSec(Number(e.target.value))}
                className="w-full accent-rose-600"
                aria-label="Zeitleiste"
              />
              <div className="space-y-1.5 text-[11px]">
                {activeProject.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{clip.label}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {clip.startSec}s–{clip.startSec + clip.durationSec}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Filter Advisor, Auto-Captions, Cloud Sync & 1-Click Export */}
          <div className="lg:col-span-7 space-y-5">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-600" />
                  <span>KI-gestützte Filter-Empfehlung & Instagram Color-Grading</span>
                </h3>
                <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  Aktiv: {activeProject.filterPreset}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Schutzthema
                  </label>
                  <select
                    value={studioTopic}
                    onChange={(e) => setStudioTopic(e.target.value as CivicTopic)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    {YOUTH_SAFE_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Dein persönlicher Stil
                  </label>
                  <input
                    type="text"
                    value={styleHistory}
                    onChange={(e) => setStyleHistory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Stimmung
                  </label>
                  <input
                    type="text"
                    value={moodInput}
                    onChange={(e) => setMoodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiRecommendFilter}
                  disabled={loadingAiFilter}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {loadingAiFilter
                      ? "KI analysiert deinen Stil..."
                      : "KI-Filter für meinen Stil empfehlen"}
                  </span>
                </button>

                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      onChangeActiveProject({
                        ...activeProject,
                        filterPreset: preset.name,
                        filterSettings: preset.settings,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      activeProject.filterPreset === preset.name
                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {aiFilterRationale && (
                <p className="text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg">
                  {aiFilterRationale}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {(
                  [
                    { key: "brightness", label: "Helligkeit", min: 0.75, max: 1.35, step: 0.02 },
                    { key: "contrast", label: "Kontrast", min: 0.8, max: 1.45, step: 0.02 },
                    { key: "saturation", label: "Sättigung", min: 0.5, max: 1.45, step: 0.02 },
                    { key: "warmth", label: "Wärme", min: -30, max: 35, step: 1 },
                    { key: "vignette", label: "Vignette", min: 0, max: 0.6, step: 0.02 },
                  ] as const
                ).map((ctrl) => (
                  <div key={ctrl.key}>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>{ctrl.label}</span>
                      <span className="font-mono tabular-nums">
                        {activeProject.filterSettings[ctrl.key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={activeProject.filterSettings[ctrl.key]}
                      onChange={(e) =>
                        onChangeActiveProject({
                          ...activeProject,
                          filterSettings: {
                            ...activeProject.filterSettings,
                            [ctrl.key]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-rose-600"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Auto-Captions */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Captions className="w-4 h-4 text-rose-600" />
                  <span>Intuitive Auto-Caption-Funktion (Synchronisierte Untertitel)</span>
                </h3>
                <select
                  value={captionLanguage}
                  onChange={(e) => setCaptionLanguage(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                >
                  <option value="Deutsch">Deutsch</option>
                  <option value="English">English</option>
                  <option value="Français">Français</option>
                  <option value="Türkçe">Türkçe</option>
                  <option value="Українська">Українська</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Gesprochenen Text oder Skript eingeben — KI synchronisiert Untertitel automatisch..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAutoCaptions}
                  disabled={loadingCaptions}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {loadingCaptions
                      ? "Untertitel werden synchronisiert..."
                      : "Auto-Captions generieren & synchronisieren"}
                  </span>
                </button>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {activeProject.captions.length} Segmente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {activeProject.captions.map((cue) => (
                  <div
                    key={cue.id}
                    onClick={() => setPlayheadSec(cue.startSec + 0.2)}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-rose-500 text-xs"
                  >
                    <div className="font-mono tabular-nums text-[10px] text-rose-600">
                      {cue.startSec.toFixed(1)}s – {cue.endSec.toFixed(1)}s
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                      {cue.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Cloud Sync & 1-Click Export */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FolderSync className="w-4 h-4 text-emerald-600" />
                    <span>Cloud-Synchronisierung & 1-Klick Social-Media-Export</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeProject.lastSyncedLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloudSync}
                    disabled={syncingCloud}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <CloudUpload className="w-3.5 h-3.5 text-rose-600" />
                    <span>{syncingCloud ? "Synchronisiert..." : "In Cloud speichern"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishStudioAsReel}
                    disabled={publishingReel}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold"
                  >
                    {publishingReel ? "Veröffentlicht..." : "Als Reel posten"}
                  </button>
                </div>
              </div>

              {savedProjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">Cloud-Projekte:</span>
                  {savedProjects.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => onChangeActiveProject(sp)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600"
                    >
                      {sp.title}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  1-Klick-Export (inkl. gerendertem Bild & .SRT Untertitel-Spur):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXPORT_FORMATS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleOneClickExport(fmt)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-600 text-left flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <span>{fmt.label}</span>
                      <Download className="w-4 h-4 text-rose-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {cloudStatusMsg && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cloudStatusMsg}</span>
                </p>
              )}
              {exportStatusMsg && (
                <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{exportStatusMsg}</span>
                </p>
              )}
              {studioError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{studioError}</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
