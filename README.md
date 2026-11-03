# Beads panel for DeepSeek Harness

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that
puts [Beads](https://github.com/gastownhall/beads) into the Web GUI's left
sidebar panel list.

The panel works on a Harness workspace's Beads database (`bd`):

- **Ready / In progress / Open / All** filters over the workspace's beads.
- Inline detail for one bead: description, notes, dependencies, metadata, and comments.
- **New bead** form (title, priority, type).
- **Claim** and **Close** actions on the selected bead.
- Graceful states for "bd is not installed" and "this workspace is not a `bd init` project yet".

## About Beads

[Beads](https://github.com/gastownhall/beads) is a distributed, dependency-aware
issue tracker for AI agents, powered by Dolt. Agents use the `bd` CLI
(`bd ready`, `bd update --claim`, `bd close`) to keep a structured memory
instead of markdown TODO lists. This plugin reads and writes that same database;
it does not copy state anywhere.

## How it is built

| Half | File | Responsibility |
| --- | --- | --- |
| Host | `index.js` | Serves `GET/POST /__dsh_beads/api` (owner-authenticated). Resolves a registered workspace id through the Host workspace registry and runs one fixed `bd` invocation per action. |
| Client | `client.js` | Registers the `beads` entry in `sidebar.panellist` and the matching `main` panel. Renders the list, detail, and forms; every data operation goes through the Host half. |

The Browser half never runs a shell: a request can only select one of the closed
actions `status`, `issues`, `issue`, `create`, `claim`, and `close`, and only the
Host owns the workspace directory and the `bd` argument vectors.

## Install

Requires the Beads CLI (`bd`) on `PATH` (or set `BEADS_BIN`), for example:

```bash
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```

This repository is a local Harness bundle (not an npm package). Install its
directory from a Harness session with Full access:

```
plugin_manager action=install_bundle target=<absolute path to this checkout>
```

Then pick **Beads** in the left sidebar panel list. To remove it:

```
plugin_manager action=remove_bundle target=@local/dsh-beads-panel
```

## Use

- The panel inspects workspaces registered with the Harness, and remembers the
  last one you picked. Run `bd init` in the workspace to create its Beads
  database.
- `bd` is looked up through the Host subprocess service first, then
  `/opt/homebrew/bin/bd`, `/usr/local/bin/bd`, `~/.local/bin/bd`, and
  `/usr/bin/bd` (set `BEADS_BIN` to override).
- Write actions are queued because embedded Dolt allows one writer.
- The UI is localized (English and Simplified Chinese), uses only Harness theme
  tokens, and ships its own icon.

## License

MIT — see [LICENSE](LICENSE).
