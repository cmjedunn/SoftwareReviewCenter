import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils'
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';
import { useLoaderData } from "react-router-dom";


export default function Home() {
  const { resourse } = useLoaderData(); 


  return (
    <PageWrapper>
      <AuthContent>
        <GridCard>
          <LaserFlowCard
            applicationName="Applications"
            environment="Production"
            recordCount={25}
            theme="green"
          // Removed explicit width/height to let grid handle sizing
          // maxWidth="50em"
          // maxHeight="20em"
          />
          <LaserFlowCard
            applicationName="Third Parties"
            environment="Production"
            recordCount={18}
            theme="orange"
          // width="50em"
          // height="20em"
          />
          <LaserFlowCard
            applicationName="Security Reviews"
            environment="Production"
            recordCount={42}
            theme="red"
          // width="50em"
          // height="20em"
          />
        </GridCard>
      </AuthContent>
    </PageWrapper>
  );
}