// Self-managing NotificationContainer that handles its own job persistence
import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { SuccessNotificationCard, ProgressNotificationCard, ErrorNotificationCard } from './NotificationCard';
import { useJobStatus } from '../../hooks/useJobStatus';

export default function NotificationContainer({ jobId, onJobStarted, onJobCompleted }) {
    const [currentNotification, setCurrentNotification] = useState(null);
    const [hasShownInitialNotification, setHasShownInitialNotification] = useState(false);
    const [managedJobId, setManagedJobId] = useState(jobId);

    const { accounts } = useMsal();
    const { status: jobStatus, error: jobError } = useJobStatus(managedJobId);
    const backend = import.meta.env.VITE_BACKEND_URL || "";

    // Check for active jobs on mount (page load/refresh)
    useEffect(() => {
        const checkForActiveJobs = async () => {
            try {
                //console.log('🔍 NotificationContainer checking for active jobs...');

                const userEmail = accounts[0]?.username || accounts[0]?.name;
                //console.log('👤 User email:', userEmail);

                if (!userEmail) {
                    console.warn('⚠️ No user email found, skipping active job check');
                    return;
                }

                // NORMALIZE EMAIL TO LOWERCASE
                const normalizedEmail = userEmail.toLowerCase();
                //console.log('👤 Normalized email:', normalizedEmail);

                const response = await fetch(`${backend}/api/applications/active-jobs`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': normalizedEmail, // Use normalized email
                    },
                });

                if (response.ok) {
                    const result = await response.json();
                    //console.log('📋 Active jobs response:', result);

                    // Check if this is the expected JobManager response format
                    // The JobManager response has mostRecentActiveJobId at the top level, not nested under data
                    if (result && typeof result === 'object' && 'mostRecentActiveJobId' in result) {
                        const activeJobId = result.mostRecentActiveJobId; // Access directly, not result.data.mostRecentActiveJobId

                        if (activeJobId) {
                            //console.log('✅ Found active job, setting managedJobId:', activeJobId);
                            setManagedJobId(activeJobId);
                            setHasShownInitialNotification(true);
                            if (onJobStarted) onJobStarted(activeJobId);
                        } else {
                            //console.log('ℹ️ No active jobs found');
                        }
                    } else {
                        // This might be a LogicGate response instead of JobManager response
                        console.warn('⚠️ Unexpected response format from active-jobs endpoint:', result);
                        console.warn('⚠️ Expected JobManager format, but got something else');

                        // Check if this looks like a LogicGate response
                        if (result.content && Array.isArray(result.content)) {
                            console.error('❌ Got LogicGate response instead of JobManager response!');
                            console.error('❌ The /api/applications/active-jobs endpoint is not working correctly');
                        }
                    }
                } else {
                    console.warn('⚠️ Failed to check active jobs:', response.status, response.statusText);
                    const errorText = await response.text();
                    console.warn('⚠️ Error response:', errorText);
                }
            } catch (error) {
                console.error('❌ Error checking active jobs:', error);
            }
        };

        if (accounts.length > 0 && !managedJobId) {
            checkForActiveJobs();
        }
    }, [accounts, backend, managedJobId, onJobStarted]);

    // Update managedJobId when parent passes new jobId
    useEffect(() => {
        if (jobId && jobId !== managedJobId) {
            ////console.log('📝 Received new jobId from parent:', jobId);
            setManagedJobId(jobId);
            setHasShownInitialNotification(false);
            if (onJobStarted) onJobStarted(jobId);
        }
    }, [jobId, managedJobId, onJobStarted]);



    // Show immediate notification when job starts (only for new jobs)
    useEffect(() => {
        if (managedJobId && !hasShownInitialNotification) {
            setCurrentNotification({
                type: 'processing',
                message: 'Starting job...'
            });
            setHasShownInitialNotification(true);
        } else if (!managedJobId) {
            setCurrentNotification(null);
            setHasShownInitialNotification(false);
        }
    }, [managedJobId, hasShownInitialNotification]);

    // Handle WebSocket job status updates
    useEffect(() => {
        if (!jobStatus) return;

        const { status, message } = jobStatus;

        if (status === 'completed') {
            setCurrentNotification({
                type: 'success',
                message: message || 'Operation completed successfully'
            });

            // Clean up after showing success
            setTimeout(() => {
                setManagedJobId(null);
                if (onJobCompleted) onJobCompleted();
            }, 8000);

        } else if (status === 'error') {
            setCurrentNotification({
                type: 'error',
                message: message || 'Operation failed'
            });

            // Clean up after showing error
            setTimeout(() => {
                setManagedJobId(null);
                if (onJobCompleted) onJobCompleted();
            }, 10000);

        } else if (status === 'processing') {
            setCurrentNotification({
                type: 'processing',
                message: message || 'Processing...'
            });
        } else if (status === 'queued') {
            setCurrentNotification({
                type: 'processing',
                message: message || 'Queued for processing...'
            });
        }
    }, [jobStatus, onJobCompleted]);

    // Handle connection errors
    useEffect(() => {
        if (jobError) {
            setCurrentNotification({
                type: 'error',
                message: 'Connection lost - Real-time updates unavailable'
            });
        }
    }, [jobError]);

    const removeNotification = () => {
        setCurrentNotification(null);
        setManagedJobId(null);
        if (onJobCompleted) onJobCompleted();
    };

    // Show loading state while checking for active jobs
    

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