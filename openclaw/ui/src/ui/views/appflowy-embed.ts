import { html } from "lit";

export type AppFlowyEmbedProps = {
  appflowyUrl?: string | null;
};

export function renderAppFlowyEmbed(props: AppFlowyEmbedProps) {
  const iframeUrl =
    props.appflowyUrl ?? `${window.location.origin}/appflowy/`;

  return html`
    <div class="appflowy-embed-root">
      <style>
        .appflowy-embed-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .appflowy-iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: var(--oc-color-bg-1, #13131a);
        }
      </style>
      <iframe
        class="appflowy-iframe"
        src="${iframeUrl}"
        allow="clipboard-read; clipboard-write"
        loading="lazy"
      ></iframe>
    </div>
  `;
}
