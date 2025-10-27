// src/components/resource/NotificationContainer.jsx
import { useState, useEffect } from 'react';
import { SuccessNotificationCard, ProgressNotificationCard, ErrorNotificationCard } from './NotificationCard';
import { useJobStatus } from '../../hooks/useJobStatus';

export default function NotificationContainer({ jobId }) {

    // Change from array to single notification
    const [currentNotification, setCurrentNotification] = useState(null);
    const { status: jobStatus, error: jobError } = useJobStatus(jobId);

    // Handle WebSocket job status updates
    useEffect(() => {
        if (!jobStatus) return;

        const { status, message, result, error } = jobStatus;

        if (status === 'completed') {
            setCurrentNotification({
                type: 'success',
                message: message || 'Operation completed successfully',
                details: result
            });
        } else if (status === 'error') {
            setCurrentNotification({
                type: 'error',
                message: error || 'Operation failed',
                details: result?.details
            });
        } else if (status === 'processing') {
            setCurrentNotification({
                type: 'processing',
                message: message || 'Processing...',
                details: result
            });
        } else if (status === 'queued') {
            setCurrentNotification({
                type: 'processing',
                message: message || 'Queued for processing...',
                details: result
            });
        }
    }, [jobStatus]);

    // Handle connection errors
    useEffect(() => {
        if (jobError) {
            setCurrentNotification({
                type: 'error',
                message: 'Connection lost',
                details: 'Real-time updates unavailable.'
            });
        }
    }, [jobError]);

    const removeNotification = () => {
        setCurrentNotification(null);
    };

    // Don't render anything if no notification
    if (!currentNotification) {
        return null;
    }

    return (
        <div>
            {currentNotification.type === 'success' ? (
                <SuccessNotificationCard>
                    <span>{currentNotification.message}</span>
                    <button onClick={removeNotification}>×</button>
                </SuccessNotificationCard>
            ) : currentNotification.type === 'processing' ? (
                <ProgressNotificationCard>
                    <span>{currentNotification.message}</span>
                    <button onClick={removeNotification}>×</button>
                </ProgressNotificationCard>
            ) : (
                <ErrorNotificationCard>
                    <span>{currentNotification.message}</span>
                    <button onClick={removeNotification}>×</button>
                </ErrorNotificationCard>
            )}
        </div>
    );
}