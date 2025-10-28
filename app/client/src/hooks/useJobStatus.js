// Enhanced useJobStatus.js with aggressive reconnection and polling fallback

import { useState, useEffect, useRef } from 'react';

export function useJobStatus(jobId) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pollingTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10; // Try reconnecting up to 10 times

    useEffect(() => {
        if (!jobId) {
            setStatus(null);
            setError(null);
            setIsConnected(false);
            return;
        }

        //console.log(`🔌 Connecting to WebSocket for job ${jobId}`);
        reconnectAttemptsRef.current = 0;

        const connectWebSocket = () => {
            // Don't try reconnecting indefinitely
            if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                console.error(`❌ Max reconnect attempts (${maxReconnectAttempts}) reached for job ${jobId}. Falling back to polling.`);
                startPollingFallback();
                return;
            }

            const backend = import.meta.env.VITE_BACKEND_URL || "";
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = backend ? new URL(backend).host : window.location.host;
            const wsUrl = `${protocol}//${host}/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            let pingInterval;

            ws.onopen = () => {
                //console.log(`✅ WebSocket connected for job ${jobId} (attempt ${reconnectAttemptsRef.current + 1})`);
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0; // Reset on successful connection

                // Subscribe to job updates
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    jobId: jobId
                }));

                // Start aggressive keepalive ping every 20 seconds
                pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 20000);

                // Stop polling fallback if WebSocket connects
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                    pollingTimeoutRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle pong response
                    if (data.type === 'pong') {
                        //console.log('🏓 Keepalive pong received');
                        return;
                    }

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
                    }
                } catch (err) {
                    console.error('❌ WebSocket message parse error:', err);
                    setError('Failed to parse status update');
                }
            };

            ws.onerror = (err) => {
                console.error(`❌ WebSocket error for job ${jobId}:`, err);
                setError('Connection error');
                setIsConnected(false);
            };

            ws.onclose = () => {
                //console.log(`🔌 WebSocket disconnected for job ${jobId}`, event.code, event.reason);
                setIsConnected(false);

                // Clear keepalive
                if (pingInterval) {
                    clearInterval(pingInterval);
                }

                // Check if job is still active before reconnecting
                checkJobStatusAndReconnect();
            };
        };

        // Fallback: Poll job status via REST API if WebSocket keeps failing
        const startPollingFallback = () => {
            //console.log(`🔄 Starting polling fallback for job ${jobId}`);

            const poll = async () => {
                try {
                    const backend = import.meta.env.VITE_BACKEND_URL || "";
                    const response = await fetch(`${backend}/api/applications/jobs/${jobId}`);

                    if (response.ok) {
                        const result = await response.json();
                        const jobData = result.data;

                        //console.log(`📊 Polling job ${jobId}:`, jobData.status, `${jobData.progress || 0}%`);

                        setStatus({
                            status: jobData.status,
                            progress: jobData.progress || 0,
                            position: jobData.position,
                            message: jobData.message,
                            result: jobData.result,
                            error: jobData.error,
                            updatedAt: new Date(jobData.updatedAt)
                        });

                        // Continue polling if job is still active
                        if (jobData.status === 'queued' || jobData.status === 'processing') {
                            pollingTimeoutRef.current = setTimeout(poll, 2000); // Poll every 2 seconds
                        } else {
                            //console.log(`✅ Job ${jobId} completed via polling`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Polling error for job ${jobId}:`, error);
                    // Continue polling even on error
                    pollingTimeoutRef.current = setTimeout(poll, 5000); // Poll every 5 seconds on error
                }
            };

            poll();
        };

        // Check job status before attempting reconnection
        const checkJobStatusAndReconnect = async () => {
            try {
                const backend = import.meta.env.VITE_BACKEND_URL || "";
                const response = await fetch(`${backend}/api/applications/jobs/${jobId}`);

                if (response.ok) {
                    const result = await response.json();
                    const jobData = result.data;

                    // Update status from REST call
                    setStatus({
                        status: jobData.status,
                        progress: jobData.progress || 0,
                        position: jobData.position,
                        message: jobData.message,
                        result: jobData.result,
                        error: jobData.error,
                        updatedAt: new Date(jobData.updatedAt)
                    });

                    // Only reconnect if job is still active
                    if (jobData.status === 'queued' || jobData.status === 'processing') {
                        reconnectAttemptsRef.current++;
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Exponential backoff, max 10s
                        //console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
                    } else {
                        //console.log(`✅ Job ${jobId} completed, no reconnection needed`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error checking job status for reconnection:`, error);
                // Still try to reconnect on error
                reconnectAttemptsRef.current++;
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
            }
        };

        connectWebSocket();

        // Cleanup on unmount or jobId change
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [jobId]);

    const isActive = status && (status.status === 'queued' || status.status === 'processing');

    return {
        status,
        error,
        isConnected,
        isActive
    };
}