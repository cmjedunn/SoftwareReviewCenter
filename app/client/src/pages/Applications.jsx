import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils';
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';
import Form from '../components/layout/Form';
import styles from './styles/Home.module.scss';

export default function Applications() {
  const [showForm, setShowForm] = useState(false);
  const resource = useLoaderData();

  // Application form configuration
  const applicationFields = [
    {
      name: 'name',
      label: 'Application Name',
      type: 'text',
      required: true,
      placeholder: 'Enter application name'
    },
    {
      name: 'owner',
      label: 'Owner Email',
      type: 'email',
      required: true,
      placeholder: 'owner@jedunn.com',
      helpText: 'Email address of the application owner'
    },
    {
      name: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      defaultValue: 'Production',
      options: [
        { value: 'Development', label: 'Development' },
        { value: 'Staging', label: 'Staging' },
        { value: 'Production', label: 'Production' },
        { value: 'Testing', label: 'Testing' }
      ]
    },
    {
      name: 'description',
      label: 'Application Description',
      type: 'textarea',
      required: true,
      placeholder: 'Provide a detailed description of the application, its purpose, and key functionality',
      rows: 4,
      helpText: 'This will be used for security assessment and risk evaluation'
    }
  ];

  const handleApplicationSubmit = async (formData) => {
    try {
      console.log('🔄 Submitting application:', formData);
      
      // TODO: Replace with actual API call
      // await createApplicationRecordData(
      //   formData.name, 
      //   formData.owner, 
      //   formData.description, 
      //   formData.environment
      // );
      
      // Mock API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Application submitted successfully');
      alert('Application submitted for security review!');
      
      // Close form and potentially refresh the applications list
      setShowForm(false);
      
      // TODO: Refresh the applications data
      // window.location.reload(); // Simple refresh, or use proper state management
      
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      throw error; // Let the Form component handle the error display
    }
  };

  // Theme options for variety
  const themes = ['green', 'orange', 'red', 'blue', 'purple', 'cyan'];

  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.dashboard}>
          <div className={styles.col}>
            
            {/* Header Card with Add Button */}
            <Card className={styles.welcome} title="Applications">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0 }}>
                  Manage and submit applications for security review and third-party assessment.
                </p>
                <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: showForm ? '#ef4444' : '#004b8d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {showForm ? '❌ Cancel' : '➕ New Application'}
                </button>
              </div>
              
              {/* Show form when toggled */}
              {showForm && (
                <div style={{ 
                  marginTop: '2rem',
                  padding: '2rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Form
                    title="Submit New Application"
                    fields={applicationFields}
                    onSubmit={handleApplicationSubmit}
                    submitButtonText="Submit for Review"
                    clearButtonText="Clear Form"
                  />
                </div>
              )}
            </Card>

            {/* Applications Grid */}
            {resource && resource.content && resource.content.length > 0 ? (
              <GridCard>
                {resource.content.map((application, index) => {
                  // Extract application details with safe fallbacks
                  const applicationName = String(application.name || `Application ${index + 1}`);
                  const environment = application.environment || 'Production';
                  const recordCount = application.recordCount || 0;
                  
                  // Cycle through themes for visual variety
                  const theme = themes[index % themes.length];

                  return (
                    <LaserFlowCard
                      key={application.id || index}
                      applicationName={applicationName}
                      environment={environment}
                      recordCount={recordCount}
                      theme={theme}
                      maxWidth="50em"
                      maxHeight="20em"
                    />
                  );
                })}
              </GridCard>
            ) : (
              // Empty state when no applications
              <Card title="No Applications Found">
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                    No applications have been submitted yet.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    Click "New Application" above to submit your first application for security review.
                  </p>
                </div>
              </Card>
            )}

          </div>
        </div>
      </AuthContent>
    </PageWrapper>
  );
}