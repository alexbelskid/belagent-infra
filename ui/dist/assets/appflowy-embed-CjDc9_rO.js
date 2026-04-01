import{i as e}from"./lit-BZwq2xLD.js";function t(t){return e`
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
        src="${t.appflowyUrl??`${window.location.origin}/appflowy/`}"
        allow="clipboard-read; clipboard-write"
        loading="lazy"
      ></iframe>
    </div>
  `}export{t as renderAppFlowyEmbed};
//# sourceMappingURL=appflowy-embed-CjDc9_rO.js.map