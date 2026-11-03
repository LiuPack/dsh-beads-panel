/**
 * Host half of the Beads panel bundle.
 *
 * It exposes one owner-only JSON endpoint on the local web server under
 * `/__dsh_beads/api`, and serves the panel by running the `bd` CLI (Beads) in a
 * registered workspace directory. The Browser half never touches the
 * filesystem or a shell: it asks this endpoint for the workspace's status, its
 * issue list, one issue's detail, and the explicit create/claim/close actions.
 *
 * Every value crossing the endpoint is JSON data. No request can choose an
 * arbitrary command line: the route maps one closed set of actions onto fixed
 * `bd` invocations, and the workspace id must resolve through the Host
 * workspace registry.
 *
 * @module @local/dsh-beads-panel
 */
import { execFile } from "node:child_process";
import { access, constants, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Route the Browser half fetches; exact match keeps it off the SPA fallback. */
export const ROUTE_PATH = "/__dsh_beads/api";

/** Host services this plugin needs before it can serve the panel. */
export const inject = ["webServer", "workspaceRegistry", "connection"];

/** Bound for one `bd` invocation; a hung Dolt lock must not pin the request. */
const BD_TIMEOUT_MS = 20_000;

/** Upper bound collected from one `bd` invocation (a large `bd list` JSON page). */
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

/** Upper bound for one request body (the panel only posts small JSON objects). */
const MAX_BODY_BYTES = 64 * 1024;

/** Issue ids are Beads hash ids; this also keeps a value from reading as a flag. */
const ISSUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Issue types `bd create --type` accepts. */
const ISSUE_TYPES = new Set(["task", "bug", "feature", "epic", "chore", "decision", "spike", "story", "milestone"]);

/** The panel's list filters, each mapped onto one fixed `bd` invocation. */
const LIST_MODES = new Map([
	["ready", ["ready", "--json"]],
	["in_progress", ["list", "--status", "in_progress", "--json"]],
	["open", ["list", "--status", "open", "--json"]],
	["all", ["list", "--all", "--json"]]
]);

/** Fields of one issue that the panel shows; keeps list payloads small and stable. */
const ISSUE_FIELDS = [
	"id",
	"title",
	"status",
	"priority",
	"issue_type",
	"assignee",
	"owner",
	"created_at",
	"updated_at",
	"started_at",
	"closed_at",
	"close_reason",
	"dependency_count",
	"dependent_count",
	"comment_count"
];

/**
 * Ambient environment minus credential-shaped names and Harness identity, the
 * same convention every Harness child process starts from. `PATH`, `HOME`,
 * locale, and proxy settings survive so `bd` runs normally.
 * @returns a fresh environment object safe to hand to `bd`.
 */
function childEnvironment() {
	const environment = {};
	for (const [name, value] of Object.entries(process.env)) {
		if (value === undefined) continue;
		if (/key|password|secret|token/i.test(name)) continue;
		if (name.toUpperCase().startsWith("DSH_")) continue;
		environment[name] = value;
	}
	return environment;
}

/**
 * Find the `bd` executable once per request: the Host subprocess service owns
 * the execution-world `PATH`, with a few conventional install locations as a
 * fallback for a Desktop Host whose process environment lacks the user shell's
 * `PATH`.
 * @param ctx - Host Context carrying the optional `subprocess` service.
 * @returns the absolute executable path, or `undefined` when `bd` is absent.
 */
export async function resolveBdExecutable(ctx) {
	const environment = childEnvironment();
	const subprocess = typeof ctx?.get === "function" ? ctx.get("subprocess") : undefined;
	if (typeof subprocess?.resolveExecutable === "function") {
		try {
			return await subprocess.resolveExecutable("bd", environment);
		} catch {
			// Fall through to the conventional locations below.
		}
	}
	const candidates = [
		process.env.BEADS_BIN,
		"/opt/homebrew/bin/bd",
		"/usr/local/bin/bd",
		join(homedir(), ".local", "bin", "bd"),
		"/usr/bin/bd"
	];
	for (const candidate of candidates) {
		if (typeof candidate !== "string" || candidate === "") continue;
		try {
			const info = await stat(candidate);
			if (!info.isFile()) continue;
			await access(candidate, constants.X_OK);
			return candidate;
		} catch {
			// Not this candidate.
		}
	}
	return undefined;
}

/**
 * Run one fixed `bd` invocation in `cwd`. Never rejects: an executor failure is
 * reported as an `ok: false` result so the route can answer with a business
 * failure instead of a transport error.
 * @param executable - absolute `bd` path.
 * @param args - fixed argument vector.
 * @param cwd - workspace directory.
 * @returns exit status plus bounded stdout/stderr text.
 */
export function runBd(executable, args, cwd) {
	return new Promise((resolve) => {
		execFile(
			executable,
			args,
			{
				cwd,
				env: childEnvironment(),
				timeout: BD_TIMEOUT_MS,
				maxBuffer: MAX_OUTPUT_BYTES,
				windowsHide: true,
				encoding: "utf8"
			},
			(error, stdout, stderr) => {
				const out = typeof stdout === "string" ? stdout : "";
				const err = typeof stderr === "string" ? stderr : "";
				if (error === null || error === undefined) {
					resolve({ ok: true, stdout: out, stderr: err });
					return;
				}
				resolve({
					ok: false,
					timedOut: error.killed === true || error.signal === "SIGTERM",
					code: typeof error.code === "number" ? error.code : error.code === undefined ? "spawn-failed" : String(error.code),
					message: error.message,
					stdout: out,
					stderr: err
				});
			}
		);
	});
}

/**
 * Parse JSON printed by `bd` without letting a warning prefix become an error.
 * @param text - stdout text.
 * @returns the parsed value, or `undefined` when the output is not JSON.
 */
function parseJsonText(text) {
	const trimmed = text.trim();
	if (trimmed === "") return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		return undefined;
	}
}

