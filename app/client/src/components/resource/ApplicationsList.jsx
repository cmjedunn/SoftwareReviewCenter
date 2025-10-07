import { useState, useEffect } from 'react';
import { Card, GridCard } from '../layout/Card';
import styles from './styles/ApplicationsList.module.scss'; // Use dedicated Applications styles


export default function ApplicationsList() {
    const backend = import.meta.env.VITE_BACKEND_URL || "";
    const [applications, setApplications] = useState([]);

    useEffect(() => {
        fetch(`${backend}/api/applications`)
            .then(res => res.json())
            .then(setApplications)
            .catch(console.error);
    }, [backend]);

    return (
        <>
            {applications && applications.content && applications.content.length > 0 ? (
                <GridCard>
                    {applications.content.map((application, index) => {
                        const applicationName = String(application.name || `Application ${index + 1}`);
                        const environment = application.environment || 'Production';
                        const recordCount = application.recordCount || 0;

                        return (
                            <Card key={application.id || index} title={applicationName}>
                                <p>{environment}</p>
                                <p>{recordCount}</p>
                            </Card>
                        );
                    })}
                </GridCard>
            ) : (
                <Card className={styles.card}>
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: '#9ca3af'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>:(</div>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                            No applications have been submitted yet.
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            Submit an application using the form on the left.
                        </p>
                    </div>
                </Card>
            )}
        </>
    );
}