import { PageWrapper, AuthContent } from '../components/layout/Utils';

export default function Applications() {
  return (
    <PageWrapper>
      <AuthContent>
        <div className="card">
          <h2>Applications</h2>
          <p>Manage your software applications and reviews here.</p>
          {/* Add your applications content here */}
        </div>
      </AuthContent>
    </PageWrapper>
  );
}