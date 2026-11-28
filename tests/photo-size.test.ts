import { describe, expect, it } from "vitest";
import { fittedPhotoEdge, photoWithinLimit } from "../lib/photo-size";

describe("product photos shrink before they are saved", () => {
  it("keeps a small photo and shrinks a large one under the long edge", () => {
    expect(fittedPhotoEdge(800, 600, 960)).toEqual({ width: 800, height: 600 });
    expect(fittedPhotoEdge(4000, 3000, 960)).toEqual({ width: 960, height: 720 });
  });

  it("rejects a data url above the saved limit", () => {
    expect(photoWithinLimit("data:image/jpeg;base64,abc")).toBe(true);
    expect(photoWithinLimit(`data:${"a".repeat(400_000)}`)).toBe(false);
  });
});