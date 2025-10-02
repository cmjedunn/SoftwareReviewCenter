import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils'
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';
import styles from './styles/Home.module.scss'



export default function Home() {

  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.dashboard}>
          <div className={styles.col}>
            <Card className={styles.welcome}
              title="Welcome">
              <p>Here is some content i dont reall want to look anything up so im just gonna type with my eyes cvlosed and see if any of this is legable at all i,, not realy sure if it will be</p>
            </Card>
            <LaserFlowCard
              applicationName="Application"
              environment="Enviornment"
              recordCount={123}
              theme="green"
            />
          </div>
        </div>
      </AuthContent>
    </PageWrapper>
  );
}