/** First line starting with `Error:` or `Hint:` in `bd` output. */
function bdLine(text, prefix) {
	for (const line of text.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (/^Error:/iu.test(trimmed) && prefix === "Error:") return trimmed;
		if (/^Hint:/iu.test(trimmed) && prefix === "Hint:") return trimmed;
	}
	return undefined;
}

/**
 * Translate one failed `bd` invocation into the panel's business-failure shape.
 * @param result - failed {@link runBd} result.
 * @returns a stable code, human message, and optional correcting hint.
 */
export function bdFailure(result) {
	const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
	if (/no beads database found/iu.test(output)) {
		return {
			code: "not-initialized",
			message: "This workspace has no Beads database yet.",
			hint: "Run `bd init` in the workspace, then refresh the panel."
		};
	}
	if (result.timedOut === true) {
		return {
			code: "timeout",
			message: "The bd command did not finish in time.",
			hint: "A long-running bd operation or a Dolt lock may be holding the database; try again."
		};
	}
	const message = bdLine(output, "Error:") ?? bdLine(output, "Hint:") ?? result.message ?? "The bd command failed.";
	return {
		code: "bd-failed",
		message: message.replace(/^Error:\s*/u, ""),
		hint: bdLine(output, "Hint:")?.replace(/^Hint:\s*/u, "")
	};
}

/** Project one `bd` issue object onto the fields the panel renders. */
function projectIssue(issue) {
	if (typeof issue !== "object" || issue === null) return undefined;
	const projected = {};
	for (const field of ISSUE_FIELDS) if (issue[field] !== undefined) projected[field] = issue[field];
	return projected;
}

/** Normalize `bd` JSON that is either one issue object or an array of them. */
function issuesOf(value) {
	if (Array.isArray(value)) return value.filter((item) => typeof item === "object" && item !== null);
	if (typeof value === "object" && value !== null) return [value];
	return [];
}

/**
 * Resolve a client-supplied workspace id through the Host registry. The id is
 * the only thing a request may pass; the directory it maps to is Host-owned.
 * @param ctx - Host Context with the workspace registry.
 * @param workspaceId - workspace id from the panel.
 * @returns the registered workspace directory, or an error value.
 */
