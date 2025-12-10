import { useState, useEffect, useRef } from 'react';
import { useAuthenticatedFetch } from '../hooks/useAutheticatedFetch';
import { useMsal } from '@azure/msal-react';

export function useJobStatus(jobId) {
    const fetch = useAuthenticatedFetch();
    const { instance, accounts } = useMsal();

    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pollingTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;

    useEffect(() => {
        if (!jobId) {
            setStatus(null);
            setError(null);
            setIsConnected(false);
            return;
        }

        console.log(`🔌 Connecting to WebSocket for job ${jobId}`);
        reconnectAttemptsRef.current = 0;

        const connectWebSocket = async () => {
            if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                console.error(`❌ Max reconnect attempts (${maxReconnectAttempts}) reached for job ${jobId}. Falling back to polling.`);
                startPollingFallback();
                return;
            }

            // Get authentication token for WebSocket
            let token = null;
            if (accounts.length > 0) {
                try {
                    const tokenResponse = await instance.acquireTokenSilent({
                        scopes: ["https://graph.microsoft.com/User.Read"],
                        account: accounts[0],
                    });
                    token = tokenResponse.accessToken;
                    console.log('✅ Got token for WebSocket authentication');
                } catch (error) {
                    console.error('❌ Failed to get token for WebSocket:', error);
                    startPollingFallback();
                    return;
                }
            }

            if (!token) {
                console.error('❌ No token available for WebSocket');
                startPollingFallback();
                return;
            }

            const backend = import.meta.env.VITE_BACKEND_URL || "";
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = backend ? new URL(backend).host : window.location.host;
            const wsUrl = `${protocol}//${host}/ws?token=${token}`;

            console.log('🔌 Connecting to WebSocket with auth token');
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            let pingInterval;

            ws.onopen = () => {
                console.log(`✅ WebSocket connected for job ${jobId} with authentication`);
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;

                // Subscribe to job updates
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    jobId: jobId
                }));

                // Start keepalive ping every 20 seconds
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

                    if (data.type === 'pong') {
                        console.log('🏓 Keepalive pong received');
                        return;
                    }

                    if (data.type === 'jobUpdate' && data.jobId === jobId) {
                        console.log(`📊 Job ${jobId} update:`, data.status, `${data.progress}%`, data.message);

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

            ws.onclose = (event) => {
                console.log(`🔌 WebSocket disconnected for job ${jobId}`, event.code, event.reason);
                setIsConnected(false);

                if (pingInterval) {
                    clearInterval(pingInterval);
                }

                checkJobStatusAndReconnect();
            };
        };

        const startPollingFallback = () => {
            console.log(`🔄 Starting polling fallback for job ${jobId}`);

            const poll = async () => {
                try {
                    const backend = import.meta.env.VITE_BACKEND_URL || "";
                    const response = await fetch(`${backend}/api/applications/jobs/${jobId}`);

                    if (response.ok) {
                        const result = await response.json();
                        const jobData = result.data;

                        console.log(`📊 Polling job ${jobId}:`, jobData.status, `${jobData.progress || 0}%`);

                        setStatus({
                            status: jobData.status,
                            progress: jobData.progress || 0,
                            position: jobData.position,
                            message: jobData.message,
                            result: jobData.result,
                            error: jobData.error,
                            updatedAt: new Date(jobData.updatedAt)
                        });

                        if (jobData.status === 'queued' || jobData.status === 'processing') {
                            pollingTimeoutRef.current = setTimeout(poll, 2000);
                        } else {
                            console.log(`✅ Job ${jobId} completed via polling`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Polling error for job ${jobId}:`, error);
                    pollingTimeoutRef.current = setTimeout(poll, 5000);
                }
            };

            poll();
        };

        const checkJobStatusAndReconnect = async () => {
            try {
                const backend = import.meta.env.VITE_BACKEND_URL || "";
                const response = await fetch(`${backend}/api/applications/jobs/${jobId}`);

                if (response.ok) {
                    const result = await response.json();
                    const jobData = result.data;

                    setStatus({
                        status: jobData.status,
                        progress: jobData.progress || 0,
                        position: jobData.position,
                        message: jobData.message,
                        result: jobData.result,
                        error: jobData.error,
                        updatedAt: new Date(jobData.updatedAt)
                    });

                    if (jobData.status === 'queued' || jobData.status === 'processing') {
                        reconnectAttemptsRef.current++;
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
                    } else {
                        console.log(`✅ Job ${jobId} completed, no reconnection needed`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error checking job status for reconnection:`, error);
                reconnectAttemptsRef.current++;
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
            }
        };

        connectWebSocket();

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
    }, [jobId, instance, accounts]);

    const isActive = status && (status.status === 'queued' || status.status === 'processing');

    return {
        status,
        error,
        isConnected,
        isActive
    };
}