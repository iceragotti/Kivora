import { useState } from "react";
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Download,
  Trash2,
  Award,
  CreditCard,
  KeyRound,
  LogOut,
  Lock,
  Ticket,
  FileText,
} from "lucide-react";
import type {
  BetaFocusTopic,
  BetaPlatformInterest,
  BetaPreregistrationInput,
  BetaPreregistrationResult,
  SubscriptionTier,
  UserPrivateIdentity,
  UserProfile,
  VerifiedBadgeType,
} from "../types/kivora";

export interface DsgvoRegistrationDraft {
  displayName: string;
  handle: string;
  birthYear: number;
  protectionFocus: string[];
  dsgvoConsent: boolean;
  analyticsOptIn: boolean;
}

interface AccountIdAustriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  privateIdentity: UserPrivateIdentity | null;
  betaCount: number;
  betaReceipt: BetaPreregistrationResult | null;
  onSubmitBetaPreregistration: (
    input: BetaPreregistrationInput
  ) => Promise<BetaPreregistrationResult>;
  onGoogleSignIn: (draft?: DsgvoRegistrationDraft) => Promise<void>;
  onSignOut: () => Promise<void>;
  onCompleteIdAustriaVerify: (input: {
    birthYear: number;
    tanCode: string;
    citizenName: string;
  }) => Promise<void>;
  onSubmitVerificationRequest: (input: {
    badgeType: Exclude<VerifiedBadgeType, "none">;
    organizationOrRole: string;
    proofSummary: string;
  }) => Promise<void>;
  onActivateSubscription: (input: {
    tier: SubscriptionTier;
    billingCycle: "monthly" | "annual";
    causeAllocation:
      | "Kinderschutz"
      | "Tierschutz"
      | "Frauenschutz"
      | "Männerschutz"
      | "Krisenvorsorge";
  }) => Promise<void>;
  onUpdateDsgvoSettings: (input: {
    dsgvoConsent: boolean;
    analyticsOptIn: boolean;
    childSafetyShield: boolean;
  }) => Promise<void>;
  onExportDsgvoData: () => void;
  onDeleteAccountData: () => Promise<void>;
}

const PROTECTION_PILLAR_OPTIONS = [
  "Kinderschutz",
  "Tierschutz",
  "Frauenschutz",
  "Männerschutz",
  "Blackout & Krisenvorsorge",
  "Politische Aufklärung",
];