function resolveWorkspacePath(ctx, workspaceId) {
	if (typeof workspaceId !== "string" || workspaceId === "") {
		return { error: { code: "invalid-workspace", message: "A workspace id is required." } };
	}
	const workspace = ctx.workspaceRegistry.get(workspaceId);
	if (workspace === undefined) {
		return { error: { code: "workspace-not-found", message: "That workspace is not registered with this Harness." } };
	}
	return { path: workspace.path };
}

/**
 * Read `bd` availability plus the workspace's project facts and summary counts.
 * A missing project is a normal state, not a failure: the panel renders the
 * initialization hint from it.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @returns `{ ok: true, value }` with `bd`, `project`, and `counts`.
 */
export async function readStatus(ctx, workspacePath) {
	const executable = await resolveBdExecutable(ctx);
	if (executable === undefined) {
		return { ok: true, value: { bd: { available: false }, project: { initialized: false }, counts: null } };
	}
	const version = await runBd(executable, ["version"], workspacePath);
	const versionText = version.ok ? (version.stdout.trim().split(/\r?\n/u)[0] ?? "") : "";
	const info = await runBd(executable, ["info", "--json"], workspacePath);
	const infoValue = info.ok ? parseJsonText(info.stdout) : undefined;
	const bd = { available: true, version: versionText };
	if (typeof infoValue !== "object" || infoValue === null) {
		const failure = info.ok ? { code: "invalid-output", message: "bd info did not return the expected JSON." } : bdFailure(info);
		return { ok: true, value: { bd, project: { initialized: false, problem: failure }, counts: null } };
	}
	const stats = await runBd(executable, ["stats", "--json"], workspacePath);
	const statsValue = stats.ok ? parseJsonText(stats.stdout) : undefined;
	const config = typeof infoValue.config === "object" && infoValue.config !== null ? infoValue.config : {};
	return {
		ok: true,
		value: {
			bd,
			project: {
				initialized: true,
				prefix: typeof config.issue_prefix === "string" ? config.issue_prefix : "",
				databasePath: typeof infoValue.database_path === "string" ? infoValue.database_path : "",
				mode: typeof infoValue.mode === "string" ? infoValue.mode : "",
				schemaVersion: typeof infoValue.schema_version === "number" ? infoValue.schema_version : null,
				issueCount: typeof infoValue.issue_count === "number" ? infoValue.issue_count : null
			},
			counts: typeof statsValue?.summary === "object" && statsValue.summary !== null ? statsValue.summary : null
		}
	};
}

/**
 * List issues for one panel filter.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @param mode - one key of {@link LIST_MODES}.
 * @returns `{ ok: true, value: { issues } }` or a business failure.
 */
export async function readIssues(ctx, workspacePath, mode) {
	const args = typeof mode === "string" ? LIST_MODES.get(mode) : undefined;
	if (args === undefined) return { ok: false, error: { code: "invalid-mode", message: "Unknown issue filter." } };
	const executable = await resolveBdExecutable(ctx);
	if (executable === undefined) {
		return { ok: false, error: { code: "bd-missing", message: "The bd command was not found on this machine." } };
	}
	const result = await runBd(executable, args, workspacePath);
	if (!result.ok) return { ok: false, error: bdFailure(result) };
	const value = parseJsonText(result.stdout);
	if (!Array.isArray(value)) {
		return { ok: false, error: { code: "invalid-output", message: "bd did not return the expected issue list." } };
	}
	return { ok: true, value: { issues: value.map(projectIssue).filter((issue) => issue !== undefined) } };
}

/**
 * Read one issue plus its comments.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @param id - issue id.
 * @returns `{ ok: true, value: { issue, comments } }` or a business failure.
 */
