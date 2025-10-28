import { PageWrapper, AuthContent } from '../components/layout/Utils';

export default function PageTemplate() {
  return (
    <PageWrapper>
      <AuthContent>
        <div className="card">
          <h2>Page Template</h2>
          <p>Manage your integrations and partnerships here.</p>
          {/* Add your content here */}
        </div>
      </AuthContent>
    </PageWrapper>
  );
}