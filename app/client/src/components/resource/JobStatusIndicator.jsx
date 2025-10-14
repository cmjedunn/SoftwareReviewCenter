import React from 'react';
import { useJobStatus } from '../../hooks/useJobStatus';

export function JobStatusIndicator({ jobId }) {
    const { status, error, isConnected } = useJobStatus(jobId);

    if (!jobId) return null;

    if (error) {
        return (
            <div className="job-status error">
                ❌ Connection Error: {error}
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="job-status connecting">
                🔌 Connecting...
            </div>
        );
    }

    if (!status) {
        return (
            <div className="job-status waiting">
                ⏳ Waiting for updates...
            </div>
        );
    }

    const getStatusIcon = () => {
        switch (status.status) {
            case 'queued': return '📋';
            case 'processing': return '⚙️';
            case 'completed': return '✅';
            case 'error': return '❌';
            default: return '❓';
        }
    };

    const getStatusMessage = () => {
        switch (status.status) {
            case 'queued':
                return `Queued (position ${status.position})`;
            case 'processing':
                return status.message || 'Processing...';
            case 'completed':
                return 'Completed successfully!';
            case 'error':
                return `Error: ${status.error}`;
            default:
                return 'Unknown status';
        }
    };

    return (
        <div className={`job-status ${status.status}`}>
            <div className="status-header">
                <span className="icon">{getStatusIcon()}</span>
                <span className="message">{getStatusMessage()}</span>
            </div>
            
            {status.status === 'processing' && (
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${status.progress}%` }}
                    />
                    <span className="progress-text">{status.progress}%</span>
                </div>
            )}
            
            {status.status === 'completed' && status.result && (
                <div className="result">
                    <p>✅ Created: {status.result.name}</p>
                    <p>🆔 ID: {status.result.id}</p>
                </div>
            )}
            
            {status.updatedAt && (
                <div className="timestamp">
                    Last updated: {status.updatedAt.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}