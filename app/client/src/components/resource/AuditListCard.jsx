import { useState, useEffect } from 'react';
import { Card } from '../layout/Card';
import { useAuthenticatedFetch } from '../../hooks/useAutheticatedFetch';
import styles from './styles/AuditListCard.module.scss';

export default function AuditListCard({ applicationId }) {
    const fetch = useAuthenticatedFetch();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const backend = import.meta.env.VITE_BACKEND_URL || "";
    const logicgateEnv = import.meta.env.VITE_LOGICGATE_ENV || "atheneum";

    // Fetch audits for this application
    useEffect(() => {
        const fetchAudits = async () => {
            if (!applicationId) {
                setLoading(false);
                return;
            }

            // Add a small delay to ensure MSAL is initialized
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                setLoading(true);
                const response = await fetch(`${backend}/api/audits/application/${applicationId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch audits: ${response.status}`);
                }

                const data = await response.json();
                console.log('🔍 Audits API Response:', data);

                // Extract the linked records from the response
                const linkedRecords = data?.linkedRecords?.workflow || {};
                const allAudits = [];

                // Iterate through all workflows to find audit records
                for (const [workflowId, records] of Object.entries(linkedRecords)) {
                    if (Array.isArray(records)) {
                        records.forEach(item => {
                            if (item?.record) {
                                allAudits.push(item.record);
                            }
                        });
                    }
                }

                console.log('✅ Extracted audits:', allAudits);
                setAudits(allAudits);
                setError(null);
            } catch (error) {
                console.error('Error fetching audits:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAudits();
    }, [applicationId, backend, fetch]);

    const getStatusClass = (status) => {
        const statusLower = status?.toLowerCase() || '';
        switch (statusLower) {
            case 'complete':
            case 'completed':
                return styles.statusCompleted;
            case 'in_progress':
            case 'in progress':
                return styles.statusInProgress;
            case 'pending':
                return styles.statusPending;
            default:
                return styles.statusDefault;
        }
    };

    // Helper function to extract field value
    const getFieldValue = (audit, fieldName) => {
        const field = audit.fields?.find(f => f.name === fieldName);
        return field?.values?.[0]?.textValue || field?.values?.[0]?.numericValue || null;
    };

    // Generate LogicGate URL for an audit record
    const getAuditUrl = (auditId) => {
        return `https://${logicgateEnv}.logicgate.com/records/${auditId}`;
    };

    return (
        <Card className={styles.auditCard} title="Related Audits">
            <div className={styles.auditListContent}>
                {loading ? (
                    <div className={styles.loading}>
                        <p>Loading audits...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        <p>Error loading audits: {error}</p>
                    </div>
                ) : audits.length === 0 ? (
                    <div className={styles.noAudits}>
                        <p>No audits found for this application.</p>
                    </div>
                ) : (
                    <div className={styles.auditList}>
                        {audits.map((audit) => (
                            <div key={audit.id} className={styles.auditItem}>
                                <div className={styles.auditHeader}>
                                    <a
                                        href={getAuditUrl(audit.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.auditName}
                                    >
                                        {audit.name}
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                    </a>
                                    <span className={`${styles.auditStatus} ${getStatusClass(audit.status)}`}>
                                        {audit.status}
                                    </span>
                                </div>
                                <div className={styles.auditDetails}>
                                    {audit.assignee && (
                                        <div className={styles.auditDetail}>
                                            <span className={styles.detailLabel}>Assignee:</span>
                                            <span className={styles.detailValue}>{audit.assignee.name}</span>
                                        </div>
                                    )}
                                    {audit.dates?.completed && (
                                        <div className={styles.auditDetail}>
                                            <span className={styles.detailLabel}>Completed:</span>
                                            <span className={styles.detailValue}>
                                                {new Date(audit.dates.completed).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {getFieldValue(audit, 'Audit Year') && (
                                        <div className={styles.auditDetail}>
                                            <span className={styles.detailLabel}>Year:</span>
                                            <span className={styles.detailValue}>{getFieldValue(audit, 'Audit Year')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
