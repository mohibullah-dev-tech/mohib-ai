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

// --- Milestone 4: Windows Computer Control Types ---

export interface SystemInfoResponse {
  os: string;
  os_release: string;
  os_version: string;
  machine: string;
  processor: string;
  cpu_cores: number;
  python_version: string;
  agent_status: string;
  binding: string;
  allowed_directories_count: number;
  pending_approvals_count: number;
  disk?: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent_used: number;
  };
  timestamp: string;
}

export interface AllowedDirectory {
  path: string;
  name: string;
  exists: boolean;
  files_count?: number;
  folders_count?: number;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  modified_at: string;
  is_text: boolean;
}

export interface ApprovalRequest {
  id: string;
  action_type: "read" | "write" | "destructive" | "execution";
  action_name: string;
  target: string;
  details: {
    operation?: string;
    diff?: string;
    content_preview?: string;
    raw_content?: string;
    command?: string;
    cwd?: string;
    explanation?: string;
    warning?: string;
    [key: string]: any;
  };
  risk_level: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  created_at: string;
  expires_at: string;
  approved_at?: string;
  executed_at?: string;
  result_message?: string;
}

export interface ActionAuditEntry {
  id: string;
  approval_id?: string;
  action_type: string;
  action_name: string;
  target: string;
  status: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface ProjectInspectionResponse {
  project_name: string;
  project_path: string;
  tech_stack: string[];
  key_files: Array<{
    relative_path: string;
    full_path: string;
    size_bytes: number;
  }>;
  tree: {
    name: string;
    path: string;
    is_dir: boolean;
    children?: any[];
  };
  summary_bn: string;
  summary_en: string;
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

// --- Milestone 4: Windows Computer Control API Client ---

export async function getSystemInfo(): Promise<SystemInfoResponse> {
  const response = await fetch(`${BACKEND_URL}/api/computer/system-info`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch system info");
  return response.json();
}

export async function getAllowedDirectories(): Promise<AllowedDirectory[]> {
  const response = await fetch(`${BACKEND_URL}/api/computer/allowed-dirs`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch allowed directories");
  return response.json();
}

export async function addAllowedDirectory(path: string): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/computer/allowed-dirs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to add allowed directory");
  }
  return response.json();
}

export async function removeAllowedDirectory(path: string): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/computer/allowed-dirs?path=${encodeURIComponent(path)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to remove allowed directory");
  return response.json();
}

export async function listDirectory(path?: string): Promise<FileEntry[]> {
  const url = path
    ? `${BACKEND_URL}/api/computer/files/list?path=${encodeURIComponent(path)}`
    : `${BACKEND_URL}/api/computer/files/list`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to list directory");
  }
  return response.json();
}

export async function searchFiles(query: string, path?: string): Promise<FileEntry[]> {
  let url = `${BACKEND_URL}/api/computer/files/search?query=${encodeURIComponent(query)}`;
  if (path) url += `&path=${encodeURIComponent(path)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to search files");
  return response.json();
}

export async function readTextFile(path: string): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/computer/files/read?path=${encodeURIComponent(path)}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to read file");
  }
  return response.json();
}

export async function getPendingActions(): Promise<ApprovalRequest[]> {
  const response = await fetch(`${BACKEND_URL}/api/computer/actions/pending`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch pending actions");
  return response.json();
}

export async function approveAction(approvalId: string): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/computer/actions/${approvalId}/approve`,
    { method: "POST" }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to approve action");
  }
  return response.json();
}

export async function rejectAction(approvalId: string, reason?: string): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/computer/actions/${approvalId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Rejected by user" }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to reject action");
  }
  return response.json();
}

export async function getActionHistory(): Promise<ActionAuditEntry[]> {
  const response = await fetch(`${BACKEND_URL}/api/computer/actions/history`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch action history");
  return response.json();
}

export async function inspectProject(projectPath?: string): Promise<ProjectInspectionResponse> {
  const response = await fetch(`${BACKEND_URL}/api/computer/inspect-project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_path: projectPath || null }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to inspect project");
  }
  return response.json();
}
