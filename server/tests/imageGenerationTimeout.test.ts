import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("../utils/storage", () => storage);
vi.mock("../_core/env", () => ({
  ENV: { forgeApiUrl: "https://forge.example/", forgeApiKey: "test-key" },
}));

import { generateImage, IMAGE_GENERATION_TIMEOUT_MS } from "../_core/imageGeneration";

describe("image generation request deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts a stalled provider request and creates no stored image", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted by caller")));
    })));

    const request = generateImage({ prompt: "A private cover concept", model: "MODEL_GPT_IMAGE_2" });
    const timeoutAssertion = expect(request).rejects.toThrow("Image generation timed out after 45 seconds");
    await vi.advanceTimersByTimeAsync(IMAGE_GENERATION_TIMEOUT_MS);

    await timeoutAssertion;
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("passes the server-selected model to the provider request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image: { b64Json: Buffer.from("image").toString("base64"), mimeType: "image/png" } }),
    }));
    storage.storagePut.mockResolvedValue({ url: "https://storage.example/generated.png" });

    await generateImage({ prompt: "A private cover concept", model: "MODEL_GPT_IMAGE_2" });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ model: "MODEL_GPT_IMAGE_2", prompt: "A private cover concept" });
  });
});
