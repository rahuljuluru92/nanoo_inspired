import { describe, expect, it } from "vitest";
import { CODE_RE, buildDestination, classifyUserAgent, refererHost, slug, visitorHash } from "./tracking";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("classifyUserAgent", () => {
  it("counts ordinary browsers as people", () => {
    expect(classifyUserAgent(CHROME)).toBe("human");
    expect(classifyUserAgent(IPHONE)).toBe("human");
  });

  it("never counts link unfurlers", () => {
    for (const ua of ["LinkedInBot/1.0 (compatible; Mozilla/5.0; +http://www.linkedin.com)", "Slackbot-LinkExpanding 1.0", "facebookexternalhit/1.1", "Twitterbot/1.0", "WhatsApp/2.23", "Mozilla/5.0 (compatible; Discordbot/2.0)"]) {
      expect(classifyUserAgent(ua)).toBe("preview");
    }
  });

  it("never counts crawlers, scripts and monitors", () => {
    for (const ua of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "curl/8.4.0", "python-requests/2.31", "Mozilla/5.0 HeadlessChrome/126.0", "UptimeRobot/2.0", "Go-http-client/2.0", "Mozilla/5.0 (compatible; bingbot/2.0)"]) {
      expect(classifyUserAgent(ua)).toBe("bot");
    }
  });

  it("treats a missing user agent as not a person", () => {
    expect(classifyUserAgent(null)).toBe("bot");
    expect(classifyUserAgent("")).toBe("bot");
  });
});

describe("visitorHash", () => {
  it("is stable within a day for the same visitor", () => {
    expect(visitorHash("1.2.3.4", CHROME, "2026-09-26", "s")).toBe(visitorHash("1.2.3.4", CHROME, "2026-09-26", "s"));
  });
  it("differs across visitors, days and secrets, and never contains the IP", () => {
    const a = visitorHash("1.2.3.4", CHROME, "2026-09-26", "s");
    expect(visitorHash("1.2.3.5", CHROME, "2026-09-26", "s")).not.toBe(a);
    expect(visitorHash("1.2.3.4", CHROME, "2026-09-27", "s")).not.toBe(a);
    expect(visitorHash("1.2.3.4", CHROME, "2026-09-26", "other")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("1.2.3.4");
  });
});

describe("buildDestination", () => {
  it("adds UTM parameters attributing the visit to the creator", () => {
    const u = new URL(buildDestination("https://halcyon.example/guide", "Launch Q4", "maya-okafor"));
    expect(u.searchParams.get("utm_source")).toBe("byline");
    expect(u.searchParams.get("utm_medium")).toBe("creator");
    expect(u.searchParams.get("utm_campaign")).toBe("launch-q4");
    expect(u.searchParams.get("utm_content")).toBe("maya-okafor");
  });
  it("keeps existing query parameters and never overrides the brand's own UTMs", () => {
    const u = new URL(buildDestination("https://x.example/p?ref=abc&utm_source=newsletter", "Q4", "h"));
    expect(u.searchParams.get("ref")).toBe("abc");
    expect(u.searchParams.get("utm_source")).toBe("newsletter");
    expect(u.searchParams.get("utm_medium")).toBe("creator");
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slug("Léa's Q4 Launch — 2026!")).toBe("lea-s-q4-launch-2026");
  });
  it("keeps only the referrer host", () => {
    expect(refererHost("https://www.linkedin.com/feed/update/urn:li:activity:1?x=1")).toBe("linkedin.com");
    expect(refererHost("not a url")).toBe("");
    expect(refererHost(null)).toBe("");
  });
  it("recognises valid tracking codes only", () => {
    expect(CODE_RE.test("k7x2m9pq")).toBe(true);
    expect(CODE_RE.test("K7X2M9PQ")).toBe(false);
    expect(CODE_RE.test("k7x2m9p")).toBe(false);
    expect(CODE_RE.test("k7x2m9p0")).toBe(false);
    expect(CODE_RE.test("k7x2m9pl")).toBe(false);
  });
});
