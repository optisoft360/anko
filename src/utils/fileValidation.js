// Client-side document upload policy. The backend (api/services/file_validation.py)
// is the real authority; this only gives users fast, clear feedback.
//
// Config (Vite env):
//   VITE_UPLOAD_ALLOWED_EXTENSIONS  default "pdf,docx,xlsx,pptx,txt,md,markdown"
//   VITE_UPLOAD_MAX_MB              default 400

const DEFAULT_EXTENSIONS = "pdf,docx,xlsx,pptx,txt,md,markdown";

export const ALLOWED_EXTENSIONS = (import.meta.env.VITE_UPLOAD_ALLOWED_EXTENSIONS || DEFAULT_EXTENSIONS)
  .split(",")
  .map((e) => e.trim().toLowerCase().replace(/^\./, ""))
  .filter(Boolean);

export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_UPLOAD_MAX_MB) || 400;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Value for <input accept> and Uppy's allowedFileTypes.
export const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");
export const UPLOAD_ALLOWED_FILE_TYPES = ALLOWED_EXTENSIONS.map((e) => `.${e}`);

// Human label of the allowed formats, e.g. "PDF, DOCX, XLSX, PPTX, TXT, MD" (help texts use this).
export const UPLOAD_FORMATS_LABEL = ALLOWED_EXTENSIONS
  .filter((e) => e !== "markdown")
  .map((e) => e.toUpperCase())
  .join(", ");

// Rejected even as an inner extension ("manual.pdf.exe").
const DANGEROUS_EXTENSIONS = new Set([
  "exe", "com", "scr", "pif", "msi", "msp", "dll", "sys", "bat", "cmd", "ps1", "vbs", "vbe",
  "js", "jse", "mjs", "wsf", "hta", "sh", "bash", "app", "dmg", "pkg", "deb", "rpm", "bin",
  "jar", "apk", "lnk", "reg", "html", "htm", "xhtml", "svg", "svgz", "php", "py",
  "docm", "xlsm", "pptm",
]);

/**
 * Checks a File by name and size (the browser-reported MIME type is ignored on purpose).
 * Returns null when valid, or "type" | "size".
 */
export function validateUploadFile(file) {
  const name = String(file?.name || "").trim().toLowerCase();
  const parts = name.split(".");
  if (parts.length < 2 || !parts[parts.length - 1]) return "type";
  const ext = parts[parts.length - 1];
  const inner = parts.slice(1, -1);
  if (DANGEROUS_EXTENSIONS.has(ext) || inner.some((p) => DANGEROUS_EXTENSIONS.has(p))) return "type";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "type";
  const size = Number(file?.size ?? file?.data?.size ?? 0);
  if (size > MAX_UPLOAD_BYTES) return "size";
  return null;
}

/** Translated message for a validateUploadFile() error code. */
export function uploadErrorMessage(code, t) {
  if (code === "size") return t("upload_validation.too_large", { mb: MAX_UPLOAD_MB });
  return t("upload_validation.unsupported", { formats: UPLOAD_FORMATS_LABEL });
}

/** Help text under upload zones, built from the same constants as the validation. */
export function uploadHelpText(t) {
  return t("upload_validation.note", { formats: UPLOAD_FORMATS_LABEL, mb: MAX_UPLOAD_MB });
}

/** Splits files into accepted ones and rejection messages ("name: reason"). */
export function partitionUploadFiles(files, t) {
  const accepted = [];
  const errors = [];
  for (const file of Array.from(files || [])) {
    const code = validateUploadFile(file);
    if (code) errors.push(`${file.name}: ${uploadErrorMessage(code, t)}`);
    else accepted.push(file);
  }
  return { accepted, errors };
}

/**
 * Applies the policy to an Uppy instance: restrictions (selected, dropped or pasted files)
 * plus a name check that also catches double extensions, with a translated message.
 */
export function applyUploadValidation(uppy, getT) {
  uppy.setOptions({
    restrictions: {
      ...uppy.opts.restrictions,
      maxFileSize: MAX_UPLOAD_BYTES,
      allowedFileTypes: UPLOAD_ALLOWED_FILE_TYPES,
    },
    onBeforeFileAdded: (currentFile) => {
      const code = validateUploadFile({ name: currentFile.name, size: currentFile.size ?? currentFile.data?.size });
      if (!code) return true;
      const t = getT();
      uppy.info(`${currentFile.name}: ${uploadErrorMessage(code, t)}`, "error", 6000);
      return false;
    },
  });
  return uppy;
}
