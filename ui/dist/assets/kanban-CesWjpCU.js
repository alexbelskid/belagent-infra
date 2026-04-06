import{i as e,l as t,n,t as r}from"./lit-BZwq2xLD.js";import{L as i,u as a,z as o}from"./index-CYHv_PBI.js";var s=`/api/kanban`,c={low:`Low`,mid:`Mid`,high:`High`},l={high:0,mid:1,low:2},u=[`#C8001E`,`#6B7280`,`#B2CACB`,`#4B5563`,`#A0001A`,`#8CA3A4`,`#374151`,`#556B6C`,`#9BA5AD`,`#E00022`];function d(e){let t=0;for(let n=0;n<e.length;n++)t=(t<<5)-t+e.charCodeAt(n)|0;return u[Math.abs(t)%u.length]}function f(e){if(!e)return`none`;let t=new Date;t.setHours(0,0,0,0);let n=(new Date(e+`T00:00:00`).getTime()-t.getTime())/864e5;return n<0?`overdue`:n<=1?`soon`:`ok`}var p=class extends r{constructor(...e){super(...e),this.columns=[],this.cards=[],this.loading=!0,this.error=null,this.modalOpen=!1,this.editingCard=null,this.formData={title:``,description:``,assignee:``,priority:`mid`,deadline:``,tags:``,columnId:``},this.addingColumn=!1,this.newColumnTitle=``,this.dragCardId=null,this.dragOverColumnId=null,this.dragOverIndex=null,this.confirmArchiveCardId=null,this.confirmDeleteColumnId=null,this.searchQuery=``,this.filterAssignee=``,this.filterTag=``,this.sortByPriority=!1,this.showArchive=!1,this.archivedCards=[],this.toastMsg=``,this.toastVisible=!1}static{this.styles=t`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      color: #ECEEF4;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Root ── */
    .root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0B0F0B;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      padding: 16px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      gap: 16px;
      flex-shrink: 0;
      flex-wrap: wrap;
      background: #0B0F0B;
    }
    .header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #F5F6FA;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .t-input {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      color: #ECEEF4;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      width: 200px; min-width: 200px;
      transition: border-color 0.2s, background 0.2s;
    }
    .t-input:focus {
      border-color: rgba(200, 0, 30, 0.5);
      background: rgba(255, 255, 255, 0.06);
    }
    .t-input::placeholder { color: #4B5563; }
    .t-select {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      color: #ECEEF4;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      max-width: 150px;
    }

    /* ── Buttons ── */
    .btn {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-primary {
      background: #C8001E;
      color: #fff;
      padding: 8px 14px;
    }
    .btn-primary:hover { background: #A0001A; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #ECEEF4;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.14);
    }
    .btn-secondary.active {
      background: rgba(200, 0, 30, 0.15);
      color: #B2CACB;
      border-color: rgba(200, 0, 30, 0.3);
    }
    .btn-ghost {
      background: transparent;
      color: #4B5563;
      padding: 5px 8px;
    }
    .btn-ghost:hover { color: #ECEEF4; background: rgba(255,255,255,0.06); }
    .btn-danger { background: #C8001E; color: #fff; padding: 8px 16px; }
    .btn-danger:hover { background: #A0001A; }
    .btn-amber {
      background: rgba(178, 202, 203, 0.15);
      color: #B2CACB;
      padding: 8px 12px;
      border: 1px solid rgba(178, 202, 203, 0.2);
    }
    .btn-amber:hover {
      background: rgba(178, 202, 203, 0.25);
    }
    .btn-sm { font-size: 12px; padding: 4px 8px; border-radius: 6px; }

    /* ── Board ── */
    .board {
      display: flex;
      gap: 20px;
      padding: 24px 28px;
      overflow-x: auto;
      flex: 1;
      align-items: flex-start;
    }

    /* ── Column ── */
    .col {
      width: 300px;
      min-width: 300px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      max-height: 100%;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: border-color 0.2s ease;
    }
    .col.drag-over {
      border-color: rgba(200, 0, 30, 0.4);
      background: rgba(200, 0, 30, 0.03);
    }
    .col-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 12px;
    }
    .col-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6B7280;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .col-count {
      background: rgba(255, 255, 255, 0.06);
      color: #6B7280;
      font-size: 11px;
      min-width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-weight: 500;
    }
    .col-body {
      padding: 4px 10px 8px;
      overflow-y: auto;
      flex: 1;
      min-height: 48px;
    }
    .col-foot {
      padding: 6px 10px 10px;
    }
    .add-card-btn {
      width: 100%;
      background: transparent;
      border: none;
      color: #4B5563;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      text-align: left;
      transition: color 0.15s, background 0.15s;
    }
    .add-card-btn:hover {
      color: #ECEEF4;
      background: rgba(255, 255, 255, 0.04);
    }

    /* ── Card ── */
    .card {
      background: #121612;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 8px;
      cursor: grab;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease,
        border-color 0.15s ease, opacity 0.15s ease;
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      transform: translateY(-1px);
    }
    .card:active { cursor: grabbing; }
    .card.dragging {
      opacity: 0.35;
      transform: scale(0.96);
      box-shadow: none;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 500;
      color: #F5F6FA;
      line-height: 1.45;
      flex: 1;
    }
    .card-actions {
      display: flex;
      gap: 1px;
      opacity: 0;
      transition: opacity 0.12s;
      flex-shrink: 0;
      margin: -2px -4px 0 0;
    }
    .card:hover .card-actions { opacity: 1; }
    .card-action-btn {
      background: transparent;
      border: none;
      color: #4B5563;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 12px;
      transition: color 0.12s, background 0.12s;
    }
    .card-action-btn:hover {
      color: #ECEEF4;
      background: rgba(255, 255, 255, 0.08);
    }
    .card-action-btn.archive-btn:hover {
      color: #B2CACB;
    }
    .card-desc {
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .card-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      color: #fff;
      opacity: 0.85;
    }
    .card-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    /* Priority dot + label */
    .priority-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #6B7280;
    }
    .priority-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .priority-dot.high { background: #C8001E; }
    .priority-dot.mid { background: #B2CACB; }
    .priority-dot.low { background: #B2CACB; }
    .card-assignee {
      font-size: 11px;
      color: #B2CACB;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90px;
    }
    .card-date {
      font-size: 11px;
      color: #4B5563;
      margin-left: auto;
    }
    .card-deadline {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .card-deadline.overdue { background: rgba(200, 0, 30, 0.15); color: #C8001E; }
    .card-deadline.soon { background: rgba(178, 202, 203, 0.15); color: #B2CACB; }
    .card-deadline.ok { background: rgba(255, 255, 255, 0.04); color: #6B7280; }

    .drop-zone {
      height: 3px;
      background: #C8001E;
      border-radius: 2px;
      margin: 4px 6px;
      opacity: 0.7;
    }

    /* ── Add column ── */
    .add-col {
      width: 300px;
      min-width: 300px;
      flex-shrink: 0;
    }
    .add-col-trigger {
      width: 100%;
      background: transparent;
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #4B5563;
      padding: 24px 20px;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s, color 0.2s;
      text-align: center;
    }
    .add-col-trigger:hover {
      border-color: rgba(200, 0, 30, 0.3);
      color: #B2CACB;
    }
    .add-col-form {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .add-col-form input {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 9px 12px;
      color: #ECEEF4;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .add-col-form input:focus { border-color: rgba(200, 0, 30, 0.5); }

    /* ── Modal ── */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(6px);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal {
      background: #121612;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 28px;
      width: 480px;
      max-width: 92vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
      animation: modalIn 0.2s ease;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.97) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal h3 {
      margin: 0 0 24px;
      font-size: 17px;
      font-weight: 600;
      color: #F5F6FA;
      letter-spacing: -0.01em;
    }
    .fg { margin-bottom: 16px; }
    .fg label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .fg input, .fg textarea, .fg select {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 14px;
      color: #ECEEF4;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .fg input:focus, .fg textarea:focus, .fg select:focus {
      border-color: rgba(200, 0, 30, 0.5);
    }
    .fg textarea { resize: vertical; min-height: 80px; }
    .fg select { cursor: pointer; }
    .fg .hint { font-size: 11px; color: #4B5563; margin-top: 4px; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
    }

    /* ── Confirm dialog ── */
    .confirm {
      background: #121612;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 28px;
      width: 360px;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    }
    .confirm p {
      color: #ECEEF4;
      font-size: 14px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .confirm-btns {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    /* ── Archive view ── */
    .archive {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0B0F0B;
    }
    .archive-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .archive-head h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #F5F6FA;
    }
    .archive-grid {
      padding: 24px 28px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
      align-content: start;
    }
    .archive-card {
      background: #121612;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 16px;
    }

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: #121612;
      border: 1px solid rgba(200, 0, 30, 0.3);
      border-radius: 12px;
      padding: 14px 22px;
      color: #ECEEF4;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
      animation: toastIn 0.25s ease-out;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .center-msg {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #4B5563;
      font-size: 14px;
    }

    /* ── Inline row helper ── */
    .row { display: flex; gap: 12px; }
    .row > * { flex: 1; }
  `}connectedCallback(){super.connectedCallback(),this._loadBoard()}_showToast(e){this.toastMsg=e,this.toastVisible=!0,setTimeout(()=>{this.toastVisible=!1},2500)}async _loadBoard(){this.loading=!0,this.error=null;try{let e=await fetch(s);if(!e.ok)throw Error(`HTTP ${e.status}`);let t=await e.json();this.columns=[...t.columns].sort((e,t)=>e.order-t.order),this.cards=t.cards.map(e=>({...e,deadline:e.deadline??null,tags:Array.isArray(e.tags)?e.tags:[]}))}catch(e){this.error=`Failed to load board: ${e}`}this.loading=!1}async _loadArchive(){try{let e=await fetch(`${s}/archive`);if(!e.ok)throw Error(`HTTP ${e.status}`);this.archivedCards=(await e.json()).cards||[]}catch(e){this.error=`Failed to load archive: ${e}`}}async _addColumn(){let e=this.newColumnTitle.trim();if(e)try{let t=await fetch(`${s}/columns`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({title:e})});if(!t.ok)throw Error(`HTTP ${t.status}`);this.newColumnTitle=``,this.addingColumn=!1,await this._loadBoard()}catch(e){this.error=`Failed to add column: ${e}`}}async _deleteColumn(e){try{let t=await fetch(`${s}/columns/${e}`,{method:`DELETE`});if(!t.ok){let e=await t.json();throw Error(e.error||`HTTP ${t.status}`)}this.confirmDeleteColumnId=null,await this._loadBoard()}catch(e){this.error=`Failed to delete column: ${e}`,this.confirmDeleteColumnId=null}}async _saveCard(){let{title:e,description:t,assignee:n,priority:r,deadline:i,tags:a,columnId:o}=this.formData;if(!e.trim())return;let c={title:e,description:t,assignee:n,priority:r,columnId:o,deadline:i||null,tags:a.split(`,`).map(e=>e.trim()).filter(Boolean)};try{if(this.editingCard){let e=await fetch(`${s}/cards/${this.editingCard.id}`,{method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify(c)});if(!e.ok)throw Error(`HTTP ${e.status}`)}else{let e=await fetch(`${s}/cards`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(c)});if(!e.ok)throw Error(`HTTP ${e.status}`)}this._closeModal(),await this._loadBoard()}catch(e){this.error=`Failed to save card: ${e}`}}async _archiveCard(e){let t=this.cards.find(t=>t.id===e);this.cards=this.cards.filter(t=>t.id!==e),this.confirmArchiveCardId=null;try{let n=await fetch(`${s}/cards/${e}/archive`,{method:`POST`});if(!n.ok)throw Error(`HTTP ${n.status}`);t&&this._showToast(`Archived "${t.title}"`)}catch(e){t&&(this.cards=[...this.cards,t]),this._showToast(`Failed to archive: ${e}`)}}async _moveCard(e,t,n){let r=this.cards.findIndex(t=>t.id===e);if(r===-1)return;let i=[...this.cards],a={...i[r]},o=a.columnId;a.columnId=t;let c=i.filter(n=>n.columnId===t&&n.id!==e).sort((e,t)=>e.order-t.order),l=Math.min(n,c.length);c.splice(l,0,a),c.forEach((e,t)=>{e.order=t}),o!==t&&i.filter(t=>t.columnId===o&&t.id!==e).sort((e,t)=>e.order-t.order).forEach((e,t)=>{e.order=t}),i[r]=a,this.cards=i;try{let r=await fetch(`${s}/reorder`,{method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify({cardId:e,targetColumnId:t,targetIndex:n})});if(!r.ok)throw Error(`HTTP ${r.status}`)}catch{await this._loadBoard()}}async _archiveDone(){try{let e=await fetch(`${s}/archive-done`,{method:`POST`});if(!e.ok)throw Error(`HTTP ${e.status}`);let t=await e.json();this._showToast(`Archived ${t.archived} card${t.archived===1?``:`s`}`),await this._loadBoard()}catch(e){this.error=`Failed to archive: ${e}`}}async _restoreCard(e){try{let t=await fetch(`${s}/archive/${e}/restore`,{method:`POST`});if(!t.ok)throw Error(`HTTP ${t.status}`);this._showToast(`Card restored`),await this._loadArchive(),await this._loadBoard()}catch(e){this.error=`Failed to restore: ${e}`}}_openAddCard(e){this.editingCard=null,this.formData={title:``,description:``,assignee:``,priority:`mid`,deadline:``,tags:``,columnId:e},this.modalOpen=!0}_openEditCard(e){this.editingCard=e,this.formData={title:e.title,description:e.description,assignee:e.assignee,priority:e.priority,deadline:e.deadline||``,tags:(e.tags||[]).join(`, `),columnId:e.columnId},this.modalOpen=!0}_closeModal(){this.modalOpen=!1,this.editingCard=null}_onDragStart(e,t){this.dragCardId=t,e.dataTransfer&&(e.dataTransfer.effectAllowed=`move`,e.dataTransfer.setData(`text/plain`,t))}_onDragEnd(){this.dragCardId=null,this.dragOverColumnId=null,this.dragOverIndex=null}_onColumnDragOver(e,t){if(e.preventDefault(),!this.dragCardId)return;e.dataTransfer&&(e.dataTransfer.dropEffect=`move`),this.dragOverColumnId=t;let n=e.currentTarget.querySelector(`.col-body`);if(!n)return;let r=Array.from(n.querySelectorAll(`.card:not(.dragging)`)),i=r.length;for(let t=0;t<r.length;t++){let n=r[t].getBoundingClientRect();if(e.clientY<n.top+n.height/2){i=t;break}}this.dragOverIndex=i}_onColumnDragLeave(e,t){let n=e.relatedTarget,r=e.currentTarget;n&&r.contains(n)||this.dragOverColumnId===t&&(this.dragOverColumnId=null,this.dragOverIndex=null)}_onColumnDrop(e,t){e.preventDefault();let n=this.dragCardId,r=this.dragOverIndex??0;this.dragCardId=null,this.dragOverColumnId=null,this.dragOverIndex=null,n&&this._moveCard(n,t,r)}_allAssignees(){let e=new Set;for(let t of this.cards)t.assignee&&e.add(t.assignee);return[...e].sort()}_allTags(){let e=new Set;for(let t of this.cards)for(let n of t.tags||[])e.add(n);return[...e].sort()}_cardsForColumn(e){let t=this.searchQuery.toLowerCase(),n=this.cards.filter(n=>!(n.columnId!==e||this.filterAssignee&&n.assignee!==this.filterAssignee||this.filterTag&&!(n.tags||[]).includes(this.filterTag)||t&&!`${n.title} ${n.description}`.toLowerCase().includes(t)));return n=this.sortByPriority?[...n].sort((e,t)=>l[e.priority]-l[t.priority]):[...n].sort((e,t)=>e.order-t.order),n}_hasDoneCards(){let e=this.columns.find(e=>e.title.toLowerCase()===`done`||e.id===`done`);return e?this.cards.some(t=>t.columnId===e.id):!1}_fmtDate(e){try{return new Date(e).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`})}catch{return``}}_fmtDeadline(e){try{return new Date(e+`T00:00:00`).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`})}catch{return e}}render(){if(this.loading)return e`<div class="center-msg">Loading\u2026</div>`;if(this.error)return e`
        <div class="root">
          <div class="header">
            <h2>Tasks</h2>
            <button class="btn btn-secondary" @click=${()=>{this.error=null,this._loadBoard()}}>Retry</button>
          </div>
          <div class="center-msg" style="color:#C8001E">${this.error}</div>
        </div>`;if(this.showArchive)return this._renderArchiveView();let t=this._allAssignees(),r=this._allTags();return e`
      <div class="root">
        <div class="header">
          <h2>Tasks</h2>
          <div class="toolbar">
            <input class="t-input" type="text" placeholder="Search\u2026"
              .value=${this.searchQuery}
              @input=${e=>{this.searchQuery=e.target.value}}
            />
            ${t.length>0?e`
              <select class="t-select" .value=${this.filterAssignee}
                @change=${e=>{this.filterAssignee=e.target.value}}>
                <option value="">All people</option>
                ${t.map(t=>e`<option value=${t}>${t}</option>`)}
              </select>`:n}
            ${r.length>0?e`
              <select class="t-select" .value=${this.filterTag}
                @change=${e=>{this.filterTag=e.target.value}}>
                <option value="">All tags</option>
                ${r.map(t=>e`<option value=${t}>${t}</option>`)}
              </select>`:n}
            <button class="btn btn-secondary btn-sm ${this.sortByPriority?`active`:``}"
              @click=${()=>{this.sortByPriority=!this.sortByPriority}}>Priority</button>
            ${this._hasDoneCards()?e`
              <button class="btn btn-amber btn-sm" @click=${()=>this._archiveDone()}>Archive Done</button>
            `:n}
            <button class="btn btn-secondary btn-sm" @click=${()=>{this.showArchive=!0,this._loadArchive()}}>Archive</button>
            <button class="btn btn-primary btn-sm" @click=${()=>this._openAddCard(this.columns[0]?.id||``)}>+ New</button>
          </div>
        </div>

        <div class="board">
          ${this.columns.map(e=>this._renderColumn(e))}
          ${this._renderAddColumn()}
        </div>
      </div>

      ${this.modalOpen?this._renderModal():n}
      ${this.confirmArchiveCardId?this._renderConfirmArchive():n}
      ${this.confirmDeleteColumnId?this._renderConfirmDeleteColumn():n}
      ${this.toastVisible?e`<div class="toast">${this.toastMsg}</div>`:n}
    `}_renderColumn(t){let r=this._cardsForColumn(t.id),i=this.dragOverColumnId===t.id;return e`
      <div class="col ${i?`drag-over`:``}"
        @dragover=${e=>this._onColumnDragOver(e,t.id)}
        @dragleave=${e=>this._onColumnDragLeave(e,t.id)}
        @drop=${e=>this._onColumnDrop(e,t.id)}>
        <div class="col-head">
          <span class="col-label">
            ${t.title}
            <span class="col-count">${r.length}</span>
          </span>
          <button class="btn btn-ghost btn-sm" title="Delete column"
            @click=${()=>{this.confirmDeleteColumnId=t.id}}>\u00D7</button>
        </div>
        <div class="col-body">
          ${r.map((t,r)=>e`
            ${i&&this.dragOverIndex===r?e`<div class="drop-zone"></div>`:n}
            ${this._renderCard(t)}
          `)}
          ${i&&this.dragOverIndex===r.length?e`<div class="drop-zone"></div>`:n}
        </div>
        <div class="col-foot">
          <button class="add-card-btn" @click=${()=>this._openAddCard(t.id)}>+ Add card</button>
        </div>
      </div>
    `}_renderCard(t){let r=this.dragCardId===t.id,i=f(t.deadline);return e`
      <div class="card ${r?`dragging`:``}" draggable="true"
        @dragstart=${e=>this._onDragStart(e,t.id)}
        @dragend=${()=>this._onDragEnd()}>
        <div class="card-top">
          <div class="card-title">${t.title}</div>
          <div class="card-actions">
            <button class="card-action-btn" title="Edit"
              @click=${e=>{e.stopPropagation(),this._openEditCard(t)}}>\u270E</button>
            <button class="card-action-btn archive-btn" title="Archive"
              @click=${e=>{e.stopPropagation(),this.confirmArchiveCardId=t.id}}>\u2192</button>
          </div>
        </div>
        ${t.description?e`<div class="card-desc">${t.description}</div>`:n}
        ${(t.tags||[]).length>0?e`
          <div class="card-tags">
            ${t.tags.map(t=>e`<span class="card-tag" style="background:${d(t)}">${t}</span>`)}
          </div>`:n}
        <div class="card-footer">
          <span class="priority-badge">
            <span class="priority-dot ${t.priority}"></span>
            ${c[t.priority]}
          </span>
          ${t.assignee?e`<span class="card-assignee">${t.assignee}</span>`:n}
          ${i===`none`?n:e`
            <span class="card-deadline ${i}">${this._fmtDeadline(t.deadline)}</span>
          `}
          <span class="card-date">${this._fmtDate(t.createdAt)}</span>
        </div>
      </div>
    `}_renderAddColumn(){return this.addingColumn?e`
        <div class="add-col">
          <div class="add-col-form">
            <input type="text" placeholder="Column title"
              .value=${this.newColumnTitle}
              @input=${e=>{this.newColumnTitle=e.target.value}}
              @keydown=${e=>{e.key===`Enter`&&this._addColumn(),e.key===`Escape`&&(this.addingColumn=!1)}}
            />
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary" style="flex:1" @click=${()=>this._addColumn()}>Add</button>
              <button class="btn btn-secondary" @click=${()=>{this.addingColumn=!1}}>Cancel</button>
            </div>
          </div>
        </div>`:e`
      <div class="add-col">
        <button class="add-col-trigger" @click=${()=>{this.addingColumn=!0}}>+ Add Column</button>
      </div>`}_renderModal(){let t=!!this.editingCard;return e`
      <div class="overlay" @click=${e=>{e.target===e.currentTarget&&this._closeModal()}}>
        <div class="modal">
          <h3>${t?`Edit Task`:`New Task`}</h3>

          <div class="fg">
            <label>Title</label>
            <input type="text" placeholder="What needs to be done?"
              .value=${this.formData.title}
              @input=${e=>{this.formData={...this.formData,title:e.target.value}}}
            />
          </div>

          <div class="fg">
            <label>Description</label>
            <textarea placeholder="Add details\u2026"
              .value=${this.formData.description}
              @input=${e=>{this.formData={...this.formData,description:e.target.value}}}
            ></textarea>
          </div>

          <div class="row">
            <div class="fg">
              <label>Assignee</label>
              <input type="text" placeholder="Name"
                .value=${this.formData.assignee}
                @input=${e=>{this.formData={...this.formData,assignee:e.target.value}}}
              />
            </div>
            <div class="fg">
              <label>Priority</label>
              <select .value=${this.formData.priority}
                @change=${e=>{this.formData={...this.formData,priority:e.target.value}}}>
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="fg">
              <label>Deadline</label>
              <input type="date"
                .value=${this.formData.deadline}
                @input=${e=>{this.formData={...this.formData,deadline:e.target.value}}}
              />
            </div>
            <div class="fg">
              <label>Column</label>
              <select .value=${this.formData.columnId}
                @change=${e=>{this.formData={...this.formData,columnId:e.target.value}}}>
                ${this.columns.map(t=>e`
                  <option value=${t.id} ?selected=${t.id===this.formData.columnId}>${t.title}</option>
                `)}
              </select>
            </div>
          </div>

          <div class="fg">
            <label>Tags</label>
            <input type="text" placeholder="design, backend, urgent"
              .value=${this.formData.tags}
              @input=${e=>{this.formData={...this.formData,tags:e.target.value}}}
            />
            <div class="hint">Comma-separated</div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click=${()=>this._closeModal()}>Cancel</button>
            <button class="btn btn-primary" @click=${()=>this._saveCard()}>
              ${t?`Save changes`:`Create task`}
            </button>
          </div>
        </div>
      </div>`}_renderConfirmArchive(){return e`
      <div class="overlay" @click=${e=>{e.target===e.currentTarget&&(this.confirmArchiveCardId=null)}}>
        <div class="confirm">
          <p>Archive "${this.cards.find(e=>e.id===this.confirmArchiveCardId)?.title}"?<br/><span style="color:#6B7280;font-size:12px">You can restore it later from the archive.</span></p>
          <div class="confirm-btns">
            <button class="btn btn-secondary" @click=${()=>{this.confirmArchiveCardId=null}}>Cancel</button>
            <button class="btn btn-amber" @click=${()=>this._archiveCard(this.confirmArchiveCardId)}>Archive</button>
          </div>
        </div>
      </div>`}_renderConfirmDeleteColumn(){let t=this.columns.find(e=>e.id===this.confirmDeleteColumnId),r=this._cardsForColumn(this.confirmDeleteColumnId).length;return e`
      <div class="overlay" @click=${e=>{e.target===e.currentTarget&&(this.confirmDeleteColumnId=null)}}>
        <div class="confirm">
          <p>Delete column "${t?.title}"?${r>0?e`<br/><span style="color:#C8001E">${r} task${r>1?`s`:``} will be permanently deleted.</span>`:n}</p>
          <div class="confirm-btns">
            <button class="btn btn-secondary" @click=${()=>{this.confirmDeleteColumnId=null}}>Cancel</button>
            <button class="btn btn-danger" @click=${()=>this._deleteColumn(this.confirmDeleteColumnId)}>Delete</button>
          </div>
        </div>
      </div>`}_renderArchiveView(){return e`
      <div class="archive">
        <div class="archive-head">
          <h2>Archive (${this.archivedCards.length})</h2>
          <button class="btn btn-secondary" @click=${()=>{this.showArchive=!1}}>\u2190 Back</button>
        </div>
        ${this.archivedCards.length===0?e`<div class="center-msg">No archived cards</div>`:e`
            <div class="archive-grid">
              ${this.archivedCards.map(t=>e`
                <div class="archive-card">
                  <div class="card-title" style="color:#F5F6FA;margin-bottom:6px">${t.title}</div>
                  ${t.description?e`<div class="card-desc">${t.description}</div>`:n}
                  ${(t.tags||[]).length>0?e`
                    <div class="card-tags" style="margin-top:8px">
                      ${t.tags.map(t=>e`<span class="card-tag" style="background:${d(t)}">${t}</span>`)}
                    </div>`:n}
                  <div class="card-footer" style="margin-top:10px">
                    <span class="priority-badge">
                      <span class="priority-dot ${t.priority}"></span>
                      ${c[t.priority]}
                    </span>
                    ${t.assignee?e`<span class="card-assignee">${t.assignee}</span>`:n}
                    <span class="card-date">${this._fmtDate(t.createdAt)}</span>
                    <button class="btn btn-primary btn-sm" style="margin-left:auto" @click=${()=>this._restoreCard(t.id)}>Restore</button>
                  </div>
                </div>
              `)}
            </div>`}
      </div>
      ${this.toastVisible?e`<div class="toast">${this.toastMsg}</div>`:n}
    `}};a([i()],p.prototype,`columns`,void 0),a([i()],p.prototype,`cards`,void 0),a([i()],p.prototype,`loading`,void 0),a([i()],p.prototype,`error`,void 0),a([i()],p.prototype,`modalOpen`,void 0),a([i()],p.prototype,`editingCard`,void 0),a([i()],p.prototype,`formData`,void 0),a([i()],p.prototype,`addingColumn`,void 0),a([i()],p.prototype,`newColumnTitle`,void 0),a([i()],p.prototype,`dragCardId`,void 0),a([i()],p.prototype,`dragOverColumnId`,void 0),a([i()],p.prototype,`dragOverIndex`,void 0),a([i()],p.prototype,`confirmArchiveCardId`,void 0),a([i()],p.prototype,`confirmDeleteColumnId`,void 0),a([i()],p.prototype,`searchQuery`,void 0),a([i()],p.prototype,`filterAssignee`,void 0),a([i()],p.prototype,`filterTag`,void 0),a([i()],p.prototype,`sortByPriority`,void 0),a([i()],p.prototype,`showArchive`,void 0),a([i()],p.prototype,`archivedCards`,void 0),a([i()],p.prototype,`toastMsg`,void 0),a([i()],p.prototype,`toastVisible`,void 0),p=a([o(`kanban-board-view`)],p);function m(){return e`<kanban-board-view></kanban-board-view>`}export{p as KanbanBoardView,m as renderKanban};
//# sourceMappingURL=kanban-CesWjpCU.js.map