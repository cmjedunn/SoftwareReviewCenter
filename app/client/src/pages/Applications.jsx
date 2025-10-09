import { PageWrapper, AuthContent } from '../components/layout/Utils';
import { Card } from '../components/layout/Card';
import styles from './styles/Applications.module.scss'; // Use dedicated Applications styles
import AddApplicationForm from '../components/resource/AddApplicationForm';
import ApplicationsList from '../components/resource/ApplicationsList';

export default function Applications() {

  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.applicationsContainer}>
          {/* Left Column - Form */}
          <div className={styles.formSection}>
            <Card title="Applications" />
            <AddApplicationForm />
          </div>
          {/* Right Column - Applications List */}
          <div className={styles.listSection}>
              <ApplicationsList />
            </div>
        </div>
      </AuthContent>
    </PageWrapper>
  );
}