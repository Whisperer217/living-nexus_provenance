export const SW_UPDATE_AVAILABLE_EVENT = "sw-update-available";
export const SW_UPDATE_APPLY_EVENT = "ln-sw-apply-update";
export const SW_UPDATE_APPLYING_EVENT = "ln-sw-update-applying";
export const SW_UPDATE_FAILED_EVENT = "ln-sw-update-failed";

export type ServiceWorkerUpdateFailure =
  | "registration_unavailable"
  | "activation_timeout";

export function dispatchServiceWorkerUpdateEvent<T>(name: string, detail?: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
