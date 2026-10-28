import { describe, expect, it } from "vitest";
import { clientIp, readLimitedBody } from "@/lib/request";

const post = (body: BodyInit | null, headers: HeadersInit = {}) => new Request("https://example.com/", { method: "POST", body, headers });
const encode = (text: string) => new TextEncoder().encode(text);

function chunkedRequest(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
  });
  return new Request("https://example.com/", { method: "POST", body: stream, duplex: "half" } as RequestInit);
}

describe("readLimitedBody", () => {
  it("returns the body bytes when under the limit", async () => {
    const body = await readLimitedBody(post("hello"), 100);
    expect(new TextDecoder().decode(body!)).toBe("hello");
  });
  it("accepts a body of exactly the limit", async () => {
    expect(await readLimitedBody(post("12345"), 5)).toHaveLength(5);
  });
  it("returns null when content-length already exceeds the limit", async () => {
    expect(await readLimitedBody(post("hi", { "content-length": "999" }), 10)).toBeNull();
  });
  it("returns null when a chunked body exceeds the limit without content-length", async () => {
    const request = chunkedRequest([new Uint8Array(6), new Uint8Array(6)]);
    expect(request.headers.get("content-length")).toBeNull();
    expect(await readLimitedBody(request, 10)).toBeNull();
  });
  it("reassembles multiple chunks in order", async () => {
    const body = await readLimitedBody(chunkedRequest([encode("ab"), encode("cd")]), 10);
    expect(new TextDecoder().decode(body!)).toBe("abcd");
  });
  it("returns an empty array when there is no body", async () => {
    expect(await readLimitedBody(new Request("https://example.com/"), 10)).toHaveLength(0);
  });
});

describe("clientIp", () => {
  it("reads and trims cf-connecting-ip", () => {
    expect(clientIp(new Request("https://example.com/", { headers: { "cf-connecting-ip": " 1.2.3.4 " } }))).toBe("1.2.3.4");
  });
  it("is null when the header is missing or blank", () => {
    expect(clientIp(new Request("https://example.com/"))).toBeNull();
    expect(clientIp(new Request("https://example.com/", { headers: { "cf-connecting-ip": "  " } }))).toBeNull();
  });
});
