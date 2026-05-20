/* ═══════════════════════════════════════════════════════════════════
   MANIFESTATION STUDIO — Shared Types & Constants
   Each manifestation type has its own atmosphere, language, and flow.
═══════════════════════════════════════════════════════════════════ */

export type ManifestationType = "music" | "lyrics" | "comic" | "manuscript" | "video";

export interface ManifestationAtmosphere {
  type: ManifestationType;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  colorPrimary: string;
  colorGlow: string;
  colorBg: string;
  colorBorder: string;
  gradient: string;
  /** Language used in the guided flow */
  language: {
    welcome: string;
    filePrompt: string;
    metadataPrompt: string;
    provenancePrompt: string;
    publishPrompt: string;
    progressVerb: string; // e.g. "Resonating", "Inscribing", "Sequencing"
    completeMessage: string;
  };
}

export const ATMOSPHERES: Record<ManifestationType, ManifestationAtmosphere> = {
  music: {
    type: "music",
    label: "Music",
    tagline: "Sound into permanence",
    description: "Register your sonic creation with cryptographic provenance. Every frequency, witnessed.",
    icon: "🎵",
    colorPrimary: "#A78BFA",
    colorGlow: "rgba(167,139,250,0.35)",
    colorBg: "rgba(124,58,237,0.06)",
    colorBorder: "rgba(167,139,250,0.25)",
    gradient: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(167,139,250,0.04) 50%, rgba(212,175,55,0.06) 100%)",
    language: {
      welcome: "Your sound is about to become permanent. Let the resonance begin.",
      filePrompt: "Drop your audio — the waveform will reveal its harmonic identity.",
      metadataPrompt: "Name the frequencies. Who shaped this sound?",
      provenancePrompt: "Sealing your sonic fingerprint into the provenance chain.",
      publishPrompt: "Your music is ready to be witnessed by the world.",
      progressVerb: "Resonating",
      completeMessage: "Your sound has been witnessed. The frequencies are now permanent.",
    },
  },
  lyrics: {
    type: "lyrics",
    label: "Lyrics",
    tagline: "Words into witness",
    description: "Inscribe your lyrics with authorship sealed at the moment of creation.",
    icon: "📝",
    colorPrimary: "#F5C451",
    colorGlow: "rgba(245,196,81,0.35)",
    colorBg: "rgba(208,161,95,0.06)",
    colorBorder: "rgba(245,196,81,0.25)",
    gradient: "linear-gradient(135deg, rgba(208,161,95,0.12) 0%, rgba(245,196,81,0.04) 50%, rgba(212,175,55,0.06) 100%)",
    language: {
      welcome: "Every word you write deserves to be witnessed. Begin your inscription.",
      filePrompt: "Enter your lyrics — each verse will be rendered in archival typography.",
      metadataPrompt: "Who authored these words? Name the voices behind the verse.",
      provenancePrompt: "Your words are being sealed — authorship inscribed permanently.",
      publishPrompt: "Your lyrics are ready to enter the archive.",
      progressVerb: "Inscribing",
      completeMessage: "Your words have been witnessed. Authorship is now permanent.",
    },
  },
  comic: {
    type: "comic",
    label: "Comic / Graphic Novel",
    tagline: "Panels into permanence",
    description: "Register your visual narrative — art and story, sealed with provenance.",
    icon: "🎨",
    colorPrimary: "#F87171",
    colorGlow: "rgba(248,113,113,0.30)",
    colorBg: "rgba(220,38,38,0.06)",
    colorBorder: "rgba(248,113,113,0.25)",
    gradient: "linear-gradient(135deg, rgba(220,38,38,0.10) 0%, rgba(248,113,113,0.04) 50%, rgba(212,175,55,0.06) 100%)",
    language: {
      welcome: "Your visual story is about to be sealed. Each panel, each frame — witnessed.",
      filePrompt: "Upload your pages — the panel sequence will render in cinematic order.",
      metadataPrompt: "Name your creation. Who drew these worlds into being?",
      provenancePrompt: "Sealing your visual narrative into the provenance chain.",
      publishPrompt: "Your comic is ready to be witnessed.",
      progressVerb: "Sequencing",
      completeMessage: "Your visual narrative has been witnessed. Every panel is now permanent.",
    },
  },
  manuscript: {
    type: "manuscript",
    label: "Manuscript / Book",
    tagline: "Text into testament",
    description: "Seal your written work with provenance — every word, dated and verified.",
    icon: "📖",
    colorPrimary: "#4ADE80",
    colorGlow: "rgba(74,222,128,0.30)",
    colorBg: "rgba(22,163,74,0.06)",
    colorBorder: "rgba(74,222,128,0.25)",
    gradient: "linear-gradient(135deg, rgba(22,163,74,0.10) 0%, rgba(74,222,128,0.04) 50%, rgba(212,175,55,0.06) 100%)",
    language: {
      welcome: "Your manuscript is about to enter the archive. Every chapter, witnessed.",
      filePrompt: "Upload your document — the text will be rendered in archival format.",
      metadataPrompt: "Name your work. Who wrote these words into existence?",
      provenancePrompt: "Sealing your manuscript into the provenance chain.",
      publishPrompt: "Your manuscript is ready to be witnessed by the world.",
      progressVerb: "Archiving",
      completeMessage: "Your manuscript has been witnessed. The text is now permanent.",
    },
  },
  video: {
    type: "video",
    label: "Video",
    tagline: "Frames into forever",
    description: "Register your visual creation — every frame, cryptographically sealed.",
    icon: "🎬",
    colorPrimary: "#60A5FA",
    colorGlow: "rgba(96,165,250,0.30)",
    colorBg: "rgba(37,99,235,0.06)",
    colorBorder: "rgba(96,165,250,0.25)",
    gradient: "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(96,165,250,0.04) 50%, rgba(212,175,55,0.06) 100%)",
    language: {
      welcome: "Your visual story is about to become permanent. Every frame, witnessed.",
      filePrompt: "Drop your video — the timeline will reveal its cinematic identity.",
      metadataPrompt: "Name your creation. Who directed this vision?",
      provenancePrompt: "Sealing your video into the provenance chain.",
      publishPrompt: "Your video is ready to be witnessed.",
      progressVerb: "Capturing",
      completeMessage: "Your video has been witnessed. Every frame is now permanent.",
    },
  },
};

export type StudioStep = "gateway" | "upload" | "metadata" | "provenance" | "publish";

export const STUDIO_STEPS: { id: StudioStep; label: string; number: number }[] = [
  { id: "upload", label: "Upload", number: 1 },
  { id: "metadata", label: "Details", number: 2 },
  { id: "provenance", label: "Provenance", number: 3 },
  { id: "publish", label: "Publish", number: 4 },
];
