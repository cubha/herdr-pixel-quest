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

const ROLES = { pane: Pane, spaces: Spaces, agents: Agents, tabs: Tabs, chrome: Chrome, status: Status, menu: Menu, newmenu: NewMenu, quest: Quest, party: Party, sill: Sill };

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
