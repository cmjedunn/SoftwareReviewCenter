//import styles from './styles/Home.module.scss'
import { PageWrapper, MainContent, AuthContent} from '../components/layout/Utils'

export default function Home() {

  return (
    
    <PageWrapper>
      
      <AuthContent>
        <div className="card">
          <p>Welcome</p>
        </div>
      </AuthContent>

    </PageWrapper>
  );
}
