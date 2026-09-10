/** Public links. Empty strings hide the link in the UI until they are set. */
export const APP_NAME = "Idea Matrix";
export const APP_VERSION = "0.1.0";
export const SOURCE_URL = "https://github.com/abcd-ca/idea-matrix";
export const ISSUES_URL = "https://github.com/abcd-ca/idea-matrix/issues";
/** The commit this build was made from, set by next.config.ts at build time. */
export const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
export const VERIFY_DOCS_URL = `${SOURCE_URL}#verify-the-build`;
/** Who maintains the app; linked from Settings and the privacy page. */
export const MAINTAINER_NAME = "Andrew Blair";
export const MAINTAINER_URL = "https://abcd.ca";
export const MAINTAINER_LINKEDIN_URL = "https://www.linkedin.com/in/andrewblair";
export const RELEASES_URL = "https://github.com/abcd-ca/idea-matrix/releases";
export const MCP_DOCS_URL = "https://github.com/abcd-ca/idea-matrix/tree/main/packages/mcp";
export const MOM_TEST_URL = "https://www.momtestbook.com/";

/**
 * The paid build-planning sessions. One link for the offer as a whole (the
 * README and the privacy page) and one per tier. They live on abcd.ca, the
 * consulting business's own site, which redirects each one to its booking
 * page. Not on ideamatrix.io on purpose: when the app is installed, Chrome
 * opens links inside the app's origin in the app window, and a booking page
 * inside the Idea Matrix window is not what anyone wants. The app never
 * requests any of them; clicking is a plain navigation in a new tab. An empty
 * CONSULTING_URL hides the offer everywhere in the app. Each tier's name and
 * summary live under `consulting.tiers.<id>` in en-CA's common.json.
 */
export const CONSULTING_URL = "https://abcd.ca/sessions";
export interface ConsultingTier {
  id: string;
  url: string;
  minutes: number;
  /** The fixed price, shown on the tier so nobody has to click to find out. Null shows no price. */
  price: { amount: number; currency: string } | null;
}
export const CONSULTING_TIERS: readonly ConsultingTier[] = [
  { id: "call", url: "https://abcd.ca/sessions/call", minutes: 60, price: { amount: 450, currency: "CAD" } },
  { id: "plan", url: "https://abcd.ca/sessions/plan", minutes: 60, price: { amount: 1500, currency: "CAD" } },
];

/**
 * Google Drive. These identify the app to Google and are public by design:
 * they appear in the page source of any site that uses Google sign-in, and
 * the origin allowlist on Google's side is what stops anyone else using them.
 * Baked into the build as constants, not read from the environment, so the
 * export stays reproducible. Google Cloud project "Idea Matrix" (ideamatrix-io).
 */
export const GOOGLE_CLIENT_ID = "1062875410600-oigstnlk7q5komfl2atodnu6n10nnupk.apps.googleusercontent.com";
/** The Picker API key, restricted to the Picker API and to this site's referrers. A Picker key is meant to live in the page. */
export const GOOGLE_API_KEY = "AIzaSyAAjTgYf3j-qaGgn6pVvMPx987D_TLNgIk";
/** The Google Cloud project number, which the Picker needs so drive.file grants access to picked files. */
export const GOOGLE_APP_ID = "1062875410600";
