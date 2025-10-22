
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
    log?: Record<string, Record<string, string>>;
    taskId?: string;
};

export type ProgressCallback = (update: Partial<ProgressUpdate>) => void;