export async function readIssue(ctx, workspacePath, id) {
	if (typeof id !== "string" || !ISSUE_ID_PATTERN.test(id)) {
		return { ok: false, error: { code: "invalid-id", message: "That issue id is not valid." } };
	}
	const executable = await resolveBdExecutable(ctx);
	if (executable === undefined) {
		return { ok: false, error: { code: "bd-missing", message: "The bd command was not found on this machine." } };
	}
	const result = await runBd(executable, ["show", id, "--json"], workspacePath);
	if (!result.ok) return { ok: false, error: bdFailure(result) };
	const [issue] = issuesOf(parseJsonText(result.stdout));
	if (issue === undefined) {
		return { ok: false, error: { code: "issue-not-found", message: "That bead could not be read." } };
	}
	const commentsResult = await runBd(executable, ["comments", id, "--json"], workspacePath);
	const commentValues = commentsResult.ok ? parseJsonText(commentsResult.stdout) : undefined;
	return {
		ok: true,
		value: {
			issue,
			comments: Array.isArray(commentValues) ? commentValues.filter((comment) => typeof comment === "object" && comment !== null) : []
		}
	};
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The embedded Dolt database allows one writer, so write actions queue behind
 * one another instead of racing for the same lock.
 */
let mutationChain = Promise.resolve();

/** Queue one write action behind the previous one. */
function enqueueMutation(operation) {
	const next = mutationChain.then(operation, operation);
	mutationChain = next.then(
		() => undefined,
		() => undefined
	);
	return next;
}

/** Run one mutating `bd` invocation and return the written issue. */
async function runMutation(ctx, workspacePath, args) {
	const executable = await resolveBdExecutable(ctx);
	if (executable === undefined) {
		return { ok: false, error: { code: "bd-missing", message: "The bd command was not found on this machine." } };
	}
	return enqueueMutation(async () => {
		const result = await runBd(executable, args, workspacePath);
		if (!result.ok) return { ok: false, error: bdFailure(result) };
		const value = parseJsonText(result.stdout);
		const [issue] = issuesOf(value);
		return { ok: true, value: { issue: issue === undefined ? null : projectIssue(issue) ?? null } };
	});
}

/**
 * Create one bead from the panel's inline form.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @param request - validated title, priority, and type.
 * @returns `{ ok: true, value: { issue } }` or a business failure.
 */
export async function createIssue(ctx, workspacePath, request) {
	const title = typeof request?.title === "string" ? request.title.trim() : "";
	if (title === "" || title.length > 240) {
		return { ok: false, error: { code: "invalid-title", message: "A bead needs a title of 1 to 240 characters." } };
	}
	const priority = Number.isInteger(request?.priority) && request.priority >= 0 && request.priority <= 4 ? request.priority : 2;
	const issueType = typeof request?.issueType === "string" && ISSUE_TYPES.has(request.issueType) ? request.issueType : "task";
	return runMutation(ctx, workspacePath, ["create", title, "--json", "--priority", String(priority), "--type", issueType]);
}

/**
 * Atomically claim one bead for the local actor.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @param id - issue id.
 */
export async function claimIssue(ctx, workspacePath, id) {
	if (typeof id !== "string" || !ISSUE_ID_PATTERN.test(id)) {
		return { ok: false, error: { code: "invalid-id", message: "That issue id is not valid." } };
	}
	return runMutation(ctx, workspacePath, ["update", id, "--claim", "--json"]);
}

/**
 * Close one bead, recording the panel's optional reason.
 * @param ctx - Host Context.
 * @param workspacePath - workspace directory.
 * @param id - issue id.
 * @param reason - optional close reason.
 */
export async function closeIssue(ctx, workspacePath, id, reason) {
	if (typeof id !== "string" || !ISSUE_ID_PATTERN.test(id)) {
		return { ok: false, error: { code: "invalid-id", message: "That issue id is not valid." } };
	}
	const text = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
	return runMutation(ctx, workspacePath, text === "" ? ["close", id, "--json"] : ["close", id, "--json", "--reason", text]);
}

/* -------------------------------------------------------------------------- */
/* HTTP route                                                                  */
/* -------------------------------------------------------------------------- */

/** Write one JSON response; the handler owns the response lifetime. */
function sendJson(response, status, payload) {
	const body = JSON.stringify(payload);
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"content-length": String(Buffer.byteLength(body))
	});
	response.end(body);
}

/** Write one plain-text response (admission refusals and malformed requests). */
function sendText(response, status, text) {
	response.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
	response.end(text);
}

