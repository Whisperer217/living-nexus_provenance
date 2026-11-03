import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HarmonicBar } from "./platform";

afterEach(cleanup);

function getRange(): HTMLInputElement {
  return screen.getByRole("slider", { name: "Playback progress" }) as HTMLInputElement;
}

describe("HarmonicBar", () => {
  it("is reached through normal Tab navigation as the single native control", async () => {
    const user = userEvent.setup();
    render(<HarmonicBar progress={0.5} onSeek={vi.fn()} />);

    await user.tab();
    expect(document.activeElement).toBe(getRange());
  });

  it("preserves fractional controlled precision and emits the same normalized native value", () => {
    const onSeek = vi.fn();
    render(<HarmonicBar progress={0.3817} duration={100} onSeek={onSeek} />);

    const range = getRange();
    expect(range.step).toBe("any");
    expect(range.value).toBe("38.17");

    fireEvent.change(range, { target: { value: "38.18" } });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenLastCalledWith(0.3818);
  });

  it.each([
    [Number.NaN, "0"],
    [Number.POSITIVE_INFINITY, "0"],
    [Number.NEGATIVE_INFINITY, "0"],
    [-0.2, "0"],
    [1.4, "100"],
  ])("normalizes unsafe progress %p", (progress, expectedValue) => {
    render(<HarmonicBar progress={progress} onSeek={vi.fn()} />);
    expect(getRange().value).toBe(expectedValue);
  });

  it.each([
    ["ArrowRight", 0.51],
    ["ArrowUp", 0.51],
    ["ArrowLeft", 0.49],
    ["ArrowDown", 0.49],
    ["PageUp", 0.6],
    ["PageDown", 0.4],
    ["Home", 0],
    ["End", 1],
  ])("emits exactly one normalized value for %s", (key, expected) => {
    const onSeek = vi.fn();
    render(<HarmonicBar progress={0.5} onSeek={onSeek} />);

    fireEvent.keyDown(getRange(), { key });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenLastCalledWith(expected);
  });

  it("does not emit a duplicate callback at a clamped keyboard boundary", () => {
    const onSeek = vi.fn();
    render(<HarmonicBar progress={0} onSeek={onSeek} />);

    fireEvent.keyDown(getRange(), { key: "ArrowLeft" });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("derives one truthful spoken time value from interactive progress and duration", () => {
    render(<HarmonicBar progress={0.375} currentTime={0} duration={240} showTime onSeek={vi.fn()} />);

    const range = getRange();
    expect(range.getAttribute("aria-valuetext")).toBe("1 minute 30 seconds of 4 minutes");
    expect(screen.getByText("1:30").closest("div")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("announces a rounded percentage when the interactive duration is unavailable", () => {
    render(<HarmonicBar progress={0.3817} duration={Number.NaN} onSeek={vi.fn()} />);
    expect(getRange().getAttribute("aria-valuetext")).toBe("38% playback progress");
  });

  it("keeps static bars visual-only and free of slider semantics", () => {
    const { container } = render(<HarmonicBar progress={0.65} showTime currentTime={65} duration={120} />);

    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.querySelector("input[type='range']")).toBeNull();
    expect(container.querySelector("[role='slider']")).toBeNull();
    expect(screen.getByText("1:05")).not.toBeNull();
  });

  it("keeps decorative interactive layers out of the accessibility tree and retains the focus-ring contract", () => {
    const { container } = render(<HarmonicBar progress={0.5} onSeek={vi.fn()} />);

    expect(container.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".peer-focus-visible\\:opacity-100")).not.toBeNull();
    expect(getRange().className).toContain("opacity-0");
  });
});
