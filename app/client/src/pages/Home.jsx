import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils'
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';

export default function Home() {

  return (

    <PageWrapper>
      <AuthContent>
        <GridCard>
          <LaserFlowCard
            applicationName="Test App"
            environment="Production"
            recordCount={25}
            theme="green"
            maxWidth="50em"
            maxHeight="20em"
          />
          <LaserFlowCard
            applicationName="Test App"
            environment="Production"
            recordCount={25}
            theme="orange"
            width="50em"
            height="20em"
          />
          <LaserFlowCard
            applicationName="Test App"
            environment="Production"
            recordCount={25}
            theme="red"
            width="50em"
            height="20em"
          />
        </GridCard>

      </AuthContent>
    </PageWrapper>
  );
}
