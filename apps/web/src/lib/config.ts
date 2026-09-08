/** Public links. Empty strings hide the link in the UI until they are set. */
export const APP_NAME = "Idea Matrix";
export const APP_VERSION = "0.1.0";
export const SOURCE_URL = "https://github.com/abcd-ca/idea-matrix";
export const ISSUES_URL = "https://github.com/abcd-ca/idea-matrix/issues";
/** The commit this build was made from, set by next.config.ts at build time. */
export const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
export const VERIFY_DOCS_URL = `${SOURCE_URL}#verify-the-build`;
