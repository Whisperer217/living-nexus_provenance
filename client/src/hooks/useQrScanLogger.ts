/**
 * useQrScanLogger
 * Fires once on page load if the URL contains ?qr=<shareId>.
 * Logs the scan event to the server for provenance attribution.
 * Removes the qr/ref/context/ts params from the URL after logging
 * (clean URL without breaking history).
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function useQrScanLogger() {
  const logScan = trpc.qr.logScan.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get("qr");
    if (!qrId) return;

    const shareId = parseInt(qrId, 10);
    if (isNaN(shareId)) return;

    const refHandle = params.get("ref") ?? undefined;
    const campaign = params.get("context") ?? undefined;
    const userAgent = navigator.userAgent.slice(0, 512);

    logScan.mutate({ shareId, refHandle, campaign, userAgent });

    // Clean up attribution params from URL (keep other params intact)
    params.delete("qr");
    params.delete("ref");
    params.delete("context");
    params.delete("ts");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
