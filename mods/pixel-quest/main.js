// Pixel Quest: the "abyss inventory" pixel-art look for Herdr, one mod in roles.
// The layout and overlays give each copy props { role }:
//   chrome   the sidebar's brand bar (props.footer: its footer)
//   spaces   the spaces list          agents   the agents list
//   tabs     the tab bar               pane     a pane's header
//   status   the status bar (also watches agents for quest fanfares)
//   menu     right-click menus         newmenu  the + menu
//   quest    the "quest complete" banner overlay
//   party    the floating party drawer (agents at a glance)
//   sill     the stone ledge under the work area
//   usage    the Claude usage card (opens from the status bar gauges)
//   files    the file panel with name / content search
//   picker   the portrait picker (opens from an agent's portrait)
//   journal  the adventure log: levels, unlocks, looks, recent quests
//   changes  the git changes panel (beside 소지품)
//   settings the theme's settings window (the sidebar's 설정 button)
//   palette  the command palette (keys.json "pixel-quest.palette")
//   goto     "찾기": go to a tab, space or agent (the search button, "pixel-quest.goto")
//   confirm  "close it?" for closes started from the theme's own menus
//
// Roles adapted from Herdr's shipped mods are marked in their files
// (Apache-2.0, Herdr 0.1.14). Copyright (c) 2026 cubha. MIT License.

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Pane from "./roles/pane.js";
import Spaces from "./roles/spaces.js";
import Agents from "./roles/agents.js";
import Tabs from "./roles/tabs.js";
import Chrome from "./roles/chrome.js";
import Status from "./roles/status.js";
import Menu from "./roles/menu.js";
import NewMenu from "./roles/newmenu.js";
import Quest from "./roles/quest.js";
import Party from "./roles/party.js";
import Sill from "./roles/sill.js";
import Usage from "./roles/usage.js";
import Files from "./roles/files.js";
import Picker from "./roles/picker.js";
import Journal from "./roles/journal.js";
import Changes from "./roles/changes.js";
import Settings from "./roles/settings.js";
import Palette from "./roles/palette.js";
import Goto from "./roles/goto.js";
import Confirm from "./roles/confirm.js";

const ROLES = { pane: Pane, spaces: Spaces, agents: Agents, tabs: Tabs, chrome: Chrome, status: Status, menu: Menu, newmenu: NewMenu, quest: Quest, party: Party, sill: Sill, usage: Usage, files: Files, picker: Picker, journal: Journal, changes: Changes, settings: Settings, palette: Palette, confirm: Confirm, goto: Goto };

export default class PixelQuest extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role ?? (pr.tab ? "menu" : "")];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`pixel-quest: no role "${props()?.role}"`);
    return this.role.render(cx);
  }

  async close(cx) {
    await this.role?.close?.(cx);
  }
}
