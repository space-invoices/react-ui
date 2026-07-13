import { triggerBlobDownload } from "@/ui/lib/browser-download";

const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CSV_MIME_TYPE = "text/csv";

export const SPREADSHEET_EXPORT_MIME_TYPES = {
  xlsx: EXCEL_MIME_TYPE,
  csv: CSV_MIME_TYPE,
} as const;

type ExportFormat = keyof typeof SPREADSHEET_EXPORT_MIME_TYPES;

type DownloadExportFileOptions = {
  apiBaseUrl: string;
  path: string;
  query?: URLSearchParams | Record<string, string | undefined>;
  headers?: HeadersInit;
  fallbackFileName: string;
  format: ExportFormat;
};

function appendQueryParams(url: URL, query: URLSearchParams | Record<string, string | undefined>) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams();
  if (!(query instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, value);
      }
    }
  }

  for (const [key, value] of params) {
    url.searchParams.set(key, value);
  }
}

export function buildExportUrl(
  apiBaseUrl: string,
  path: string,
  query?: URLSearchParams | Record<string, string | undefined>,
) {
  if (!apiBaseUrl) {
    const params = new URLSearchParams();
    if (query) {
      if (query instanceof URLSearchParams) {
        for (const [key, value] of query) {
          params.set(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined) {
            params.set(key, value);
          }
        }
      }
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  }

  const url = new URL(path, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`);
  if (query) {
    appendQueryParams(url, query);
  }

  return url.toString();
}

function parseFilenameStar(value: string) {
  const match = value.match(/^[^']*'[^']*'(.*)$/);
  const encodedFilename = match?.[1] ?? value;
  try {
    return decodeURIComponent(encodedFilename);
  } catch {
    return encodedFilename;
  }
}

export function parseContentDispositionFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const filenameStarMatch = contentDisposition.match(/(?:^|;)\s*filename\*=([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    return parseFilenameStar(filenameStarMatch[1].trim().replace(/^"|"$/g, ""));
  }

  const filenameMatch = contentDisposition.match(/(?:^|;)\s*filename=(?:"([^"]+)"|([^;]+))/i);
  return filenameMatch?.[1] ?? filenameMatch?.[2]?.trim() ?? null;
}

async function parseErrorResponse(response: Response) {
  const contentType = response.headers?.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json") || "json" in response) {
    const body = await response.json().catch(() => null);
    if (body && typeof body === "object") {
      const message = "message" in body ? body.message : "error" in body ? body.error : null;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }

  return `Export failed: ${response.statusText || response.status}`;
}

function isRejectedContentType(contentType: string) {
  return contentType.includes("text/html") || contentType.includes("application/json");
}

async function looksLikeTextError(blob: Blob) {
  const prefix = await blob
    .slice(0, 512)
    .text()
    .catch(() => "");
  const trimmed = prefix.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.startsWith("{");
}

export async function downloadExportResponse(response: Response, fallbackFileName: string, format: ExportFormat) {
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const expectedContentType = SPREADSHEET_EXPORT_MIME_TYPES[format];
  if (isRejectedContentType(contentType) || (contentType && !contentType.includes(expectedContentType))) {
    throw new Error(`Unexpected export response type: ${contentType || "unknown"}`);
  }

  const blob = await response.blob();
  if (await looksLikeTextError(blob)) {
    throw new Error("Unexpected export response body; expected a spreadsheet file.");
  }

  const fileName = parseContentDispositionFilename(response.headers.get("content-disposition")) ?? fallbackFileName;
  triggerBlobDownload(blob, fileName);

  return fileName;
}

export async function downloadExportFile({
  apiBaseUrl,
  path,
  query,
  headers,
  fallbackFileName,
  format,
}: DownloadExportFileOptions) {
  const response = await fetch(buildExportUrl(apiBaseUrl, path, query), { headers });
  return downloadExportResponse(response, fallbackFileName, format);
}
