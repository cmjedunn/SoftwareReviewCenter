import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils'
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';
import styles from './styles/Home.module.scss'



export default function Home() {

  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.homeContainer}>
          <Card className={styles.welcome}
            title="Welcome">
            <p>To start a security review, open the side bar and select either Applications or Third-Parties </p>
          </Card>
        </div>
      </AuthContent>
    </PageWrapper>
  );
}