/**
 * Read a bounded JSON request body.
 * @param request - incoming request.
 * @returns the parsed value, or `undefined` when the body is absent, oversized, or not JSON.
 */
function readJsonBody(request) {
	return new Promise((resolve) => {
		const chunks = [];
		let size = 0;
		request.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				resolve(undefined);
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => {
			const text = Buffer.concat(chunks).toString("utf8").trim();
			if (text === "") {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(text));
			} catch {
				resolve(undefined);
			}
		});
		request.on("error", () => resolve(undefined));
	});
}

/** GET actions: each one is a read with no side effects. */
const GET_ACTIONS = new Set(["status", "issues", "issue"]);

/** POST actions: each one maps to one fixed write invocation. */
const POST_ACTIONS = new Set(["create", "claim", "close"]);

/**
 * Dispatch one panel request.
 * @param ctx - Host Context.
 * @param request - incoming request.
 * @param response - response owned by this handler.
 */
async function handleRequest(ctx, request, response) {
	const url = new URL(request.url ?? "/", "http://127.0.0.1");
	if (url.pathname !== ROUTE_PATH) {
		sendText(response, 404, "not found");
		return;
	}
	const action = url.searchParams.get("action") ?? "";
	const method = request.method ?? "GET";
	const read = GET_ACTIONS.has(action);
	const write = POST_ACTIONS.has(action);
	if (!read && !write) {
		sendJson(response, 400, { ok: false, error: { code: "unknown-action", message: "Unknown panel action." } });
		return;
	}
	if (read && method !== "GET") {
		sendJson(response, 405, { ok: false, error: { code: "method-not-allowed", message: "This action is a GET." } });
		return;
	}
	if (write && method !== "POST") {
		sendJson(response, 405, { ok: false, error: { code: "method-not-allowed", message: "This action is a POST." } });
		return;
	}
	const body = write ? await readJsonBody(request) : {};
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		sendJson(response, 400, { ok: false, error: { code: "invalid-body", message: "The request body must be a JSON object no larger than 64 KiB." } });
		return;
	}
	const workspaceId = read ? (url.searchParams.get("workspaceId") ?? "") : body.workspaceId;
	const resolved = resolveWorkspacePath(ctx, workspaceId);
	if (resolved.error !== undefined) {
		sendJson(response, 200, { ok: false, error: resolved.error });
		return;
	}
	const workspacePath = resolved.path;
	let result;
	if (action === "status") result = await readStatus(ctx, workspacePath);
	else if (action === "issues") result = await readIssues(ctx, workspacePath, url.searchParams.get("mode") ?? "ready");
	else if (action === "issue") result = await readIssue(ctx, workspacePath, url.searchParams.get("id") ?? "");
	else if (action === "create") result = await createIssue(ctx, workspacePath, body);
	else if (action === "claim") result = await claimIssue(ctx, workspacePath, body.id);
	else result = await closeIssue(ctx, workspacePath, body.id, body.reason);
	sendJson(response, 200, result);
}

/**
 * Host plugin body: register the panel's JSON route for the lifetime of this
 * plugin row. Requests are admitted by the Client Connection service, so the
 * endpoint answers only the page's own authenticated origin.
 * @param ctx - Host Context with the injected services.
 */
export function apply(ctx) {
	ctx.effect(
		() =>
			ctx.webServer.register({
				kind: "exact",
				path: ROUTE_PATH,
				handler: (request, response) => {
					const rejection = ctx.connection.requestRejection(request);
					if (rejection !== undefined) {
						sendText(response, rejection, rejection === 401 ? "unauthorized" : "forbidden");
						return;
					}
					handleRequest(ctx, request, response).catch((error) => {
						ctx.logger?.warn?.("beads-panel: request failed", error);
						if (response.headersSent) {
							response.destroy();
							return;
						}
						sendJson(response, 500, {
							ok: false,
							error: { code: "internal", message: error instanceof Error ? error.message : "The Beads panel request failed." }
						});
					});
				}
			}),
		"beads-panel: panel JSON route"
	);
}
