// Pixel Quest season ledge: the 8px row over the work area where the season lies on
// its top edge (snow caps, petals, leaves), as the mockup has it. Nothing shows while
// the seasons are off or in a season with nothing on the edges.
//
// Copyright (c) 2026 cubha. MIT License (see the repository's LICENSE).

import { div } from "gpui-kit";
import { unit, seasonCap } from "../kit.js";

export default class Ledge {
  init(_p, cx) {
    // The season can turn at midnight or from the settings switch.
    cx.timer.every(60000, (cx) => cx.notify());
  }

  render() {
    const u = unit();
    // Inset like the work body (8px), so the caps sit on the frame and not past it.
    return div().size_full().px(u(8)).child(div().size_full().relative().overflow_hidden().child(seasonCap(u)));
  }
}
