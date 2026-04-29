import { getStoredToken } from "@/lib/api/auth";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export interface WebLectureUploadResponse {
  url: string;
  folder: string;
}

export async function uploadWebLecture(
  file: File,
  onProgress?: (percent: number) => void
): Promise<WebLectureUploadResponse> {
  const url = `${API_BASE}/api/lectures/upload-web-lecture/`;
  const token = getStoredToken();

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as WebLectureUploadResponse);
      } else {
        let detail = "Upload failed";
        try {
          const err = JSON.parse(xhr.responseText);
          detail = err.detail || detail;
        } catch {
          /* ignore */
        }
        reject(new Error(detail));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", url);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}
