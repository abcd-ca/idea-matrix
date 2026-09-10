import { DocumentError } from "@idea-matrix/core";
import { i18n } from "./i18n";

/**
 * Core's messages are English; the translations key off the error code (the
 * `documentError` block of the `core` namespace) and fall back to core's own
 * sentence, which is how en-CA always reads. `values` fills placeholders
 * such as {{allowed}}.
 */
export function explainDocumentError(e: DocumentError): string {
  return i18n.t(`documentError.${e.code}`, { ns: "core", defaultValue: e.message, ...e.values });
}
