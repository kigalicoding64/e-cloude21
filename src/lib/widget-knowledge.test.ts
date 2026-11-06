import { describe, it, expect } from "vitest";
import { htmlToText, sameSiteLinks, buildSystemPrompt } from "./widget-knowledge";

describe("widget knowledge", () => {
  it("strips scripts and tags", () => {
    expect(htmlToText("<p>Open 9-5</p><script>x()</script>")).toBe("Open 9-5");
  });
  it("keeps only same-site page links", () => {
    expect(sameSiteLinks('<a href="/about">a</a><a href="https://x.com/y">b</a><a href="/logo.png">c</a>', "https://shop.rw/")).toEqual(["https://shop.rw/about"]);
  });
  it("leaves instructions unchanged without knowledge", () => {
    expect(buildSystemPrompt("Be nice", "")).toBe("Be nice");
  });
  it("attaches knowledge to the instructions", () => {
    expect(buildSystemPrompt("Be nice", "Open 9-5")).toContain("Open 9-5");
  });
});
