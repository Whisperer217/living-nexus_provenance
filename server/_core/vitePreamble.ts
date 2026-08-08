const VITE_CLIENT_TAG = '<script type="module" src="/@vite/client"></script>';
const REACT_REFRESH_MARKER = "__vite_plugin_react_preamble_installed__";

const REACT_REFRESH_PREAMBLE = `<script type="module">
  import RefreshRuntime from "/@react-refresh";
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
  window.${REACT_REFRESH_MARKER} = true;
</script>`;

/**
 * Custom Vite middleware does not automatically provide the React plugin
 * preamble. Without it, transformed TSX modules abort before React mounts.
 * Keep this dev-only insertion idempotent so native Vite transforms win when
 * they already supplied the bootstrap.
 */
export function ensurePreviewReactBootstrap(html: string): string {
  if (html.includes(REACT_REFRESH_MARKER)) return html;

  const client = html.includes("/@vite/client") ? "" : `${VITE_CLIENT_TAG}\n`;
  const bootstrap = `${client}${REACT_REFRESH_PREAMBLE}\n`;

  return html.includes("</head>")
    ? html.replace("</head>", `${bootstrap}</head>`)
    : `${bootstrap}${html}`;
}
