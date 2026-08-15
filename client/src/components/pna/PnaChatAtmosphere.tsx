import type { ReactNode } from "react";
import type { PnaChatThemeId } from "@/lib/pnaChatAtmosphere";

interface PnaChatAtmosphereProps {
  theme: PnaChatThemeId;
  playing: boolean;
  hue: number;
  saturation: number;
  children: ReactNode;
}

/** Music-reactive field + vine/ember frame. No blur. Reduced-motion stills the pulse. */
export function PnaChatAtmosphere({ theme, playing, hue, saturation, children }: PnaChatAtmosphereProps) {
  return (
    <div
      className={`ln-pna-chat ln-pna-chat--${theme}${playing ? " ln-pna-chat--playing" : ""}`}
      style={{
        ["--ln-pna-hue" as string]: hue.toFixed(1),
        ["--ln-pna-sat" as string]: `${saturation.toFixed(1)}%`,
      }}
    >
      <div className="ln-pna-chat__field" aria-hidden />
      <div className="ln-pna-chat__frame" aria-hidden>
        <span className="ln-pna-chat__corner ln-pna-chat__corner--tl">⟡</span>
        <span className="ln-pna-chat__corner ln-pna-chat__corner--tr">⟡</span>
        <span className="ln-pna-chat__corner ln-pna-chat__corner--bl">⟡</span>
        <span className="ln-pna-chat__corner ln-pna-chat__corner--br">⟡</span>
      </div>
      <div className="ln-pna-chat__body">{children}</div>
    </div>
  );
}

interface PnaStreamSealProps {
  streaming: boolean;
  logoUrl: string;
}

/** LN seal rides generation. Settles still when reduced-motion is requested. */
export function PnaStreamSeal({ streaming, logoUrl }: PnaStreamSealProps) {
  if (!streaming) return null;
  return (
    <div className="ln-pna-seal" role="status" aria-live="polite" aria-label="PNA is generating">
      <div className="ln-pna-seal__bob">
        <img src={logoUrl} alt="" className="ln-pna-seal__mark" />
      </div>
      <span className="ln-pna-seal__label">SEALING A REPLY</span>
    </div>
  );
}
