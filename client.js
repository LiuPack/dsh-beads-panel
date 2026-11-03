/**
 * Browser half of the Beads panel bundle.
 *
 * Registers one entry in the left sidebar's global panel list and the matching
 * main panel. All Beads data comes from this package's Host half over the
 * owner-only endpoint `/__dsh_beads/api`; this module owns only presentation and
 * the explicit create/claim/close requests.
 *
 * @module @local/dsh-beads-panel/client
 */
window.__ModuleLoader__.load({
	id: '@local/dsh-beads-panel',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		/** Locale namespace of this panel. */
		const NS = 'beads-panel';
		/** Sidebar panel id; the `main` key of the panel it opens. */
		const PANEL_ID = 'beads';
		/** Owner-only JSON endpoint registered by this package's Host half. */
		const API_PATH = '/__dsh_beads/api';
		/** Remembers the last workspace the user inspected. */
		const WORKSPACE_STORAGE_KEY = 'dsh.beads-panel.workspace';
		/** Empty list shared by the hook fallback, so it is referentially stable. */
		const NO_WORKSPACES = [];

		const zh = {
			'panel': 'Beads',
			'title': 'Beads',
			'subtitle': '依赖感知的任务图谱',
			'workspace': '工作区',
			'workspaceEmpty': '还没有注册工作区。请先打开一个工作区。',
			'refresh': '刷新',
			'new': '新建任务',
			'loading': '加载中…',
			'retry': '重试',
			'bdMissing': '未找到 bd 命令。',
			'bdMissingHint': '安装 Beads CLI 后刷新此面板：',
			'notInitializedTitle': '该工作区尚未初始化 Beads',
			'notInitializedHint': '在工作区中运行以下命令，然后刷新：',
			'project': '项目',
			'count.open': '待处理',
			'count.ready': '可领取',
			'count.in_progress': '进行中',
			'count.blocked': '受阻',
			'count.closed': '已完成',
			'filter.label': '筛选任务',
			'filter.ready': '可领取',
			'filter.in_progress': '进行中',
			'filter.open': '待处理',
			'filter.all': '全部',
			'empty.ready': '暂无可领取任务：所有未关闭任务都受阻或已在进行中。',
			'empty.in_progress': '没有进行中的任务。',
			'empty.open': '没有待处理任务。',
			'empty.all': '该工作区还没有任务。',
			'empty.new': '新建任务',
			'list.label': '任务列表',
			'row.meta.blockedBy': '被 {count} 项阻塞',
			'row.meta.blocks': '阻塞 {count} 项',
			'row.meta.comments': '{count} 条评论',
			'status.open': '待处理',
			'status.in_progress': '进行中',
			'status.closed': '已完成',
			'status.blocked': '受阻',
			'status.deferred': '已推迟',
			'status.pinned': '已固定',
			'status.hooked': '已挂接',
			'status.ephemeral': '临时',
			'type.task': '任务',
			'type.bug': '缺陷',
			'type.feature': '功能',
			'type.epic': '史诗',
			'type.chore': '杂务',
			'type.decision': '决策',
			'type.spike': '调研',
			'type.story': '故事',
			'type.milestone': '里程碑',
			'priority.short': 'P{level}',
			'priority.label': '优先级 {level}',
			'detail.label': '任务详情',
			'detail.description': '描述',
			'detail.notes': '备注',
			'detail.dependencies': '依赖',
			'detail.metadata': '元数据',
			'detail.field.assignee': '负责人',
			'detail.field.owner': '所有者',
			'detail.field.created': '创建时间',
			'detail.field.updated': '更新时间',
			'detail.field.closed': '关闭时间',
			'detail.field.closeReason': '关闭原因',
			'detail.comments': '评论',
			'detail.comments.empty': '还没有评论。',
			'action.claim': '领取',
			'action.close': '关闭',
			'action.cancel': '取消',
			'action.confirmClose': '确认关闭',
			'action.working': '处理中…',
			'close.reason': '关闭原因（可选）',
			'close.reasonPlaceholder': '完成了什么？',
			'create.title': '新建任务',
			'create.titleLabel': '标题',
			'create.titlePlaceholder': '需要做什么？',
			'create.priority': '优先级',
			'create.type': '类型',
			'create.submit': '创建',
			'create.cancel': '取消',
			'create.titleRequired': '请输入标题。',
			'notice.created': '任务已创建。',
			'notice.claimed': '任务已领取。',
			'notice.closed': '任务已关闭。',
			'error.title': '无法加载该工作区',
			'error.unknown': '出了点问题。',
			'error.hint': '提示',
			'time.locale': 'zh-CN'
		};

		const en = {
			'panel': 'Beads',
			'title': 'Beads',
			'subtitle': 'Dependency-aware issue graph',
			'workspace': 'Workspace',
			'workspaceEmpty': 'No workspace is registered yet. Open a workspace first.',
			'refresh': 'Refresh',
			'new': 'New bead',
			'loading': 'Loading…',
			'retry': 'Retry',
			'bdMissing': 'The bd command was not found.',
			'bdMissingHint': 'Install the Beads CLI, then refresh this panel:',
			'notInitializedTitle': 'This workspace is not a Beads project yet',
			'notInitializedHint': 'Run this in the workspace, then refresh:',
			'project': 'Project',
			'count.open': 'open',
			'count.ready': 'ready',
			'count.in_progress': 'in progress',
			'count.blocked': 'blocked',
			'count.closed': 'closed',
			'filter.label': 'Filter beads',
			'filter.ready': 'Ready',
			'filter.in_progress': 'In progress',
			'filter.open': 'Open',
			'filter.all': 'All',
			'empty.ready': 'Nothing is ready. Every open bead is blocked or already in progress.',
			'empty.in_progress': 'No bead is in progress.',
			'empty.open': 'No open bead.',
			'empty.all': 'No bead in this workspace.',
			'empty.new': 'Create a bead',
			'list.label': 'Beads',
			'row.meta.blockedBy': 'blocked by {count}',
			'row.meta.blocks': 'blocks {count}',
			'row.meta.comments': '{count} comments',
			'status.open': 'Open',
			'status.in_progress': 'In progress',
			'status.closed': 'Closed',
			'status.blocked': 'Blocked',
			'status.deferred': 'Deferred',
			'status.pinned': 'Pinned',
			'status.hooked': 'Hooked',
			'status.ephemeral': 'Ephemeral',
			'type.task': 'Task',
			'type.bug': 'Bug',
			'type.feature': 'Feature',
			'type.epic': 'Epic',
			'type.chore': 'Chore',
			'type.decision': 'Decision',
			'type.spike': 'Spike',
			'type.story': 'Story',
			'type.milestone': 'Milestone',
			'priority.short': 'P{level}',
			'priority.label': 'Priority {level}',
			'detail.label': 'Bead details',
			'detail.description': 'Description',
			'detail.notes': 'Notes',
			'detail.dependencies': 'Dependencies',
			'detail.metadata': 'Metadata',
			'detail.field.assignee': 'Assignee',
			'detail.field.owner': 'Owner',
			'detail.field.created': 'Created',
			'detail.field.updated': 'Updated',
			'detail.field.closed': 'Closed',
			'detail.field.closeReason': 'Close reason',
			'detail.comments': 'Comments',
			'detail.comments.empty': 'No comments yet.',
			'action.claim': 'Claim',
			'action.close': 'Close',
			'action.cancel': 'Cancel',
			'action.confirmClose': 'Close bead',
			'action.working': 'Working…',
			'close.reason': 'Reason (optional)',
			'close.reasonPlaceholder': 'What was done?',
			'create.title': 'New bead',
			'create.titleLabel': 'Title',
			'create.titlePlaceholder': 'What needs doing?',
			'create.priority': 'Priority',
			'create.type': 'Type',
			'create.submit': 'Create',
			'create.cancel': 'Cancel',
			'create.titleRequired': 'Enter a title.',
			'notice.created': 'Bead created.',
			'notice.claimed': 'Bead claimed.',
			'notice.closed': 'Bead closed.',
			'error.title': 'The panel could not load this workspace',
			'error.unknown': 'Something went wrong.',
			'error.hint': 'Hint',
			'time.locale': 'en'
		};

		const CSS = [
			'.dshBeads-page{width:100%;height:100%;min-height:0;display:flex;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:14px;line-height:1.6}',
			'.dshBeads-scroll{flex:1;min-height:0;overflow:auto}',
			'.dshBeads-content{max-width:960px;margin:0 auto;padding:0 clamp(20px,4vw,48px) 48px}',
			'.dshBeads-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:28px;margin-bottom:18px}',
			'[data-platform=darwin] .dshBeads-heading{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}',
			'.dshBeads-headingText{min-width:0}',
			'.dshBeads-title{margin:0;font-size:20px;font-weight:500;line-height:28px}',
			'.dshBeads-subtitle{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;word-break:break-all}',
			'.dshBeads-headActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshBeads-button{appearance:none;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);border-radius:16px;height:32px;padding:0 12px;font:inherit;font-size:13px;line-height:20px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer}',
			'.dshBeads-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
			'.dshBeads-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
			'.dshBeads-button:disabled{opacity:.5;cursor:default}',
			'.dshBeads-buttonPrimary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}',
			'.dshBeads-buttonPrimary:hover{background:var(--dsw-alias-button-primary-hover)}',
			'.dshBeads-buttonSmall{height:28px;padding:0 10px;font-size:13px}',
			'.dshBeads-select{appearance:none;border:.5px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);border-radius:16px;height:32px;padding:0 26px 0 12px;font:inherit;font-size:13px;max-width:min(320px,52vw);cursor:pointer;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 15px) 14px,calc(100% - 11px) 14px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}',
			'.dshBeads-select:hover{background-color:var(--dsw-alias-interactive-bg-hover)}',
			'.dshBeads-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
			'.dshBeads-overview{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;margin-bottom:18px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dshBeads-chip{border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;padding:2px 8px;white-space:nowrap}',
			'.dshBeads-count{color:var(--dsw-alias-label-secondary);white-space:nowrap}',
			'.dshBeads-count strong{color:var(--dsw-alias-label-primary);font-weight:500;margin-right:3px}',
			'.dshBeads-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
			'.dshBeads-filterTab{height:28px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:14px;padding:0 10px;font:inherit;font-size:14px;line-height:22px;cursor:pointer;white-space:nowrap}',
			'.dshBeads-filterTab:hover{background:var(--dsw-alias-interactive-bg-hover)}',
			'.dshBeads-filterTab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
			'.dshBeads-filterTabActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.dshBeads-filtersSpacer{flex:1}',
			'.dshBeads-notice{margin:0 0 12px;color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px}',
			'.dshBeads-banner{display:flex;flex-direction:column;align-items:flex-start;gap:10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:20px;margin-top:8px}',
			'.dshBeads-banner h2{margin:0;font-size:15px;font-weight:500;line-height:22px}',
			'.dshBeads-banner p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}',
			'.dshBeads-bannerHint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dshBeads-code{display:block;width:100%;box-sizing:border-box;border-radius:8px;background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-primary);padding:8px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:18px;overflow-x:auto;white-space:pre}',
			'.dshBeads-errorText{margin:0;color:var(--dsw-alias-label-error);font-size:13px;line-height:20px}',
			'.dshBeads-listRows{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:0}',
			'.dshBeads-row{display:flex;align-items:flex-start;gap:12px;width:100%;box-sizing:border-box;border:0;border-radius:12px;background:transparent;color:inherit;text-align:left;padding:8px;font:inherit;cursor:pointer}',
			'.dshBeads-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
			'.dshBeads-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
			'.dshBeads-rowExpanded{background:var(--dsw-alias-interactive-bg-hover)}',
			'.dshBeads-priority{flex:none;min-width:28px;height:20px;border-radius:10px;padding:0 6px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;line-height:20px;border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
			'.dshBeads-priority0{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
			'.dshBeads-priority1{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}',
			'.dshBeads-rowBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
			'.dshBeads-rowTitle{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
			'.dshBeads-rowClosed .dshBeads-rowTitle{color:var(--dsw-alias-label-secondary);text-decoration:line-through}',
			'.dshBeads-rowMeta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;display:flex;gap:8px;flex-wrap:wrap}',
			'.dshBeads-status{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:22px;white-space:nowrap}',
			'.dshBeads-statusInProgress{color:var(--dsw-alias-state-business-primary)}',
			'.dshBeads-statusClosed{color:var(--dsw-alias-label-dimmed)}',
			'.dshBeads-detail{margin:2px 0 10px 48px;border-left:1px solid var(--dsw-alias-border-l1);padding:6px 0 6px 16px;display:flex;flex-direction:column;gap:14px}',
			'.dshBeads-detailSection{display:flex;flex-direction:column;gap:4px}',
			'.dshBeads-detailHeading{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:500;line-height:18px}',
			'.dshBeads-prose{margin:0;color:var(--dsw-alias-label-primary);font-size:13px;line-height:21px;white-space:pre-wrap;overflow-wrap:anywhere}',
			'.dshBeads-metaGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 16px;margin:0}',
			'.dshBeads-metaItem{min-width:0}',
			'.dshBeads-metaLabel{display:block;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
			'.dshBeads-metaValue{display:block;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
			'.dshBeads-dependency{display:flex;align-items:baseline;gap:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);flex-wrap:wrap}',
			'.dshBeads-dependencyType{color:var(--dsw-alias-label-tertiary)}',
			'.dshBeads-comment{border-left:2px solid var(--dsw-alias-border-l1);padding-left:10px;display:flex;flex-direction:column;gap:1px}',
			'.dshBeads-commentMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
			'.dshBeads-commentText{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;white-space:pre-wrap;overflow-wrap:anywhere}',
			'.dshBeads-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshBeads-closeForm{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshBeads-input{box-sizing:border-box;min-width:0;flex:1 1 180px;height:30px;border:.5px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);padding:0 10px;font:inherit;font-size:13px}',
			'.dshBeads-input::placeholder{color:var(--dsw-alias-label-caption)}',
			'.dshBeads-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
			'.dshBeads-error{margin:0;color:var(--dsw-alias-label-error);font-size:12px;line-height:18px}',
			'.dshBeads-createForm{display:flex;flex-direction:column;gap:10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:16px;margin-bottom:16px}',
			'.dshBeads-createRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshBeads-createLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;min-width:44px}',
			'.dshBeads-loading{margin:8px 0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
			'.dshBeads-emptyTitle{margin:0;font-size:15px;font-weight:500;line-height:22px}',
			'.dshBeads-visuallyHidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}'
		].join('');

		/* ------------------------------------------------------------------ */
		/* Domain helpers                                                      */
		/* ------------------------------------------------------------------ */

		/** Beads priorities are 0 (highest) through 4. */
		const PRIORITIES = [0, 1, 2, 3, 4];
		/** Issue types offered by the create form. */
		const CREATE_TYPES = ['task', 'bug', 'feature', 'epic', 'chore', 'decision', 'spike', 'story', 'milestone'];
		/** Panel list filters, in display order. */
		const FILTERS = ['ready', 'in_progress', 'open', 'all'];

		/** Request failure carrying the endpoint's business code and hint. */
		class PanelRequestError extends Error {
			constructor(message, code, hint) {
				super(message);
				this.name = 'PanelRequestError';
				this.code = code;
				this.hint = hint;
			}
		}

		/**
		 * Call one Host panel action.
		 * @param action - one of status, issues, issue, create, claim, close.
		 * @param options - query parameters, JSON body, and abort signal.
		 * @returns the action's `value` from the Host half.
		 */
		async function request(action, options = {}) {
			const search = new URLSearchParams({ action });
			for (const [key, value] of Object.entries(options.params ?? {})) search.set(key, String(value));
			const init = { method: options.body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: options.signal };
			if (options.body !== undefined) {
				init.headers = { 'content-type': 'application/json' };
				init.body = JSON.stringify(options.body);
			}
			let response;
			try {
				response = await fetch(`${API_PATH}?${search.toString()}`, init);
			} catch (error) {
				if (options.signal?.aborted === true) throw error;
				throw new PanelRequestError('The Beads panel could not reach the Harness Host.', 'network');
			}
			if (response.status === 401 || response.status === 403) throw new PanelRequestError('The Beads panel request was not authorized.', 'unauthorized');
			if (!response.ok) throw new PanelRequestError(`The Beads panel request failed (HTTP ${response.status}).`, 'http');
			let payload;
			try {
				payload = await response.json();
			} catch {
				throw new PanelRequestError('The Beads panel received an unreadable response.', 'invalid-response');
			}
			if (payload?.ok === true) return payload.value;
			const failure = payload?.error ?? {};
			throw new PanelRequestError(
				typeof failure.message === 'string' && failure.message !== '' ? failure.message : 'The Beads panel request failed.',
				typeof failure.code === 'string' ? failure.code : 'failed',
				typeof failure.hint === 'string' ? failure.hint : undefined
			);
		}

		/** Translate an enum value through a namespace, falling back to the raw value. */
		function labelOf(t, prefix, value) {
			if (typeof value !== 'string' || value === '') return '';
			const key = `${prefix}.${value}`;
			const translated = t(key);
			return translated === key ? value : translated;
		}

		/** Relative timestamp using the panel's locale. */
		function relativeTime(value, locale) {
			const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
			if (!Number.isFinite(time)) return '';
			const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
			const seconds = Math.round((time - Date.now()) / 1000);
			const units = [
				['year', 31_536_000],
				['month', 2_592_000],
				['week', 604_800],
				['day', 86_400],
				['hour', 3_600],
				['minute', 60]
			];
			for (const [unit, size] of units) {
				if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
			}
			return format.format(seconds, 'second');
		}

		/** Absolute timestamp for detail metadata. */
		function absoluteTime(value, locale) {
			const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
			if (!Number.isFinite(time)) return '';
			return new Date(time).toLocaleString(locale);
		}

		/** Filesystem basename that tolerates both separators. */
		function basename(path) {
			if (typeof path !== 'string' || path === '') return '';
			const parts = path.split(/[/\\]/u).filter((part) => part !== '');
			return parts.length === 0 ? path : parts[parts.length - 1];
		}

		/** Workspace id of one snapshot item. */
		function workspaceIdOf(workspace) {
			return typeof workspace?.workspaceId === 'string' ? workspace.workspaceId : typeof workspace?.id === 'string' ? workspace.id : undefined;
		}

		/** Read the remembered workspace id, tolerating unavailable storage. */
		function readStoredWorkspace() {
			try {
				return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? undefined;
			} catch {
				return undefined;
			}
		}

		/** Persist the inspected workspace id, tolerating unavailable storage. */
		function storeWorkspace(workspaceId) {
			try {
				window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
			} catch {
				// A private window without storage still shows the panel.
			}
		}

		/* ------------------------------------------------------------------ */
		/* Presentation                                                        */
		/* ------------------------------------------------------------------ */

		/** Sidebar icon: three beads joined by two links, drawn in the row's color. */
		function BeadsIcon({ size }) {
			const edge = typeof size === 'number' && size > 0 ? size : 18;
			return h(
				'svg',
				{
					width: edge,
					height: edge,
					viewBox: '0 0 20 20',
					fill: 'none',
					'aria-hidden': true,
					focusable: false,
					style: { display: 'block' }
				},
				h('path', {
					d: 'M8.6 14.2 9.6 7.2M11.6 6.6 14.2 10.9',
					stroke: 'currentColor',
					strokeWidth: 1.5,
					strokeLinecap: 'round'
				}),
				h('circle', { cx: 10, cy: 5.4, r: 2.5, stroke: 'currentColor', strokeWidth: 1.5 }),
				h('circle', { cx: 6.5, cy: 15.4, r: 2.1, stroke: 'currentColor', strokeWidth: 1.5 }),
				h('circle', { cx: 15.2, cy: 12.6, r: 1.9, stroke: 'currentColor', strokeWidth: 1.5 })
			);
		}

		/** One button in the panel's button family. */
		function PanelButton({ children, primary = false, small = false, ...rest }) {
			const className = ['dshBeads-button', primary && 'dshBeads-buttonPrimary', small && 'dshBeads-buttonSmall'].filter(Boolean).join(' ');
			return h('button', { type: 'button', className, ...rest }, children);
		}

		/** Translucent "loading" line used before the first payload arrives. */
		function LoadingLine({ label }) {
			return h('p', { className: 'dshBeads-loading', role: 'status' }, label);
		}

		/** The panel's full-page failure with a retry action. */
		function ErrorBanner({ t, error, onRetry }) {
			return h(
				'div',
				{ className: 'dshBeads-banner', role: 'alert' },
				h('h2', null, t('error.title')),
				h('p', { className: 'dshBeads-errorText' }, error?.message ?? t('error.unknown')),
				error?.hint !== undefined && h('p', { className: 'dshBeads-bannerHint' }, `${t('error.hint')}: ${error.hint}`),
				h(PanelButton, { onClick: onRetry }, t('retry'))
			);
		}

		/** The create form shown above the list. */
		function CreateForm({ t, busy, error, onSubmit, onCancel }) {
			const [title, setTitle] = React.useState('');
			const [priority, setPriority] = React.useState(2);
			const [issueType, setIssueType] = React.useState('task');
			const [localError, setLocalError] = React.useState(null);
			const submit = (event) => {
				event.preventDefault();
				const trimmed = title.trim();
				if (trimmed === '') {
					setLocalError(t('create.titleRequired'));
					return;
				}
				setLocalError(null);
				onSubmit({ title: trimmed, priority, issueType });
			};
			return h(
				'form',
				{ className: 'dshBeads-createForm', onSubmit: submit, 'aria-label': t('create.title') },
				h(
					'div',
					{ className: 'dshBeads-createRow' },
					h('label', { className: 'dshBeads-createLabel', htmlFor: 'dshBeads-create-title' }, t('create.titleLabel')),
					h('input', {
						id: 'dshBeads-create-title',
						className: 'dshBeads-input',
						type: 'text',
						value: title,
						maxLength: 240,
						placeholder: t('create.titlePlaceholder'),
						onChange: (event) => setTitle(event.target.value),
						autoFocus: true
					})
				),
				h(
					'div',
					{ className: 'dshBeads-createRow' },
					h('span', { className: 'dshBeads-createLabel' }, t('create.priority')),
					h(
						'select',
						{
							className: 'dshBeads-select',
							value: String(priority),
							onChange: (event) => setPriority(Number(event.target.value)),
							'aria-label': t('create.priority')
						},
						PRIORITIES.map((level) => h('option', { key: level, value: String(level) }, `P${level}`))
					),
					h('span', { className: 'dshBeads-createLabel' }, t('create.type')),
					h(
						'select',
						{
							className: 'dshBeads-select',
							value: issueType,
							onChange: (event) => setIssueType(event.target.value),
							'aria-label': t('create.type')
						},
						CREATE_TYPES.map((type) => h('option', { key: type, value: type }, labelOf(t, 'type', type)))
					)
				),
				h(
					'div',
					{ className: 'dshBeads-actions' },
					h(PanelButton, { primary: true, type: 'submit', disabled: busy }, busy ? t('action.working') : t('create.submit')),
					h(PanelButton, { onClick: onCancel, disabled: busy }, t('create.cancel'))
				),
				localError !== null && h('p', { className: 'dshBeads-error', role: 'alert' }, localError),
				error !== null && h('p', { className: 'dshBeads-error', role: 'alert' }, error.message)
			);
		}

		/** One expanded bead: prose, dependencies, metadata, comments, and actions. */
		function IssueDetail({ t, state, busy, error, onClaim, onClose, onRetry }) {
			const [closing, setClosing] = React.useState(false);
			const [reason, setReason] = React.useState('');
			React.useEffect(() => {
				setClosing(false);
				setReason('');
			}, [state.phase === 'ready' ? state.value.issue.id : state.phase]);
			if (state.phase === 'loading') return h('div', { className: 'dshBeads-detail' }, h(LoadingLine, { label: t('loading') }));
			if (state.phase === 'error') {
				return h(
					'div',
					{ className: 'dshBeads-detail', role: 'alert' },
					h('p', { className: 'dshBeads-error' }, state.error?.message ?? t('error.unknown')),
					h(PanelButton, { small: true, onClick: onRetry }, t('retry'))
				);
			}
			if (state.phase !== 'ready') return null;
			const issue = state.value.issue;
			const comments = Array.isArray(state.value.comments) ? state.value.comments : [];
			const dependencies = Array.isArray(issue.dependencies) ? issue.dependencies : [];
			const closed = issue.status === 'closed';
			const locale = t('time.locale');
			const metadata = [
				['detail.field.assignee', issue.assignee],
				['detail.field.owner', issue.owner],
				['detail.field.created', absoluteTime(issue.created_at, locale)],
				['detail.field.updated', absoluteTime(issue.updated_at, locale)],
				['detail.field.closed', absoluteTime(issue.closed_at, locale)],
				['detail.field.closeReason', issue.close_reason]
			].filter(([, value]) => typeof value === 'string' && value !== '');
			return h(
				'div',
				{ className: 'dshBeads-detail', role: 'region', 'aria-label': t('detail.label') },
				typeof issue.description === 'string' && issue.description !== ''
					? h(
							'div',
							{ className: 'dshBeads-detailSection' },
							h('h3', { className: 'dshBeads-detailHeading' }, t('detail.description')),
							h('p', { className: 'dshBeads-prose' }, issue.description)
						)
					: null,
				typeof issue.notes === 'string' && issue.notes !== ''
					? h(
							'div',
							{ className: 'dshBeads-detailSection' },
							h('h3', { className: 'dshBeads-detailHeading' }, t('detail.notes')),
							h('p', { className: 'dshBeads-prose' }, issue.notes)
						)
					: null,
				dependencies.length > 0
					? h(
							'div',
							{ className: 'dshBeads-detailSection' },
							h('h3', { className: 'dshBeads-detailHeading' }, t('detail.dependencies')),
							dependencies.map((dependency) =>
								h(
									'div',
									{ className: 'dshBeads-dependency', key: dependency.id },
									typeof dependency.dependency_type === 'string' && dependency.dependency_type !== ''
										? h('span', { className: 'dshBeads-dependencyType' }, dependency.dependency_type)
										: null,
									h('code', null, dependency.id),
									h('span', null, labelOf(t, 'status', dependency.status)),
									h('span', null, dependency.title ?? '')
								)
							)
						)
					: null,
				metadata.length > 0
					? h(
							'div',
							{ className: 'dshBeads-detailSection' },
							h('h3', { className: 'dshBeads-detailHeading' }, t('detail.metadata')),
							h(
								'dl',
								{ className: 'dshBeads-metaGrid' },
								metadata.map(([key, value]) =>
									h(
										'div',
										{ className: 'dshBeads-metaItem', key },
										h('dt', { className: 'dshBeads-metaLabel' }, t(key)),
										h('dd', { className: 'dshBeads-metaValue' }, value)
									)
								)
							)
						)
					: null,
				h(
					'div',
					{ className: 'dshBeads-detailSection' },
					h('h3', { className: 'dshBeads-detailHeading' }, t('detail.comments')),
					comments.length === 0
						? h('p', { className: 'dshBeads-bannerHint' }, t('detail.comments.empty'))
						: comments.map((comment, index) =>
								h(
									'div',
									{ className: 'dshBeads-comment', key: typeof comment.id === 'string' ? comment.id : String(index) },
									h('span', { className: 'dshBeads-commentMeta' }, `${comment.author ?? ''} · ${absoluteTime(comment.created_at, locale)}`),
									h('p', { className: 'dshBeads-commentText' }, comment.text ?? '')
								)
							)
				),
				error !== null && h('p', { className: 'dshBeads-error', role: 'alert' }, error.message),
				closed
					? null
					: closing
						? h(
								'div',
								{ className: 'dshBeads-closeForm' },
								h('input', {
									className: 'dshBeads-input',
									type: 'text',
									value: reason,
									maxLength: 500,
									placeholder: t('close.reasonPlaceholder'),
									'aria-label': t('close.reason'),
									onChange: (event) => setReason(event.target.value),
									autoFocus: true
								}),
								h(
									PanelButton,
									{
										primary: true,
										small: true,
										disabled: busy,
										onClick: () => onClose(reason)
									},
									busy ? t('action.working') : t('action.confirmClose')
								),
								h(
									PanelButton,
									{
										small: true,
										disabled: busy,
										onClick: () => {
											setClosing(false);
											setReason('');
										}
									},
									t('action.cancel')
								)
							)
						: h(
								'div',
								{ className: 'dshBeads-actions' },
								h(PanelButton, { small: true, disabled: busy, onClick: onClaim }, busy === 'claim' ? t('action.working') : t('action.claim')),
								h(PanelButton, { small: true, disabled: busy, onClick: () => setClosing(true) }, t('action.close'))
							)
			);
		}

		/**
		 * The main panel: workspace picker, project summary, filter tabs, issue
		 * list, and the create/detail/action surfaces.
		 */
		function BeadsPanel(props) {
			const { t } = props;
			const useWorkspaces = typeof props.useWorkspaces === 'function' ? props.useWorkspaces : useNoWorkspaces;
			const usePanelInfo = typeof props.usePanelInfo === 'function' ? props.usePanelInfo : useNoPanelInfo;
			const activePanelId = usePanelInfo((info) => info.activePanelId);
			const workspaces = useWorkspaces((state) => state.items);
			const workspaceList = Array.isArray(workspaces) ? workspaces : NO_WORKSPACES;
			const [rememberedWorkspaceId, setRememberedWorkspaceId] = React.useState(readStoredWorkspace);
			const [mode, setMode] = React.useState('ready');
			const [refreshToken, setRefreshToken] = React.useState(0);
			const [overview, setOverview] = React.useState({ phase: 'idle' });
			const [issuesState, setIssuesState] = React.useState({ phase: 'idle' });
			const [selectedIssueId, setSelectedIssueId] = React.useState(null);
			const [detail, setDetail] = React.useState({ phase: 'idle' });
			const [creating, setCreating] = React.useState(false);
			const [busy, setBusy] = React.useState(null);
			const [actionError, setActionError] = React.useState(null);
			const [notice, setNotice] = React.useState(null);

			const resolvedWorkspaceId = React.useMemo(() => {
				const ids = workspaceList.map(workspaceIdOf).filter((id) => typeof id === 'string');
				if (rememberedWorkspaceId !== undefined && ids.includes(rememberedWorkspaceId)) return rememberedWorkspaceId;
				return ids.length > 0 ? ids[0] : null;
			}, [workspaceList, rememberedWorkspaceId]);

			const activeWorkspace = React.useMemo(
				() => workspaceList.find((workspace) => workspaceIdOf(workspace) === resolvedWorkspaceId),
				[workspaceList, resolvedWorkspaceId]
			);

			React.useEffect(() => {
				if (resolvedWorkspaceId !== null) storeWorkspace(resolvedWorkspaceId);
			}, [resolvedWorkspaceId]);

			/** Re-read the workspace whenever the user switches back to this panel. */
			const panelIsActive = activePanelId === PANEL_ID;
			const wasActive = React.useRef(panelIsActive);
			React.useEffect(() => {
				if (panelIsActive && !wasActive.current) setRefreshToken((value) => value + 1);
				wasActive.current = panelIsActive;
			}, [panelIsActive]);

			React.useEffect(() => {
				if (notice === null) return undefined;
				const timer = window.setTimeout(() => setNotice(null), 3_000);
				return () => window.clearTimeout(timer);
			}, [notice]);

			const initialized = overview.phase === 'ready' && overview.value?.project?.initialized === true;
			const workspacePath = typeof activeWorkspace?.path === 'string' ? activeWorkspace.path : '';

			React.useEffect(() => {
				if (resolvedWorkspaceId === null) {
					setOverview({ phase: 'idle' });
					return undefined;
				}
				const controller = new AbortController();
				let active = true;
				setOverview({ phase: 'loading' });
				request('status', { params: { workspaceId: resolvedWorkspaceId }, signal: controller.signal })
					.then((value) => {
						if (active) setOverview({ phase: 'ready', value });
					})
					.catch((error) => {
						if (active && !controller.signal.aborted) setOverview({ phase: 'error', error });
					});
				return () => {
					active = false;
					controller.abort();
				};
			}, [resolvedWorkspaceId, refreshToken]);

			React.useEffect(() => {
				if (resolvedWorkspaceId === null || !initialized) {
					setIssuesState({ phase: 'idle' });
					return undefined;
				}
				const controller = new AbortController();
				let active = true;
				setIssuesState({ phase: 'loading' });
				request('issues', {
					params: { workspaceId: resolvedWorkspaceId, mode },
					signal: controller.signal
				})
					.then((value) => {
						if (active) setIssuesState({ phase: 'ready', value });
					})
					.catch((error) => {
						if (active && !controller.signal.aborted) setIssuesState({ phase: 'error', error });
					});
				return () => {
					active = false;
					controller.abort();
				};
			}, [resolvedWorkspaceId, mode, refreshToken, initialized]);

			React.useEffect(() => {
				if (resolvedWorkspaceId === null || selectedIssueId === null || !initialized) {
					setDetail({ phase: 'idle' });
					return undefined;
				}
				const controller = new AbortController();
				let active = true;
				setDetail({ phase: 'loading' });
				request('issue', {
					params: { workspaceId: resolvedWorkspaceId, id: selectedIssueId },
					signal: controller.signal
				})
					.then((value) => {
						if (active) setDetail({ phase: 'ready', value });
					})
					.catch((error) => {
						if (active && !controller.signal.aborted) setDetail({ phase: 'error', error });
					});
				return () => {
					active = false;
					controller.abort();
				};
			}, [resolvedWorkspaceId, selectedIssueId, refreshToken, initialized]);

			/** A bead that left the current filter no longer has an expanded row. */
			React.useEffect(() => {
				if (issuesState.phase !== 'ready' || selectedIssueId === null) return;
				const listed = Array.isArray(issuesState.value?.issues) ? issuesState.value.issues : [];
				if (!listed.some((issue) => issue.id === selectedIssueId)) setSelectedIssueId(null);
			}, [issuesState, selectedIssueId]);

			const refresh = React.useCallback(() => setRefreshToken((value) => value + 1), []);

			const runAction = async (name, fallbackNotice, operation) => {
				setBusy(name);
				setActionError(null);
				try {
					await operation();
					setRefreshToken((value) => value + 1);
					if (fallbackNotice !== null) setNotice(fallbackNotice);
					return true;
				} catch (error) {
					setActionError(error instanceof PanelRequestError ? error : new PanelRequestError(t('error.unknown'), 'unknown'));
					return false;
				} finally {
					setBusy(null);
				}
			};

			const claim = (id) =>
				runAction('claim', t('notice.claimed'), () =>
					request('claim', { body: { workspaceId: resolvedWorkspaceId, id } })
				);

			const close = (id, reason) =>
				runAction('close', t('notice.closed'), () =>
					request('close', { body: { workspaceId: resolvedWorkspaceId, id, reason } })
				).then((closed) => {
					if (closed) setSelectedIssueId(null);
				});

			const create = async (draft) => {
				const created = await runAction('create', t('notice.created'), () =>
					request('create', { body: { workspaceId: resolvedWorkspaceId, title: draft.title, priority: draft.priority, issueType: draft.issueType } })
				);
				if (created) setCreating(false);
			};

			const closeCreate = () => {
				setCreating(false);
				setActionError(null);
			};

			const toggleIssue = (id) => {
				setActionError(null);
				setSelectedIssueId((current) => (current === id ? null : id));
			};

			const listValue = issuesState.phase === 'ready' ? issuesState.value : undefined;
			const issues = Array.isArray(listValue?.issues) ? listValue.issues : [];
			const counts = overview.phase === 'ready' ? overview.value?.counts : null;
			const project = overview.phase === 'ready' ? overview.value?.project : undefined;
			const bd = overview.phase === 'ready' ? overview.value?.bd : undefined;
			const bdMissing = overview.phase === 'ready' && bd?.available === false;

			const countItems = counts
				? [
						['count.open', counts.open_issues],
						['count.ready', counts.ready_issues],
						['count.in_progress', counts.in_progress_issues],
						['count.closed', counts.closed_issues]
					].filter(([, value]) => typeof value === 'number')
				: [];

			const workspaceSelect =
				workspaceList.length > 1
					? h(
							'select',
							{
								className: 'dshBeads-select',
								'aria-label': t('workspace'),
								value: resolvedWorkspaceId ?? '',
								onChange: (event) => {
									setRememberedWorkspaceId(event.target.value);
									setSelectedIssueId(null);
								}
							},
							workspaceList.map((workspace) => {
								const id = workspaceIdOf(workspace);
								const title = typeof workspace?.title === 'string' && workspace.title !== '' ? workspace.title : basename(workspace?.path);
								return h('option', { key: id, value: id }, title === '' ? id : title);
							})
						)
					: null;

			let body;
			if (workspaceList.length === 0) {
				body = h('div', { className: 'dshBeads-banner' }, h('h2', null, t('workspace')), h('p', null, t('workspaceEmpty')));
			} else if (overview.phase === 'loading' || overview.phase === 'idle') {
				body = h(LoadingLine, { label: t('loading') });
			} else if (overview.phase === 'error') {
				body = h(ErrorBanner, { t, error: overview.error, onRetry: refresh });
			} else if (bdMissing) {
				body = h(
					'div',
					{ className: 'dshBeads-banner', role: 'status' },
					h('h2', null, t('bdMissing')),
					h('p', null, t('bdMissingHint')),
					h('code', { className: 'dshBeads-code' }, 'curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash')
				);
			} else if (project?.initialized !== true) {
				body = h(
					'div',
					{ className: 'dshBeads-banner', role: 'status' },
					h('h2', null, t('notInitializedTitle')),
					h('p', null, t('notInitializedHint')),
					h('code', { className: 'dshBeads-code' }, 'bd init'),
					project?.problem?.message !== undefined && h('p', { className: 'dshBeads-bannerHint' }, project.problem.message)
				);
			} else if (issuesState.phase === 'loading' || issuesState.phase === 'idle') {
				body = h(LoadingLine, { label: t('loading') });
			} else if (issuesState.phase === 'error') {
				body = h(ErrorBanner, { t, error: issuesState.error, onRetry: refresh });
			} else if (issues.length === 0) {
				body = h(
					'div',
					{ className: 'dshBeads-banner', role: 'status' },
					h('h2', { className: 'dshBeads-emptyTitle' }, t(`empty.${mode}`)),
					h(PanelButton, { onClick: () => setCreating(true) }, t('empty.new'))
				);
			} else {
				body = h(
					'ul',
					{ className: 'dshBeads-listRows', 'aria-label': t('list.label'), 'aria-busy': issuesState.phase === 'loading' },
					issues.map((issue) => {
						const expanded = selectedIssueId === issue.id;
						const meta = [
							h('span', { key: 'id' }, issue.id),
							typeof issue.issue_type === 'string' && issue.issue_type !== '' ? h('span', { key: 'type' }, labelOf(t, 'type', issue.issue_type)) : null,
							typeof issue.updated_at === 'string' ? h('span', { key: 'updated' }, relativeTime(issue.updated_at, t('time.locale'))) : null,
							typeof issue.dependency_count === 'number' && issue.dependency_count > 0
								? h('span', { key: 'blocked' }, t('row.meta.blockedBy', { count: issue.dependency_count }))
								: null,
							typeof issue.dependent_count === 'number' && issue.dependent_count > 0
								? h('span', { key: 'blocks' }, t('row.meta.blocks', { count: issue.dependent_count }))
								: null,
							typeof issue.comment_count === 'number' && issue.comment_count > 0
								? h('span', { key: 'comments' }, t('row.meta.comments', { count: issue.comment_count }))
								: null
						].filter((item) => item !== null);
						return h(
							'li',
							{ key: issue.id },
							h(
								'button',
								{
									type: 'button',
									className: `dshBeads-row${expanded ? ' dshBeads-rowExpanded' : ''}${issue.status === 'closed' ? ' dshBeads-rowClosed' : ''}`,
									'aria-expanded': expanded,
									'aria-controls': expanded ? `dshBeads-detail-${issue.id}` : undefined,
									'aria-label': issue.title ?? issue.id,
									onClick: () => toggleIssue(issue.id)
								},
								h(
									'span',
									{
										className: `dshBeads-priority${typeof issue.priority === 'number' ? ` dshBeads-priority${issue.priority}` : ''}`,
										title: t('priority.label', { level: issue.priority })
									},
									t('priority.short', { level: issue.priority })
								),
								h(
									'span',
									{ className: 'dshBeads-rowBody' },
									h('span', { className: 'dshBeads-rowTitle' }, issue.title ?? issue.id),
									h('span', { className: 'dshBeads-rowMeta' }, meta)
								),
								h('span', { className: `dshBeads-status dshBeads-status${issue.status === 'in_progress' ? 'InProgress' : issue.status === 'closed' ? 'Closed' : 'Open'}` }, labelOf(t, 'status', issue.status))
							),
							expanded
								? h(
										'div',
										{ id: `dshBeads-detail-${issue.id}`, key: 'detail' },
										h(IssueDetail, {
											t,
											state: detail,
											busy: busy,
											error: actionError,
											onClaim: () => claim(issue.id),
											onClose: (reason) => close(issue.id, reason),
											onRetry: refresh
										})
									)
								: null
						);
					})
				);
			}

			return h(
				'section',
				{ className: 'dshBeads-page', 'aria-label': t('panel') },
				h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
				h(
					'div',
					{ className: 'dshBeads-scroll' },
					h(
						'div',
						{ className: 'dshBeads-content' },
						h(
							'div',
							{ className: 'dshBeads-heading' },
							h(
								'div',
								{ className: 'dshBeads-headingText' },
								h('h1', { className: 'dshBeads-title' }, t('title')),
								h('p', { className: 'dshBeads-subtitle' }, workspacePath !== '' ? workspacePath : t('subtitle'))
							),
							h(
								'div',
								{ className: 'dshBeads-headActions' },
								workspaceSelect,
								initialized ? h(PanelButton, { onClick: () => setCreating((value) => !value), disabled: busy !== null }, t('new')) : null,
								h(PanelButton, { onClick: refresh, disabled: overview.phase === 'loading' }, t('refresh'))
							)
						),
						overview.phase === 'ready' && project?.initialized === true
							? h(
									'div',
									{ className: 'dshBeads-overview' },
									typeof bd?.version === 'string' && bd.version !== '' ? h('span', { className: 'dshBeads-chip' }, bd.version) : null,
									typeof project.prefix === 'string' && project.prefix !== ''
										? h('span', { className: 'dshBeads-chip' }, `${t('project')}: ${project.prefix}`)
										: null,
									typeof project.mode === 'string' && project.mode !== '' ? h('span', { className: 'dshBeads-chip' }, project.mode) : null,
									countItems.map(([key, value]) =>
										h('span', { className: 'dshBeads-count', key }, h('strong', null, String(value)), t(key))
									)
								)
							: null,
						h(
							'div',
							{ className: 'dshBeads-filters', role: 'group', 'aria-label': t('filter.label') },
							FILTERS.map((value) =>
								h(
									'button',
									{
										key: value,
										type: 'button',
										className: `dshBeads-filterTab${mode === value ? ' dshBeads-filterTabActive' : ''}`,
										'aria-pressed': mode === value,
										onClick: () => {
											setMode(value);
											setSelectedIssueId(null);
										}
									},
									t(`filter.${value}`)
								)
							)
						),
						notice !== null ? h('p', { className: 'dshBeads-notice', role: 'status' }, notice) : null,
						creating ? h(CreateForm, { t, busy: busy === 'create', error: actionError, onSubmit: create, onCancel: closeCreate }) : null,
						body
					)
				)
			);
		}

		/** Hook fallback used only when a composition has no workspace snapshot. */
		function useNoWorkspaces() {
			return NO_WORKSPACES;
		}

		/** Hook fallback used only when a composition has no panel-info face. */
		function useNoPanelInfo() {
			return undefined;
		}

		/* ------------------------------------------------------------------ */
		/* Plugin body                                                         */
		/* ------------------------------------------------------------------ */

		return {
			inject: ['slots', 'locale'],
			apply(ctx) {
				const t = ctx.locale.bind(NS);
				ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'beads-panel: dictionaries');
				ctx.slots.inject('sidebar.panellist', () =>
					ctx.slots.register(
						{
							name: 'sidebar.panellist',
							id: PANEL_ID,
							order: 20,
							locale: NS,
							label: () => t('panel')
						},
						BeadsIcon
					)
				);
				ctx.slots.inject('main', () =>
					ctx.slots.register(
						{
							name: 'main',
							key: PANEL_ID,
							locale: NS
						},
						BeadsPanel
					)
				);
			}
		};
	}
});
