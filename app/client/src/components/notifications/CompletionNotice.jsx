// /app/client/src/components/notifications/CompletionNotice.jsx
// Success notification that appears when applications are created

import { useState, useEffect } from 'react';
import styles from './styles/CompletionNotice.module.scss';

const CompletionNotice = ({ 
    message, 
    type = 'success', 
    duration = 5000, 
    onDismiss,
    applicationData 
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onDismiss) {
                onDismiss();
            }
        }, 300); // Match CSS animation duration
    };

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '✅';
        }
    };

    return (
        <div className={`${styles.notice} ${styles[type]} ${isExiting ? styles.exiting : ''}`}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.icon}>{getIcon()}</span>
                    <div className={styles.message}>
                        {message || 'Action completed successfully'}
                    </div>
                    <button 
                        onClick={handleDismiss}
                        className={styles.dismissButton}
                        aria-label="Dismiss notification"
                    >
                        ✕
                    </button>
                </div>

                {/* Show application details for creation success */}
                {type === 'success' && applicationData && (
                    <div className={styles.details}>
                        <div className={styles.detailItem}>
                            <strong>Application:</strong> {applicationData.name}
                        </div>
                        {applicationData.id && (
                            <div className={styles.detailItem}>
                                <strong>ID:</strong> {applicationData.id}
                            </div>
                        )}
                        {applicationData.controlsCreated && (
                            <div className={styles.detailItem}>
                                <span className={styles.badge}>Controls automatically created</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Progress bar for auto-dismiss */}
            {duration > 0 && (
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill}
                        style={{
                            animationDuration: `${duration}ms`
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default CompletionNotice;