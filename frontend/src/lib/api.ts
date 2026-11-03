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

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  provider?: string;
  model?: string;
  routing_mode?: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  conversation_id?: string;
  preferred_provider?: "auto" | "gemini" | "openai";
}

export interface ChatResponse {
  reply: string;
  provider: string;
  model: string;
  timestamp: string;
  conversation_id?: string;
  routing_mode?: string;
}

export interface ProviderInfo {
  provider: string;
  configured: boolean;
  model: string;
  status: string;
  tier: string;
  cost_estimate: string;
}

export interface ProviderStatusResponse {
  active_mode: string;
  providers: Record<string, ProviderInfo>;
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

/**
 * Send chat message to Friday backend API.
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  conversationId?: string,
  preferredProvider?: "auto" | "gemini" | "openai"
): Promise<ChatResponse> {
  const payload: ChatRequest = {
    message,
    history,
    conversation_id: conversationId,
    preferred_provider: preferredProvider,
  };

  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = Array.isArray(errJson.detail)
          ? errJson.detail.map((d: { msg?: string }) => d.msg || "").join(", ")
          : String(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Chat error (${errorDetail})`);
  }

  return response.json();
}

/**
 * Fetch status of all configured AI providers.
 */
export async function getProviderStatus(): Promise<ProviderStatusResponse> {
  const response = await fetch(`${BACKEND_URL}/api/providers/status`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch provider status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch comparative benchmark metrics between Gemini and OpenAI.
 */
export async function getProviderBenchmark(): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/providers/benchmark`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to run benchmark: ${response.statusText}`);
  }

  return response.json();
}
