import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "agents", label: "Agents" },
  { value: "instances", label: "Instances" },
] as const;

/** Give the scroller a layout jsdom does not compute: a 100px window onto a 300px
 * track of three 100px segments. */
function layOut(scroller: HTMLElement, scrollLeft = 0) {
  Object.defineProperties(scroller, {
    clientWidth: { value: 100 },
    scrollWidth: { value: 300 },
  });
  scroller.scrollLeft = scrollLeft;
  for (const [i, el] of screen.getAllByRole("radio").entries()) {
    Object.defineProperties(el, {
      offsetLeft: { value: i * 100 },
      offsetWidth: { value: 100 },
    });
  }
}

/** The scroller the radio group's track sits in: the group's parent. */
function groupScroller(): HTMLElement {
  const parent = screen.getByRole("radiogroup").parentElement;
  if (!parent) throw new Error("the radio group sits in no scroller");
  return parent;
}

describe("SegmentedControl", () => {
  it("is a radio group whose segments select their value", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={OPTIONS}
        value="dashboard"
        onChange={onChange}
        ariaLabel="gg panel"
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "gg panel" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dashboard" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Agents" }));
    expect(onChange).toHaveBeenCalledWith("agents");
    // The track sits in a scroller of its own, so a track wider than its space
    // scrolls rather than compressing its segments.
    expect(groupScroller()).not.toHaveAttribute("role");
  });

  it("scrolls a selection made off-screen into view", () => {
    const { rerender } = render(
      <SegmentedControl
        options={OPTIONS}
        value="dashboard"
        onChange={vi.fn()}
      />,
    );
    const track = groupScroller();
    layOut(track);
    rerender(
      <SegmentedControl
        options={OPTIONS}
        value="instances"
        onChange={vi.fn()}
      />,
    );
    expect(track.scrollLeft).toBe(200);
    // Fading the start edge says there are segments back the other way.
    fireEvent.scroll(track);
    expect(track).toHaveAttribute("data-overflow-start");
    expect(track).not.toHaveAttribute("data-overflow-end");
  });

  it("fades the end edge while segments lie past it", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="dashboard"
        onChange={vi.fn()}
      />,
    );
    const track = groupScroller();
    layOut(track);
    fireEvent.scroll(track);
    expect(track).toHaveAttribute("data-overflow-end");
    expect(track).not.toHaveAttribute("data-overflow-start");
  });
});
