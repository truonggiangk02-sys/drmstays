import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import { canonicalRedirect } from "../lib/canonical-host";
import { asComingSoonResponse, shouldShowComingSoon } from "../lib/coming-soon";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
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
  },
};
