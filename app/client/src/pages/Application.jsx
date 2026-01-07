import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageWrapper, AuthContent } from '../components/layout/Utils';
import { Card } from '../components/layout/Card';
import DeleteButton from '../components/layout/DeleteButton';
import EditButton from '../components/layout/EditButton';
import AuditListCard from '../components/resource/AuditListCard';
import styles from './styles/Application.module.scss';
import { useAuthenticatedFetch } from '../hooks/useAutheticatedFetch';


export default function Application() {

    const fetch = useAuthenticatedFetch();

    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [debugExpanded, setDebugExpanded] = useState(false);
    const [environmentName, setEnvironmentName] = useState('Loading...');


    // Get the application from navigation state
    const applicationRecord = location.state?.application;
    const backend = import.meta.env.VITE_BACKEND_URL || "";
    const logicgateEnv = import.meta.env.VITE_LOGICGATE_ENV || "atheneum";

    // Generate LogicGate URL for the application record
    const logicgateUrl = applicationRecord?.id
        ? `https://${logicgateEnv}.logicgate.com/records/${applicationRecord.id}`
        : null;

    // Extract maturity score (same logic as ApplicationsList)
    const getMaturityInfo = () => {
        if (!applicationRecord) return { score: null, hasData: false, theme: 'blue' };

        const maturityTierField = applicationRecord.fields?.find(field =>
            field.name === '[CALC] Current Year Average Control Maturity Tier'
        );
        const maturityScoreField = applicationRecord.fields?.find(field =>
            field.name === '[CALC] Overall Control Maturity Score'
        );

        // Try tier field first, then score field
        let maturityValue = maturityTierField?.values?.[0]?.numericValue ?? maturityTierField?.values?.[0]?.textValue;
        if (maturityValue === null || maturityValue === undefined || maturityValue === 'null') {
            maturityValue = maturityScoreField?.values?.[0]?.numericValue ?? maturityScoreField?.values?.[0]?.textValue;
        }

        // Check if we have valid maturity data
        const hasMaturityData = maturityValue !== null && maturityValue !== undefined && maturityValue !== 'null';
        const displayScore = hasMaturityData ? maturityValue : '0';

        // Determine theme based on workflow status AND data quality
        let theme = 'blue'; // Default
        if (applicationRecord.currentStep?.type === 'ORIGIN') {
            theme = 'red'; // Red for START/ORIGIN - always priority
        } else if (applicationRecord.currentStep?.type === 'END' && hasMaturityData) {
            theme = 'green'; // Green for completed WITH data
        } else if (!hasMaturityData) {
            theme = 'orange'; // Orange for missing data (any step except ORIGIN)
        } else if (applicationRecord.currentStep?.type === 'END') {
            theme = 'green'; // Green for completed (fallback)
        } else if (applicationRecord.currentStep?.type) {
            theme = 'blue'; // Blue for in-progress with data
        }

        return { score: displayScore, hasData: hasMaturityData, theme };
    };

    const maturityInfo = getMaturityInfo();

    // Handle copying record ID to clipboard
    const handleCopyRecordId = async () => {
        if (!applicationRecord?.id) return;

        try {
            await navigator.clipboard.writeText(applicationRecord.id);
            // Optional: You could add a toast notification here
            console.log('✅ Copied Record ID to clipboard:', applicationRecord.id);
        } catch (error) {
            console.error('Failed to copy Record ID:', error);
        }
    };

    // Fetch full application record with linked records from API
    useEffect(() => {
        const fetchApplicationData = async () => {
            if (!applicationRecord?.id) {
                setEnvironmentName('Unknown');
                return;
            }

            // Add a small delay to ensure MSAL is initialized
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                // Fetch the full application record with linked records
                const response = await fetch(`${backend}/api/applications/${applicationRecord.id}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch application: ${response.status}`);
                }

                const data = await response.json();
       

                // The API returns the record directly when fetching by ID
                const fullRecord = data;
           

                // Extract environment from linked records
                if (fullRecord?.linkedRecords?.workflow) {
                    for (const [ workflowRecords] of Object.entries(fullRecord.linkedRecords.workflow)) {

                        if (Array.isArray(workflowRecords) && workflowRecords.length > 0) {
                            // Check if this is the Environments workflow
                            const envRecord = workflowRecords.find(r => {
                                return r.record?.workflow?.name?.toLowerCase().includes('environment');
                            });

                            if (envRecord?.record?.name) {
                                console.log('✅ Found environment:', envRecord.record.name);
                                setEnvironmentName(envRecord.record.name);
                                return;
                            }
                        }
                    }
                }

                // If no environment found in linked records, check fields
                const environmentField = fullRecord?.fields?.find(field =>
                    field.name?.toLowerCase().includes('environment')
                );

                if (environmentField?.values?.[0]?.textValue) {
                    setEnvironmentName(environmentField.values[0].textValue);
                } else {
                    setEnvironmentName('Not Set');
                }

            } catch (error) {
                console.error('Error fetching application data:', error);
                setEnvironmentName('Error loading');
            }
        };

        fetchApplicationData();
    }, [applicationRecord?.id, backend, fetch]);

    // Handle edit functionality - opens LogicGate record
    const handleEdit = () => {
        if (!logicgateUrl) return;
        window.open(logicgateUrl, '_blank');
    };

    // Handle delete functionality
    const handleDelete = async () => {
        if (!applicationRecord?.id) return;

        setIsDeleting(true);

        try {
            //console.log('🗑️ Deleting application:', applicationRecord.id);

            const response = await fetch(`${backend}/api/applications/${applicationRecord.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete application: ${response.status}`);
            }

            //console.log('✅ Application deleted successfully');

            // Navigate back to applications list after successful deletion
            navigate('/applications', {
                state: {
                    message: `Application "${applicationRecord.name}" has been deleted.`,
                    type: 'success'
                }
            });

        } catch (error) {
            console.error('❌ Error deleting application:', error);
            // You could add a toast notification here
            alert(`Failed to delete application: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle case where no state was passed (direct URL access)
    if (!applicationRecord) {
        return (
            <PageWrapper>
                <AuthContent>
                    <Card className={styles.appCard}>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>Loading application...</p>
                            <p>ID: {id}</p>
                        </div>
                    </Card>
                </AuthContent>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <AuthContent>
                <div className={styles.pageLayout}>
                    <Card className={styles.appCard} title={
                        <div className={styles.applicationTitle}>
                            <a
                                href={logicgateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.applicationTitleLink}
                            >
                                {applicationRecord.name}
                                <svg
                                    width="16"
                                    height="16"
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
                        </div>
                    }>
                        <div className={styles.applicationContent}>
                            <div className={styles.applicationHeader}>
                                <div className={styles.applicationInfo}>
                                    <div className={styles.infoItem} onClick={handleCopyRecordId} style={{ cursor: 'pointer' }} title="Click to copy Record ID">
                                        <strong>Record ID</strong>
                                        <span>{applicationRecord.id}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <strong>Environment</strong>
                                        <span>{environmentName}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <strong>Status</strong>
                                        <span>{applicationRecord.status}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <strong>Assignee</strong>
                                        <span>
                                            {(() => {
                                                console.log('🔍 Assignee object:', applicationRecord.assignee);
                                                return applicationRecord.assignee?.name || 'Unassigned';
                                            })()}
                                        </span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <strong>Maturity Score</strong>
                                        <span className={`${styles.maturityScore} ${styles[`maturity-${maturityInfo.theme}`]}`}>
                                            {maturityInfo.score}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Edit and Delete */}
                            <div className={styles.applicationActions}>
                                <EditButton
                                    onEdit={handleEdit}
                                    buttonText="Edit in LogicGate"
                                />
                                <DeleteButton
                                    onDelete={handleDelete}
                                    applicationName={applicationRecord.name}
                                    disabled={isDeleting}
                                    buttonText={isDeleting ? 'Deleting...' : 'Delete Application'}
                                />
                            </div>

                            {/* Debug info - remove this in production */}
                            <div className={styles.debugSection}>
                                <button
                                    className={styles.debugButton}
                                    onClick={() => setDebugExpanded(!debugExpanded)}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{ transform: debugExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                    Debug: Raw Application Data
                                </button>
                                {debugExpanded && (
                                    <div className={styles.debugContent}>
                                        <pre>
                                            {JSON.stringify(applicationRecord, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Audit List Card */}
                    <AuditListCard applicationId={applicationRecord.id} />
                </div>
            </AuthContent>
        </PageWrapper>
    );
}