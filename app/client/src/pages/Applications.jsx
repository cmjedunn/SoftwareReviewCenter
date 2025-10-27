// Simplified Applications.jsx - NotificationContainer manages itself
import { useState } from 'react';
import { PageWrapper, AuthContent } from '../components/layout/Utils';
import { Card } from '../components/layout/Card';
import styles from './styles/Applications.module.scss';
import AddApplicationForm from '../components/resource/AddApplicationForm';
import ApplicationsList from '../components/resource/ApplicationsList';
import NotificationContainer from '../components/resource/NotificationContainer';

export default function Applications() {
  const [currentJobId, setCurrentJobId] = useState(null);

  const handleJobStarted = (jobId) => {
    //console.log('🎯 Job started:', jobId);
    setCurrentJobId(jobId);
  };

  const handleJobCompleted = () => {
    //console.log('✅ Job completed, clearing state');
    setCurrentJobId(null);
  };

  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.applicationsContainer}>
          {/* Left Column - Form */}
          <div className={styles.formSection}>
            <Card title="Applications" />
            <AddApplicationForm onJobStarted={handleJobStarted} />
          </div>
          
          {/* Right Column - Applications List */}
          <div className={styles.listSection}>
            <ApplicationsList />
            
            {/* Self-managing notification container */}
            <NotificationContainer
              jobId={currentJobId}
              onJobStarted={handleJobStarted}
              onJobCompleted={handleJobCompleted}
            />
          </div>
        </div>
      </AuthContent>
    </PageWrapper>
  );
}