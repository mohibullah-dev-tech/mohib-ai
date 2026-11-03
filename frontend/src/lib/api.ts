/**
 * API client to communicate with Friday FastAPI backend.
 */

export interface HealthDetails {
  environment: string;
  python_version: string;
  os: string;
  platform_release: string;
}

export interface HealthResponse {
  status: string;
  assistant: string;
  version: string;
  timestamp: string;
  details?: HealthDetails;
}

export interface AssistantInfoResponse {
  name: string;
  assistant_name: string;
  version: string;
  status: string;
  features: string[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * Fetch health status of the Friday backend service.
 */
export async function getBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BACKEND_URL}/api/health`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Backend health check failed with status ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch assistant metadata from backend.
 */
export async function getAssistantInfo(): Promise<AssistantInfoResponse> {
  const response = await fetch(`${BACKEND_URL}/api/info`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch assistant info: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
