
export interface SshCredentials {
    host: string;
    port: number;
    username: string;
    password: string;
}

export interface InspectionResult {
    results: Record<string, Record<string, string>>;
    error?: string;
}

export type ProgressUpdate = {
    deviceId: string;
    progress: number;
    status?: 'pending' | 'inspecting' | 'success' | 'failed';
    // FIX: Changed type to allow for structured log objects (ParsedResult) in addition to strings.
    log?: Record<string, Record<string, any>>;
    taskId?: string;
};

export type ProgressCallback = (update: Partial<ProgressUpdate>) => void;