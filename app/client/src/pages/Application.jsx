import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageWrapper, AuthContent } from '../components/layout/Utils';
import { Card } from '../components/layout/Card';
import DeleteButton from '../components/layout/DeleteButton'; // Import the new component
import styles from './styles/Application.module.scss';
import { authenticatedFetch } from '../services/authService.js';


export default function Application() {
    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);

    // Get the application from navigation state
    const applicationRecord = location.state?.application;
    const backend = import.meta.env.VITE_BACKEND_URL || "";

    // Handle delete functionality
    const handleDelete = async () => {
        if (!applicationRecord?.id) return;

        setIsDeleting(true);

        try {
            //console.log('🗑️ Deleting application:', applicationRecord.id);

            const response = await authenticatedFetch(`${backend}/api/applications/${applicationRecord.id}`, {
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
                <Card className={styles.appCard} title={applicationRecord.name}>
                    <div className={styles.applicationContent}>
                        <div className={styles.applicationHeader}>
                            <div className={styles.applicationInfo}>
                                <p><strong>ID:</strong> {applicationRecord.id}</p>
                                <p><strong>Status:</strong> {applicationRecord.status}</p>
                                <p><strong>Assignee:</strong> {applicationRecord.assignee?.name || 'Unassigned'}</p>
                            </div>

                            {/* Delete Button - positioned in header */}
                            <div className={styles.applicationActions}>
                                <DeleteButton
                                    onDelete={handleDelete}
                                    applicationName={applicationRecord.name}
                                    disabled={isDeleting}
                                    buttonText={isDeleting ? 'Deleting...' : 'Delete Application'}
                                />
                            </div>
                        </div>

                        {/* Debug info - remove this in production */}
                        <details className={styles.debugSection}>
                            <summary>Debug: Raw Application Data</summary>
                            <pre style={{
                                padding: '1rem',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '0.875rem'
                            }}>
                                {JSON.stringify(applicationRecord, null, 2)}
                            </pre>
                        </details>
                    </div>
                </Card>
            </AuthContent>
        </PageWrapper>
    );
}