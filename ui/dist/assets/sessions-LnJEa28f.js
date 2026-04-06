import{i as e,n as t}from"./lit-BZwq2xLD.js";import{l as n}from"./format-DeRVtGzv.js";import{A as r,M as i,s as a}from"./index-DKzkBGLh.js";var o=[``,`off`,`minimal`,`low`,`medium`,`high`,`xhigh`],s=[``,`off`,`on`],c=[{value:``,label:`inherit`},{value:`off`,label:`off (explicit)`},{value:`on`,label:`on`},{value:`full`,label:`full`}],l=[{value:``,label:`inherit`},{value:`on`,label:`on`},{value:`off`,label:`off`}],u=[``,`off`,`on`,`stream`],d=[10,25,50,100];function f(e){if(!e)return``;let t=e.trim().toLowerCase();return t===`z.ai`||t===`z-ai`?`zai`:t}function p(e){return f(e)===`zai`}function m(e){return p(e)?s:o}function h(e,t){return!t||e.includes(t)?[...e]:[...e,t]}function g(e,t){return!t||e.some(e=>e.value===t)?[...e]:[...e,{value:t,label:`${t} (custom)`}]}function _(e,t){return!t||!e||e===`off`?e:`on`}function v(e,t){return e?t&&e===`on`?`low`:e:null}function y(e,t){let n=t.trim().toLowerCase();return n?e.filter(e=>{let t=(e.key??``).toLowerCase(),r=(e.label??``).toLowerCase(),i=(e.kind??``).toLowerCase(),a=(e.displayName??``).toLowerCase();return t.includes(n)||r.includes(n)||i.includes(n)||a.includes(n)}):e}function b(e,t,n){let r=n===`asc`?1:-1;return[...e].toSorted((e,n)=>{let i=0;switch(t){case`key`:i=(e.key??``).localeCompare(n.key??``);break;case`kind`:i=(e.kind??``).localeCompare(n.kind??``);break;case`updated`:i=(e.updatedAt??0)-(n.updatedAt??0);break;case`tokens`:i=(e.totalTokens??e.inputTokens??e.outputTokens??0)-(n.totalTokens??n.inputTokens??n.outputTokens??0);break}return i*r})}function x(e,t,n){let r=t*n;return e.slice(r,r+n)}function S(n){let i=b(y(n.result?.sessions??[],n.searchQuery),n.sortColumn,n.sortDir),a=i.length,o=Math.max(1,Math.ceil(a/n.pageSize)),s=Math.min(n.page,o-1),c=x(i,s,n.pageSize),l=(t,i,a=``)=>{let o=n.sortColumn===t,s=o&&n.sortDir===`asc`?`desc`:`asc`;return e`
      <th
        class=${a}
        data-sortable
        data-sort-dir=${o?n.sortDir:``}
        @click=${()=>n.onSortChange(t,o?s:`desc`)}
      >
        ${i}
        <span class="data-table-sort-icon">${r.arrowUpDown}</span>
      </th>
    `};return e`
    <section class="card">
      <div class="row" style="justify-content: space-between; margin-bottom: 12px;">
        <div>
          <div class="card-title">Sessions</div>
          <div class="card-sub">${n.result?`Store: ${n.result.path}`:`Active session keys and per-session overrides.`}</div>
        </div>
        <button class="btn" ?disabled=${n.loading} @click=${n.onRefresh}>
          ${n.loading?`Loading…`:`Refresh`}
        </button>
      </div>

      <div class="filters" style="margin-bottom: 12px;">
        <label class="field-inline">
          <span>Active</span>
          <input
            style="width: 72px;"
            placeholder="min"
            .value=${n.activeMinutes}
            @input=${e=>n.onFiltersChange({activeMinutes:e.target.value,limit:n.limit,includeGlobal:n.includeGlobal,includeUnknown:n.includeUnknown})}
          />
        </label>
        <label class="field-inline">
          <span>Limit</span>
          <input
            style="width: 64px;"
            .value=${n.limit}
            @input=${e=>n.onFiltersChange({activeMinutes:n.activeMinutes,limit:e.target.value,includeGlobal:n.includeGlobal,includeUnknown:n.includeUnknown})}
          />
        </label>
        <label class="field-inline checkbox">
          <input
            type="checkbox"
            .checked=${n.includeGlobal}
            @change=${e=>n.onFiltersChange({activeMinutes:n.activeMinutes,limit:n.limit,includeGlobal:e.target.checked,includeUnknown:n.includeUnknown})}
          />
          <span>Global</span>
        </label>
        <label class="field-inline checkbox">
          <input
            type="checkbox"
            .checked=${n.includeUnknown}
            @change=${e=>n.onFiltersChange({activeMinutes:n.activeMinutes,limit:n.limit,includeGlobal:n.includeGlobal,includeUnknown:e.target.checked})}
          />
          <span>Unknown</span>
        </label>
      </div>

      ${n.error?e`<div class="callout danger" style="margin-bottom: 12px;">${n.error}</div>`:t}

      <div class="data-table-wrapper">
        <div class="data-table-toolbar">
          <div class="data-table-search">
            <input
              type="text"
              placeholder="Filter by key, label, kind…"
              .value=${n.searchQuery}
              @input=${e=>n.onSearchChange(e.target.value)}
            />
          </div>
        </div>

        ${n.selectedKeys.size>0?e`
                <div class="data-table-bulk-bar">
                  <span>${n.selectedKeys.size} selected</span>
                  <button
                    class="btn btn--sm"
                    @click=${n.onDeselectAll}
                  >
                    Unselect
                  </button>
                  <button
                    class="btn btn--sm danger"
                    ?disabled=${n.loading}
                    @click=${n.onDeleteSelected}
                  >
                    ${r.trash} Delete
                  </button>
                </div>
              `:t}

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="data-table-checkbox-col">
                  ${c.length>0?e`<input
                        type="checkbox"
                        .checked=${c.length>0&&c.every(e=>n.selectedKeys.has(e.key))}
                        .indeterminate=${c.some(e=>n.selectedKeys.has(e.key))&&!c.every(e=>n.selectedKeys.has(e.key))}
                        @change=${()=>{c.every(e=>n.selectedKeys.has(e.key))?n.onDeselectPage(c.map(e=>e.key)):n.onSelectPage(c.map(e=>e.key))}}
                        aria-label="Select all on page"
                      />`:t}
                </th>
                ${l(`key`,`Key`,`data-table-key-col`)}
                <th>Label</th>
                ${l(`kind`,`Kind`)}
                ${l(`updated`,`Updated`)}
                ${l(`tokens`,`Tokens`)}
                <th>Thinking</th>
                <th>Fast</th>
                <th>Verbose</th>
                <th>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              ${c.length===0?e`
                      <tr>
                        <td colspan="10" style="text-align: center; padding: 48px 16px; color: var(--muted)">
                          No sessions found.
                        </td>
                      </tr>
                    `:c.map(e=>C(e,n.basePath,n.onPatch,n.selectedKeys.has(e.key),n.onToggleSelect,n.loading,n.onNavigateToChat))}
            </tbody>
          </table>
        </div>

        ${a>0?e`
                <div class="data-table-pagination">
                  <div class="data-table-pagination__info">
                    ${s*n.pageSize+1}-${Math.min((s+1)*n.pageSize,a)}
                    of ${a} row${a===1?``:`s`}
                  </div>
                  <div class="data-table-pagination__controls">
                    <select
                      style="height: 32px; padding: 0 8px; font-size: 13px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--card);"
                      .value=${String(n.pageSize)}
                      @change=${e=>n.onPageSizeChange(Number(e.target.value))}
                    >
                      ${d.map(t=>e`<option value=${t}>${t} per page</option>`)}
                    </select>
                    <button
                      ?disabled=${s<=0}
                      @click=${()=>n.onPageChange(s-1)}
                    >
                      Previous
                    </button>
                    <button
                      ?disabled=${s>=o-1}
                      @click=${()=>n.onPageChange(s+1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              `:t}
      </div>
    </section>
  `}function C(r,o,s,d,f,y,b){let x=r.updatedAt?n(r.updatedAt):`n/a`,S=r.thinkingLevel??``,C=p(r.modelProvider),w=_(S,C),T=h(m(r.modelProvider),w),E=r.fastMode===!0?`on`:r.fastMode===!1?`off`:``,D=g(l,E),O=r.verboseLevel??``,k=g(c,O),A=r.reasoningLevel??``,j=h(u,A),M=typeof r.displayName==`string`&&r.displayName.trim().length>0?r.displayName.trim():null,N=!!(M&&M!==r.key&&M!==(typeof r.label==`string`?r.label.trim():``)),P=r.kind!==`global`,F=P?`${i(`chat`,o)}?session=${encodeURIComponent(r.key)}`:null,I=r.kind===`direct`?`data-table-badge--direct`:r.kind===`group`?`data-table-badge--group`:r.kind===`global`?`data-table-badge--global`:`data-table-badge--unknown`;return e`
    <tr>
      <td class="data-table-checkbox-col">
        <input
          type="checkbox"
          .checked=${d}
          @change=${()=>f(r.key)}
          aria-label="Select session"
        />
      </td>
      <td class="data-table-key-col">
        <div class="mono session-key-cell">
          ${P?e`<a
                  href=${F}
                  class="session-link"
                  @click=${e=>{e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||b&&(e.preventDefault(),b(r.key))}}
                >${r.key}</a>`:r.key}
          ${N?e`<span class="muted session-key-display-name">${M}</span>`:t}
        </div>
      </td>
      <td>
        <input
          .value=${r.label??``}
          ?disabled=${y}
          placeholder="(optional)"
          style="width: 100%; max-width: 140px; padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm);"
          @change=${e=>{let t=e.target.value.trim();s(r.key,{label:t||null})}}
        />
      </td>
      <td>
        <span class="data-table-badge ${I}">${r.kind}</span>
      </td>
      <td>${x}</td>
      <td>${a(r)}</td>
      <td>
        <select
          ?disabled=${y}
          style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); min-width: 90px;"
          @change=${e=>{let t=e.target.value;s(r.key,{thinkingLevel:v(t,C)})}}
        >
          ${T.map(t=>e`<option value=${t} ?selected=${w===t}>
                ${t||`inherit`}
              </option>`)}
        </select>
      </td>
      <td>
        <select
          ?disabled=${y}
          style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); min-width: 90px;"
          @change=${e=>{let t=e.target.value;s(r.key,{fastMode:t===``?null:t===`on`})}}
        >
          ${D.map(t=>e`<option value=${t.value} ?selected=${E===t.value}>
                ${t.label}
              </option>`)}
        </select>
      </td>
      <td>
        <select
          ?disabled=${y}
          style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); min-width: 90px;"
          @change=${e=>{let t=e.target.value;s(r.key,{verboseLevel:t||null})}}
        >
          ${k.map(t=>e`<option value=${t.value} ?selected=${O===t.value}>
                ${t.label}
              </option>`)}
        </select>
      </td>
      <td>
        <select
          ?disabled=${y}
          style="padding: 6px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); min-width: 90px;"
          @change=${e=>{let t=e.target.value;s(r.key,{reasoningLevel:t||null})}}
        >
          ${j.map(t=>e`<option value=${t} ?selected=${A===t}>
                ${t||`inherit`}
              </option>`)}
        </select>
      </td>
    </tr>
  `}export{S as renderSessions};
//# sourceMappingURL=sessions-LnJEa28f.js.map