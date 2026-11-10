import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import { canonicalRedirect } from "../lib/canonical-host";
import { asComingSoonResponse, shouldShowComingSoon } from "../lib/coming-soon";
import { indexingAllowed } from "../lib/site";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

let warnedMissingSiteUrl = false;

/** Adds `X-Robots-Tag: noindex, nofollow` to every response unless this host is the production address. */
function withIndexingHeader(response: Response, request: Request, env: Cloudflare.Env): Response {
  if (indexingAllowed(new URL(request.url).host, env) || response.headers.has("X-Robots-Tag")) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    return Promise.resolve(route(request, env, ctx)).then((response) => withIndexingHeader(response, request, env));
  },
};

function route(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>): Response | Promise<Response> {
  if (!warnedMissingSiteUrl && !env.SITE_URL && env.PREVIEW_DEMO !== "1") {
    warnedMissingSiteUrl = true;
    // Without SITE_URL there is no canonical, hreflang, og:image or JSON-LD. Set it where the Worker is deployed.
    console.warn("SITE_URL is not set: canonical, hreflang, og:image and structured data are switched off.");
  }
  const redirect = canonicalRedirect(request.url, env as { SITE_URL?: string; REDIRECT_HOSTS?: string });
  if (redirect) return redirect;
  if (shouldShowComingSoon(request.url, request.headers.get("cookie"), env as { COMING_SOON?: string })) {
    const url = new URL(request.url);
    url.pathname = "/coming-soon";
    url.search = "";
    return runWithConnectorBinding(ctx.props?.CONNECTORS, () => handler.fetch(new Request(url, { headers: request.headers }), env, ctx)).then(asComingSoonResponse);
  }
  let binding = ctx.props?.CONNECTORS;
  // Local preview emulates the same request-scoped capability. This branch and
  // the auxiliary service binding are absent from production builds.
  if (import.meta.env.DEV && !binding && env.CONNECTORS) {
    const preview = env.CONNECTORS;
    const expiresAt = Date.now() + 60_000;
    binding = {
      async getContext() {
        if (Date.now() >= expiresAt) return { status: "request_context_expired" };
        return preview.getContext?.() ?? { status: "binding_unavailable" };
      },
      async invoke(connectorId, actionName, args) {
        if (Date.now() >= expiresAt) {
          return { status: "request_context_expired", message: "This request has expired. Please try again." };
        }
        return preview.invoke(connectorId, actionName, args);
      },
    };
  }
  return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
}
