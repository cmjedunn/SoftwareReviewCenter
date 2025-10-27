// /app/client/src/hooks/useJobStatus.js
// WebSocket hook that matches your existing React patterns

import { useState, useEffect, useRef } from 'react';

export function useJobStatus(jobId) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    useEffect(() => {
        if (!jobId) {
            setStatus(null);
            setError(null);
            setIsConnected(false);
            return;
        }

        //console.log(`🔌 Connecting to WebSocket for job ${jobId}`);

        const connectWebSocket = () => {
            // Use same URL pattern as your existing backend calls
            const backend = import.meta.env.VITE_BACKEND_URL || "";
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = backend ? new URL(backend).host : window.location.host;
            const wsUrl = `${protocol}//${host}/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                //console.log('✅ WebSocket connected for job', jobId);
                setIsConnected(true);
                setError(null);

                // Subscribe to job updates
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    jobId: jobId
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'jobUpdate' && data.jobId === jobId) {
                        //console.log(`📊 Job ${jobId} update:`, data.status, `${data.progress}%`);

                        setStatus({
                            status: data.status,
                            progress: data.progress || 0,
                            position: data.position,
                            message: data.message,
                            result: data.result,
                            error: data.error,
                            updatedAt: new Date(data.updatedAt)
                        });

                        // Auto-cleanup completed/errored jobs after 5 seconds
                        if (data.status === 'completed' || data.status === 'error') {
                            setTimeout(() => {
                                //console.log(`🧹 Auto-cleaning job ${jobId} status`);
                                setStatus(null);
                                setIsConnected(false);
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.close();
                                }
                            }, 5000);
                        }
                    }
                } catch (err) {
                    console.error('❌ WebSocket message parse error:', err);
                    setError('Failed to parse status update');
                }
            };

            ws.onerror = (err) => {
                console.error('❌ WebSocket error for job', jobId, err);
                setError('Connection error');
                setIsConnected(false);
            };

            ws.onclose = (/**event**/) => {
                //console.log('🔌 WebSocket disconnected for job', jobId, event.code, event.reason);
                setIsConnected(false);

                // Auto-reconnect for active jobs (not completed/error)
                if (status?.status === 'queued' || status?.status === 'processing') {
                    //console.log('🔄 Reconnecting in 2 seconds...');
                    reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
                }
            };
        };

        connectWebSocket();

        // Cleanup on unmount or jobId change
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [jobId]);

    // Helper function to check if job is still active
    const isActive = status && (status.status === 'queued' || status.status === 'processing');

    return {
        status,
        error,
        isConnected,
        isActive
    };
}