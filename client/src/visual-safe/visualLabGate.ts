export interface VisualLabGateInput {
  dev: boolean;
  enabled: string | undefined;
  pathname: string;
}

/**
 * The Visual Lab is deliberately not an application route. The exact development
 * gate is evaluated before normal provider mounting so the lab cannot create
 * app queries, player/queue state, uploads, or account activity.
 */
export function shouldRenderVisualLab({ dev, enabled, pathname }: VisualLabGateInput): boolean {
  return dev && enabled === "1" && pathname === "/dev/visual-lab";
}
