import { useState, useEffect, useRef } from 'react';

/**
 * 🔌 Custom hook for real-time job status updates
 * 
 * Usage:
 * const { status, error, isConnected } = useJobStatus(jobId);
 */
export function useJobStatus(jobId) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);

    useEffect(() => {
        if (!jobId) return;

        // Create WebSocket connection
        const wsUrl = `ws://${window.location.host}/ws`;
        console.log(`🔌 Connecting to WebSocket for job ${jobId}`);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
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
                    setStatus({
                        status: data.status,
                        progress: data.progress,
                        position: data.position,
                        message: data.message,
                        result: data.result,
                        error: data.error,
                        updatedAt: new Date(data.updatedAt)
                    });
                    
                    console.log(`📊 Job ${jobId} update:`, data.status, `${data.progress}%`);
                }
            } catch (err) {
                console.error('❌ WebSocket message parse error:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('❌ WebSocket error:', err);
            setError('WebSocket connection error');
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
        };

        // Cleanup on unmount or jobId change
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [jobId]);

    return { status, error, isConnected };
}

