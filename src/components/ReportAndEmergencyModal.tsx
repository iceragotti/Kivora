import { useState } from "react";
import { PhoneCall, ShieldAlert, X, CheckCircle2, FileWarning } from "lucide-react";
import type { SafetyReportRecord } from "../types/kivora";

interface ReportAndEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: SafetyReportRecord["targetType"];
  targetId: string;
  targetTitle: string;
  onSubmitReport: (report: Omit<SafetyReportRecord, "id" | "status" | "timestamp">) => Promise<string>;
}

const REPORT_CATEGORIES: SafetyReportRecord["category"][] = [
  "Kinderschutz & Grooming-Verdacht",
  "Tierschutzverstoß",
  "Gewalt gegen Frauen oder Männer",
  "Desinformation & Demokratiegefährdung",
  "18+ Inhalt im Jugendbereich",
  "Cybercrime & Akute Gefahrenlage",
];

export function ReportAndEmergencyModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSubmitReport,
}: ReportAndEmergencyModalProps) {
  const [category, setCategory] = useState<SafetyReportRecord["category"]>(
    "Kinderschutz & Grooming-Verdacht"
  );
  const [authorityRouting, setAuthorityRouting] = useState<SafetyReportRecord["authorityRouting"]>(
    "rat_auf_draht_147"
  );
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 5) {
      setErrorMsg("Bitte beschreibe den Vorfall mit mindestens 5 Zeichen.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const caseId = await onSubmitReport({
        targetType,
        targetId,
        category,
        details: details.trim(),
        authorityRouting,
      });
      setSubmittedCaseId(caseId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Meldung konnte nicht gesendet werden.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="report-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Schutz-Meldung & Direkte Notruf-Hilfe
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Betrifft: {targetTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Dialog schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Austrian & European Emergency Numbers */}
        <div className="mt-4 p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-900 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Akute Gefahr oder Kinder- & Jugendschutz? Sofortige Hilfe:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
            <a
              href="tel:147"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <span>Rat auf Draht (Kinder & Jugend)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5" /> 147
              </span>
            </a>
            <a
              href="tel:133"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <span>Polizei Notruf (Österreich)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5" /> 133 / 112
              </span>
            </a>
            <a
              href="tel:0800222555"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Frauenhelpline gegen Gewalt</span>
              <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                0800 222 555
              </span>
            </a>
            <a
              href="tel:0800246247"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Männernotruf & Krisenberatung</span>
              <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                0800 246 247
              </span>
            </a>
          </div>
        </div>

        {submittedCaseId ? (
          <div className="mt-5 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Meldung DSGVO-konform protokolliert
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Aktenzeichen:{" "}
              <span className="font-mono font-semibold tabular-nums">{submittedCaseId}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Beweissicherung und Weiterleitung an die gewählte Schutzstelle wurden ausgelöst.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmittedCaseId(null);
                setDetails("");
                onClose();
              }}
              className="mt-4 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-rose-600 text-white text-xs font-semibold"
            >
              Fertig
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Meldekategorie
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SafetyReportRecord["category"])
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Weiterleitung & Eskalation
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: "rat_auf_draht_147", label: "Rat auf Draht (147) & Jugendschutz" },
                  { id: "polizei_133_bkms", label: "Polizei (133) / Cybercrime-Meldestelle" },
                  { id: "stopline", label: "Stopline (Kinderschutz-Meldestelle)" },
                  { id: "kivora_trust", label: "KIVORA Trust & Moderationsteam" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAuthorityRouting(opt.id as SafetyReportRecord["authorityRouting"])
                    }
                    className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors ${
                      authorityRouting === opt.id
                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sachverhalt & Hinweise zur Beweissicherung
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Beschreibe möglichst genau, was vorgefallen ist..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <FileWarning className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? "Wird übermittelt..." : "Verbindlich melden"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
