// Pixel Quest stone sill: a ledge of lit stones under the work area, between
// the panes and the status bar (an 8px layout block).
//
// Copyright (c) 2026 cubha. MIT License (see the repository's LICENSE).

import { div } from "gpui-kit";
import { P, unit, texture } from "../kit.js";

export default class Sill {
  render() {
    const u = unit();
    return div().size_full().relative().overflow_hidden().bg(P.ink).child(texture(u, "sill", 2560, 8));
  }
}
