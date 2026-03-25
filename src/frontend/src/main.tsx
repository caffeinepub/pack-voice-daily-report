import { Auth0Provider } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN, Auth0Guard } from "./Auth0Guard";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

// Determine the redirect URI (works on Netlify, ICP, and local)
const redirectUri = window.location.origin;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Auth0Provider
    domain={AUTH0_DOMAIN}
    clientId={AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: redirectUri,
    }}
  >
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <Auth0Guard>
          <App />
        </Auth0Guard>
      </InternetIdentityProvider>
    </QueryClientProvider>
  </Auth0Provider>,
);
