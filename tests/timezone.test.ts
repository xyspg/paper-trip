import { describe, expect, it } from "bun:test";
import {
  timezoneDisplayName,
  timezoneMatchesQuery,
  timezoneOptionsForValue,
} from "../src/admin/timezone";

describe("timezone combobox search", () => {
  it("matches IANA zones by region, city, spaces, or compact text", () => {
    expect(timezoneMatchesQuery("America/New_York", "America")).toBeTrue();
    expect(timezoneMatchesQuery("America/New_York", "New York")).toBeTrue();
    expect(timezoneMatchesQuery("America/New_York", "new_york")).toBeTrue();
    expect(timezoneMatchesQuery("America/New_York", "newyork")).toBeTrue();
  });

  it("does not return unrelated cities", () => {
    expect(timezoneMatchesQuery("America/New_York", "Tokyo")).toBeFalse();
  });

  it("renders underscores as readable spaces", () => {
    expect(timezoneDisplayName("America/Argentina/Buenos_Aires")).toBe(
      "America/Argentina/Buenos Aires",
    );
  });

  it("supports optional values without adding a blank item", () => {
    expect(timezoneOptionsForValue("")).not.toContain("");
  });

  it("preserves an unknown saved timezone as a selectable option", () => {
    expect(timezoneOptionsForValue("Legacy/Custom")[0]).toBe("Legacy/Custom");
  });
});