export function AccountIdAustriaModal({
  isOpen,
  onClose,
  currentUser,
  privateIdentity,
  betaCount,
  betaReceipt,
  onSubmitBetaPreregistration,
  onGoogleSignIn,
  onSignOut,
  onCompleteIdAustriaVerify,
  onSubmitVerificationRequest,
  onActivateSubscription,
  onUpdateDsgvoSettings,
  onExportDsgvoData,
  onDeleteAccountData,
}: AccountIdAustriaModalProps) {
  const [activeTab, setActiveTab] = useState<
    "id_austria" | "badge" | "subscription" | "dsgvo" | "beta"
  >("id_austria");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // DSGVO-Compliant Registration Draft before Google Sign-In
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regHandle, setRegHandle] = useState("");
  const [regBirthYear, setRegBirthYear] = useState<number>(1998);
  const [regProtectionFocus, setRegProtectionFocus] = useState<string[]>([
    "Kinderschutz",
    "Tierschutz",
    "Frauenschutz",
    "Männerschutz",
  ]);
  const [regDsgvoAccepted, setRegDsgvoAccepted] = useState(true);
  const [regYouthCodeAccepted, setRegYouthCodeAccepted] = useState(true);
  const [regAnalyticsOptIn, setRegAnalyticsOptIn] = useState(false);

  // ID-Austria form
  const [citizenName, setCitizenName] = useState(
    currentUser?.displayName || "Max Mustermann"
  );
  const [birthYear, setBirthYear] = useState<number>(
    privateIdentity?.birthYear || 1994
  );
  const [tanCode, setTanCode] = useState("AT-849201");
  const [verifyingEid, setVerifyingEid] = useState(false);

  // Verification Badge Request form
  const [badgeType, setBadgeType] =
    useState<Exclude<VerifiedBadgeType, "none">>("creator");
  const [orgOrRole, setOrgOrRole] = useState("");
  const [proofSummary, setProofSummary] = useState("");
  const [submittingBadge, setSubmittingBadge] = useState(false);

  // Subscription form
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [causeAllocation, setCauseAllocation] = useState<
    | "Kinderschutz"
    | "Tierschutz"
    | "Frauenschutz"
    | "Männerschutz"
    | "Krisenvorsorge"
  >("Kinderschutz");
  const [activatingSub, setActivatingSub] = useState(false);

  // DSGVO settings
  const [dsgvoConsent, setDsgvoConsent] = useState(
    privateIdentity?.dsgvoConsent ?? true
  );
  const [analyticsOptIn, setAnalyticsOptIn] = useState(
    privateIdentity?.analyticsOptIn ?? false
  );
  const [childSafetyShield, setChildSafetyShield] = useState(
    privateIdentity?.childSafetyShield ?? true
  );
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);

  // Beta Pre-registration form in modal
  const [betaName, setBetaName] = useState(currentUser?.displayName || "");
  const [betaEmail, setBetaEmail] = useState(privateIdentity?.email || "");
  const [betaFocus, setBetaFocus] = useState<BetaFocusTopic>(
    "Alle Schutzthemen"
  );
  const [betaPlatform, setBetaPlatform] =
    useState<BetaPlatformInterest>("Alle Plattformen");
  const [betaDsgvo, setBetaDsgvo] = useState(true);
  const [submittingBeta, setSubmittingBeta] = useState(false);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFocusTopic = (topic: string) => {
    setRegProtectionFocus((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length < 6
        ? [...prev, topic]
        : prev
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2
              id="account-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              DSGVO-Konto, ID-Austria Login, Verifizierung, Abo & Beta
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentUser
                ? `${currentUser.displayName} (@${currentUser.handle}) · ${
                    currentUser.idAustriaVerified
                      ? "ID-Austria Verifiziert"
                      : "DSGVO-Basiskonto"
                  } · ${
                    currentUser.ageGroup === "adult"
                      ? "Volljährig (18+)"
                      : "Jugendschutz (<18)"
                  }`
                : "DSGVO Art. 6/8/13 konforme Registrierung, ID-Austria eID & Beta-Zugang"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fenster schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-950/50">
          {[
            {
              id: "id_austria",
              label: "1. DSGVO-Registrierung & ID-Austria",
              icon: KeyRound,
            },
            {
              id: "badge",
              label: "2. Verifizierung",
              icon: Award,
            },
            {
              id: "subscription",
              label: "3. KIVORA Abo",
              icon: CreditCard,
            },
            {
              id: "dsgvo",
              label: "4. DSGVO & Rechtliches",
              icon: Lock,
            },
            {
              id: "beta",
              label: "5. Beta-Vorregistrierung",
              icon: Ticket,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  setStatusFeedback(null);
                  setErrorFeedback(null);
                }}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-rose-600 text-rose-700 dark:text-rose-400"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {statusFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{statusFeedback}</span>
            </div>
          )}
          {errorFeedback && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errorFeedback}
            </div>
          )}

          {/* TAB 1: DSGVO-Compliant Registration + ID-Austria eID Login & Age Separation */}
          {activeTab === "id_austria" && (
            <div className="space-y-6">
              {!currentUser ? (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 space-y-4">
                  {/* Direct Website Sign-In vs. DSGVO New Registration Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setErrorFeedback(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        authMode === "login"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Auf Website anmelden
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setErrorFeedback(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        authMode === "register"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Neu registrieren (DSGVO)
                    </button>
                  </div>

                  {authMode === "login" ? (
                    <div className="space-y-4 py-1">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Direkte Website-Anmeldung (KIVORA Konto)
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          Melde dich mit einem Klick direkt auf dieser Website an.
                          Dein bestehendes Profil, verschlüsselte Chats, Live-Rechte,
                          18+ Tinder/TikTok-Matches und deine ID-Austria Verifizierung
                          werden sofort geladen.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Nach der Anmeldung sofort nutzbar:
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          Echtzeit-Livestream-Chat · Beiträge, Reels & Stories ·
                          18+ Dating & TikTok Live-Matches · ID-Austria Altersfreigabe
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setAuthMode("register")}
                          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Noch kein Konto? Neues DSGVO-Profil anlegen →
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setErrorFeedback(null);
                              await onGoogleSignIn();
                              setStatusFeedback(
                                "Erfolgreich auf KIVORA angemeldet! Du kannst jetzt im Live-Chat schreiben, matchen und streamen."
                              );
                            } catch (err) {
                              setErrorFeedback(
                                err instanceof Error
                                  ? err.message
                                  : "Anmeldung fehlgeschlagen"
                              );
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold hover:opacity-95"
                        >
                          Jetzt direkt mit Google anmelden
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Schritt 1: DSGVO-konforme Konto-Registrierung (Art. 6, 8 & 25 DSGVO)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Datensparsamkeit nach EU-DSGVO: Öffentliches Profil und private
                          Identitätsdaten werden streng getrennt gespeichert.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Anzeigename / Pseudonym
                          </label>
                          <input
                            type="text"
                            value={regDisplayName}
                            onChange={(e) => setRegDisplayName(e.target.value)}
                            placeholder="Optional (z.B. Anna_Schutz)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Wunsch-Handle (@name)
                          </label>
                          <input
                            type="text"
                            value={regHandle}
                            onChange={(e) => setRegHandle(e.target.value)}
                            placeholder="z.B. anna.wien"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Geburtsjahr (Art. 8 DSGVO Alter)
                          </label>
                          <input
                            type="number"
                            min={1920}
                            max={2020}
                            value={regBirthYear}
                            onChange={(e) => setRegBirthYear(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          Schutz- & Aufklärungs-Schwerpunkte (Datenminimierung — nur gewählte Themen):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PROTECTION_PILLAR_OPTIONS.map((topic) => {
                            const selected = regProtectionFocus.includes(topic);
                            return (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => toggleFocusTopic(topic)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                                  selected
                                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {topic}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regDsgvoAccepted}
                            onChange={(e) => setRegDsgvoAccepted(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-rose-600 shrink-0"
                          />
                          <span className="text-slate-700 dark:text-slate-300 leading-snug">
                            <strong>Pflicht-Einwilligung (Art. 6 & Art. 13 DSGVO):</strong>{" "}
                            Ich willige ein, dass KIVORA meine gewählten Profildaten
                            zweckgebunden, verschlüsselt und ohne Weitergabe an
                            Werbenetzwerke speichert (Version DSGVO-2026-v1, jederzeit
                            unter Tab 4 widerrufbar).
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regYouthCodeAccepted}
                            onChange={(e) => setRegYouthCodeAccepted(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-rose-600 shrink-0"
                          />
                          <span className="text-slate-700 dark:text-slate-300 leading-snug">
                            <strong>Kinderschutz- & Gemeinschaftskodex:</strong> Ich
                            akzeptiere die strikte Trennung von Jugend- (&lt;18) und
                            Erwachsenenbereichen (18+) sowie die Null-Toleranz-Regel
                            gegen Grooming und Gewalt.
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regAnalyticsOptIn}
                            onChange={(e) => setRegAnalyticsOptIn(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-rose-600 shrink-0"
                          />
                          <span className="text-slate-500 dark:text-slate-400 leading-snug">
                            Freiwilliges Opt-In (Art. 25 Privacy-by-Default):
                            Anonymisierte Reichweitenstatistik aktivieren.
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] text-slate-500">
                          {new Date().getFullYear() - regBirthYear < 18
                            ? "Altersprüfung: Jugendkonto (<18) — 18+ Inhalte strikt gesperrt."
                            : "Hinweis: Bis zur ID-Austria eID-Prüfung startet jedes Konto im geschützten Standardmodus."}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!regDsgvoAccepted || !regYouthCodeAccepted) {
                              setErrorFeedback(
                                "Bitte bestätige zuerst die DSGVO-Einwilligung (Art. 6 DSGVO) sowie den Kinderschutz-Kodex."
                              );
                              return;
                            }
                            try {
                              setErrorFeedback(null);
                              await onGoogleSignIn({
                                displayName: regDisplayName.trim(),
                                handle: regHandle.trim(),
                                birthYear: Number(regBirthYear) || 1998,
                                protectionFocus: regProtectionFocus,
                                dsgvoConsent: true,
                                analyticsOptIn: regAnalyticsOptIn,
                              });
                              setStatusFeedback(
                                "DSGVO-konform registriert & angemeldet! Deine Einwilligung (DSGVO-2026-v1) wurde mit Zeitstempel gespeichert."
                              );
                            } catch (err) {
                              setErrorFeedback(
                                err instanceof Error
                                  ? err.message
                                  : "Anmeldung fehlgeschlagen"
                              );
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold hover:opacity-95"
                        >
                          DSGVO-konform registrieren & anmelden
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Angemeldet als {currentUser.displayName} (@{currentUser.handle})
                    </div>
                    <div className="text-slate-500">
                      Altersstatus:{" "}
                      {currentUser.ageGroup === "adult"
                        ? "Volljährig (18+ freigeschaltet)"
                        : "Geschützter Modus (<18 · 18+ Inhalte strikt gesperrt)"}{" "}
                      · DSGVO-Einwilligung:{" "}
                      {privateIdentity?.dsgvoConsentVersion || "DSGVO-2026-v1"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Abmelden</span>
                  </button>
                </div>
              )}

              {/* ID-Austria eID Cryptographic Verification Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!currentUser) {
                    setErrorFeedback(
                      "Bitte registriere oder melde dich zuerst oben an, um deine ID-Austria eID zu verknüpfen."
                    );
                    return;
                  }
                  setVerifyingEid(true);
                  setErrorFeedback(null);
                  setStatusFeedback(null);
                  try {
                    await onCompleteIdAustriaVerify({
                      birthYear: Number(birthYear),
                      tanCode: tanCode.trim(),
                      citizenName: citizenName.trim(),
                    });
                    setStatusFeedback(
                      new Date().getFullYear() - Number(birthYear) >= 18
                        ? "ID-Austria eID erfolgreich verifiziert! Volljährigkeitsstatus (18+) und Vertrauenssiegel aktiviert."
                        : "ID-Austria eID verifiziert! Geschützter Jugendschutz-Modus (<18) aktiv — 18+ Inhalte bleiben strikt getrennt."
                    );
                  } catch (err) {
                    setErrorFeedback(
                      err instanceof Error
                        ? err.message
                        : "ID-Austria Prüfung fehlgeschlagen"
                    );
                  } finally {
                    setVerifyingEid(false);
                  }
                }}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>
                        Schritt 2: ID-Austria Login & Kryptografische Altersprüfung
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Erzeugt ein bereichsspezifisches Personenkennzeichen (bPK-SHA256)
                      nach österreichischem E-Government-Standard ohne Klartext-Speicherung.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bürgername / Pseudonym
                    </label>
                    <input
                      type="text"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Geburtsjahr (Altersgrenze 18+)
                    </label>
                    <input
                      type="number"
                      min={1920}
                      max={2020}
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ID-Austria App Signatur-TAN
                    </label>
                    <input
                      type="text"
                      value={tanCode}
                      onChange={(e) => setTanCode(e.target.value)}
                      placeholder="z.B. AT-849201"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-500">
                    Hinweis: Geburtsjahr ≤ 2008 schaltet 18+ Bereich frei; ≥ 2009 aktiviert
                    strikten Jugendschutz.
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingEid}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {verifyingEid
                      ? "Prüfe ID-Austria Signatur..."
                      : "Mit ID-Austria verifizieren"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Verifizierungsabzeichen anfordern */}
          {activeTab === "badge" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!currentUser) {
                  setErrorFeedback("Bitte melde dich zuerst an.");
                  return;
                }
                if (orgOrRole.trim().length < 2 || proofSummary.trim().length < 5) {
                  setErrorFeedback("Bitte fülle Rolle/Organisation und Nachweis aus.");
                  return;
                }
                setSubmittingBadge(true);
                setErrorFeedback(null);
                setStatusFeedback(null);
                try {
                  await onSubmitVerificationRequest({
                    badgeType,
                    organizationOrRole: orgOrRole.trim(),
                    proofSummary: proofSummary.trim(),
                  });
                  setOrgOrRole("");
                  setProofSummary("");
                  setStatusFeedback(
                    "Antrag auf Verifizierungsabzeichen erfolgreich eingereicht und in Firestore gespeichert!"
                  );
                } catch (err) {
                  setErrorFeedback(
                    err instanceof Error ? err.message : "Antrag fehlgeschlagen"
                  );
                } finally {
                  setSubmittingBadge(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Offizielles KIVORA Verifizierungsabzeichen anfordern
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Schützt vor Identitätsdiebstahl und kennzeichnet vertrauenswürdige
                  Aufklärer, Schutzorganisationen und verifizierte Bürgerkonten.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "creator",
                    title: "Creator & Aufklärer",
                    desc: "Für journalistische & gesellschaftliche Kanäle",
                  },
                  {
                    id: "protection_org",
                    title: "Schutz-Organisation / NGO",
                    desc: "Für Kinderschutz, Tierschutz, Frauen- & Männerhilfe",
                  },
                  {
                    id: "id_austria",
                    title: "ID-Austria Bürger-Siegel",
                    desc: "Amtlich bestätigte Identität",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setBadgeType(opt.id as Exclude<VerifiedBadgeType, "none">)
                    }
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      badgeType === opt.id
                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {opt.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organisation, Fachgebiet oder öffentlicher Wirkungsbereich
                </label>
                <input
                  type="text"
                  value={orgOrRole}
                  onChange={(e) => setOrgOrRole(e.target.value)}
                  placeholder="z.B. Ehrenamtliche Kinderschutz-Initiative Graz / Tierschutzverein"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nachweis / Referenzlinks / Vereinsregisternummer (ZVR)
                </label>
                <textarea
                  rows={3}
                  value={proofSummary}
                  onChange={(e) => setProofSummary(e.target.value)}
                  placeholder="Link zur offiziellen Website, ZVR-Zahl oder Beschreibung deiner Schutz- und Aufklärungsarbeit..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingBadge}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingBadge
                    ? "Wird eingereicht..."
                    : "Verifizierungsabzeichen beantragen"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: KIVORA Abo-Modell */}
          {activeTab === "subscription" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    KIVORA Mitgliedschaft & Verifizierungs-Abo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    10 % jedes Abos fließen direkt in geprüfte Kinderschutz-,
                    Tierschutz-, Frauen- & Männerschutz-Projekte.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      billingCycle === "monthly"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    Monatlich
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      billingCycle === "annual"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500"
                    }`}
                  >
                    Jährlich (-20 %)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Wähle deinen 10 %-Förderzweck:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Kinderschutz",
                      "Tierschutz",
                      "Frauenschutz",
                      "Männerschutz",
                      "Krisenvorsorge",
                    ] as const
                  ).map((cause) => (
                    <button
                      key={cause}
                      type="button"
                      onClick={() => setCauseAllocation(cause)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        causeAllocation === cause
                          ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {cause}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    tier: "free" as SubscriptionTier,
                    name: "Basis Gemeinschaft",
                    audience: "Für alle Bürgerinnen & Jugendliche",
                    priceMonthly: "0,00 €",
                    priceAnnual: "0,00 €",
                    features: [
                      "Voller Zugang zu Feed, Stories & Reels",
                      "Ende-zu-Ende-verschlüsselte Chats",
                      "ICE Ragotti Kinderschutz-KI & Notruf 147/133",
                      "5 GB Cloud-Speicher für Videoprojekte",
                    ],
                  },
                  {
                    tier: "aktiv_verified" as SubscriptionTier,
                    name: "KIVORA Aktiv & Verifiziert",
                    audience: "Für aktive Aufklärer & Creator",
                    priceMonthly: "6,99 €",
                    priceAnnual: "5,59 €",
                    features: [
                      "Verifizierungsabzeichen & Imitationsschutz",
                      "100 GB Cloud-Sync für CapCut-Videostudio",
                      "KI-Stil-Filterempfehlung & Auto-Captions",
                      "10 % Direkte Spende an " + causeAllocation,
                    ],
                  },
                  {
                    tier: "schutz_pro" as SubscriptionTier,
                    name: "KIVORA Schutz & Creator Pro",
                    audience: "Für Organisationen & Multi-Streamer",
                    priceMonthly: "14,99 €",
                    priceAnnual: "11,99 €",
                    features: [
                      "Multi-Plattform-Livestream (IG, TT, YT, X)",
                      "6-Sprachen KI-Simultan-Untertitel & Dubbing",
                      "Echtzeit-Demografie- & Zuschaueranalyse",
                      "1 TB Cloud-Sync + 10 % für " + causeAllocation,
                    ],
                  },
                ].map((plan) => {
                  const isCurrent = currentUser?.subscriptionTier === plan.tier;
                  return (
                    <div
                      key={plan.tier}
                      className={`p-5 rounded-xl border flex flex-col justify-between ${
                        isCurrent
                          ? "border-rose-600 bg-rose-50/40 dark:bg-rose-950/25"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                          {plan.audience}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {plan.name}
                        </h4>
                        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
                          {billingCycle === "monthly"
                            ? plan.priceMonthly
                            : plan.priceAnnual}
                          <span className="text-xs font-sans font-normal text-slate-500">
                            {" "}
                            / Monat
                          </span>
                        </div>
                        <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={activatingSub || isCurrent}
                        onClick={async () => {
                          if (!currentUser) {
                            setErrorFeedback("Bitte melde dich zuerst an.");
                            return;
                          }
                          setActivatingSub(true);
                          setErrorFeedback(null);
                          setStatusFeedback(null);
                          try {
                            await onActivateSubscription({
                              tier: plan.tier,
                              billingCycle,
                              causeAllocation,
                            });
                            setStatusFeedback(
                              `Tarif "${plan.name}" aktiviert! 10 % fließen in ${causeAllocation}.`
                            );
                          } catch (err) {
                            setErrorFeedback(
                              err instanceof Error
                                ? err.message
                                : "Abo-Aktivierung fehlgeschlagen"
                            );
                          } finally {
                            setActivatingSub(false);
                          }
                        }}
                        className={`mt-5 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          isCurrent
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 dark:bg-rose-600 text-white hover:opacity-90"
                        }`}
                      >
                        {isCurrent ? "Aktiver Tarif" : "Tarif wählen"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DSGVO & Rechtliche Hinweise */}
          {activeTab === "dsgvo" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  DSGVO-Datenschutz- & Souveränitäts-Cockpit (EU-DSGVO)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kein Tracking durch Drittanbieter, keine Weitergabe von Klardaten,
                  strikte Trennung von öffentlichen Profilen und privaten Identitätsdaten.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "DSGVO Art. 6 Zweckgebundene Datenverarbeitung",
                    desc: "Speichert nur technisch notwendige Daten für deinen Account, Cloud-Projekte und Chats.",
                    checked: dsgvoConsent,
                    onChange: setDsgvoConsent,
                  },
                  {
                    label: "ICE Ragotti KI-Kinderschutz-Wächter im Chat",
                    desc: "Analysiert verdächtige Kontaktmuster lokal/serverseitig zum Schutz vor Cybergrooming.",
                    checked: childSafetyShield,
                    onChange: setChildSafetyShield,
                  },
                  {
                    label: "Anonymisierte Reichweiten-Statistik (Art. 25 Opt-In)",
                    desc: "Hilft Creatorn ohne Personenbezug bei der Auswertung von Livestream-Demografien.",
                    checked: analyticsOptIn,
                    onChange: setAnalyticsOptIn,
                  },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-rose-600"
                    />
                  </label>
                ))}
              </div>

              {/* Art. 13 DSGVO & Austrian Legal Disclosures */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>
                    Rechtliche Pflichtangaben gemäß Art. 13 EU-DSGVO, § 5 ECG & MedienG
                  </span>
                </div>
                <p>
                  <strong>Verantwortliche Stelle:</strong> KIVORA Souveräne
                  Gemeinschafts- & Schutzplattform (Projektverantwortung & KI-Moderation:
                  ICE Ragotti · Kontakt: ice.ragotti@gmail.com).
                </p>
                <p>
                  <strong>Rechtsgrundlagen & Speicherkonzept:</strong> Verarbeitung erfolgt
                  ausschließlich auf Basis Ihrer ausdrücklichen Einwilligung (Art. 6 Abs. 1
                  lit. a DSGVO) sowie zur Vertragserfüllung (lit. b). Personenbezogene
                  Identitätsdaten (E-Mail, Geburtsjahr, gehashte ID-Austria bPK-SHA256)
                  werden physisch getrennt vom öffentlichen Profil gespeichert (Privacy by
                  Design gemäß Art. 25 DSGVO). Chat-Nachrichten werden clientseitig mit
                  AES-256-GCM verschlüsselt (Art. 32 DSGVO).
                </p>
                <p>
                  <strong>Ihre Rechte & Aufsichtsbehörde:</strong> Sie haben jederzeit das
                  Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17),
                  Einschränkung (Art. 18), Datenübertragbarkeit als JSON (Art. 20), Widerruf
                  Ihrer Einwilligung (Art. 7 Abs. 3) sowie Beschwerde bei der
                  Österreichischen Datenschutzbehörde (Barichgasse 40-42, 1030 Wien).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onExportDsgvoData}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DSGVO-Datenauskunft (Art. 20 JSON)</span>
                  </button>

                  {!confirmDeleteStep ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStep(true)}
                      className="px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Daten löschen (Art. 17)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteAccountData();
                        setConfirmDeleteStep(false);
                        setStatusFeedback(
                          "Private Identitätsdaten gemäß DSGVO Art. 17 unwiderruflich gelöscht."
                        );
                      }}
                      className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                    >
                      Löschung jetzt endgültig bestätigen
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUser) {
                      setErrorFeedback("Bitte melde dich zuerst an.");
                      return;
                    }
                    await onUpdateDsgvoSettings({
                      dsgvoConsent,
                      analyticsOptIn,
                      childSafetyShield,
                    });
                    setStatusFeedback("DSGVO-Datenschutzeinstellungen gespeichert.");
                  }}
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                >
                  Einstellungen speichern
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Beta-Vorregistrierung */}
          {activeTab === "beta" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!betaDsgvo) {
                  setErrorFeedback(
                    "Für die Beta-Vorregistrierung ist deine DSGVO-Einwilligung (Art. 6 DSGVO) erforderlich."
                  );
                  return;
                }
                setSubmittingBeta(true);
                setErrorFeedback(null);
                setStatusFeedback(null);
                try {
                  const res = await onSubmitBetaPreregistration({
                    displayName: betaName.trim(),
                    email: betaEmail.trim(),
                    focusTopic: betaFocus,
                    platformInterest: betaPlatform,
                    dsgvoConsent: true,
                  });
                  setStatusFeedback(
                    `Beta-Vorregistrierung abgeschlossen! Dein persönliches Beta-Ticket: ${res.ticketCode}`
                  );
                } catch (err) {
                  setErrorFeedback(
                    err instanceof Error
                      ? err.message
                      : "Beta-Vorregistrierung fehlgeschlagen"
                  );
                } finally {
                  setSubmittingBeta(false);
                }
              }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    KIVORA Beta-Vorregistrierung (Early-Access Welle 1)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sichere dir deinen bevorzugten Beta-Zugang für iOS, Android & Web
                    mit voller DSGVO-Datensouveränität.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                  {betaCount.toLocaleString("de-AT")} Vorregistrierungen
                </span>
              </div>

              {betaReceipt && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="font-bold">
                    Aktives Beta-Ticket: {betaReceipt.ticketCode}
                  </div>
                  <div className="mt-0.5">
                    Schwerpunkt: {betaReceipt.focusTopic} · Plattform:{" "}
                    {betaReceipt.platformInterest} · Rechtsstand:{" "}
                    {betaReceipt.dsgvoVersion}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Name oder Pseudonym
                  </label>
                  <input
                    type="text"
                    value={betaName}
                    onChange={(e) => setBetaName(e.target.value)}
                    placeholder="z.B. Lisa_Tirol"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-Mail-Adresse für Beta-Einladung
                  </label>
                  <input
                    type="email"
                    value={betaEmail}
                    onChange={(e) => setBetaEmail(e.target.value)}
                    placeholder="name@beispiel.at"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mein Hauptanliegen
                  </label>
                  <select
                    value={betaFocus}
                    onChange={(e) =>
                      setBetaFocus(e.target.value as BetaFocusTopic)
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    <option value="Alle Schutzthemen">Alle Schutzthemen</option>
                    <option value="Kinderschutz">Kinderschutz</option>
                    <option value="Tierschutz">Tierschutz</option>
                    <option value="Frauenschutz">Frauenschutz</option>
                    <option value="Männerschutz">Männerschutz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bevorzugtes Gerät
                  </label>
                  <select
                    value={betaPlatform}
                    onChange={(e) =>
                      setBetaPlatform(e.target.value as BetaPlatformInterest)
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    <option value="Alle Plattformen">Alle Plattformen</option>
                    <option value="iOS">iOS (iPhone / iPad)</option>
                    <option value="Android">Android</option>
                    <option value="Web & PWA">Web & PWA</option>
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={betaDsgvo}
                  onChange={(e) => setBetaDsgvo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-rose-600 shrink-0"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>DSGVO-Einwilligung (Art. 6 DSGVO):</strong> Ich stimme zu,
                  dass meine Daten ausschließlich für die Beta-Einladung gespeichert
                  und nicht an Dritte weitergegeben werden.
                </span>
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingBeta}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingBeta
                    ? "Wird registriert..."
                    : "Für KIVORA Beta vorregistrieren"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
