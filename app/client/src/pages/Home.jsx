import { PageWrapper, MainContent, AuthContent} from '../components/layout/Utils'
import Card from '../components/layout/Card';

export default function Home() {

  return (
    
    <PageWrapper>
      
      <AuthContent>
        <Card>
          <p>Welcome</p>
        </Card>
      </AuthContent>

    </PageWrapper>
  );
}
