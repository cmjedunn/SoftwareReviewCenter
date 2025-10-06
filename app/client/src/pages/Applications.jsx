import { useState, useEffect } from 'react';
//import { useLoaderData } from 'react-router-dom';
import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils';
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';
import Form from '../components/layout/Form';
import styles from './styles/Home.module.scss';

export default function Applications() {
  const backend = import.meta.env.VITE_BACKEND_URL || "";

  const [environments, setEnvironments] = useState([]);
  const [applications, setApplications] = useState([]);


  useEffect(() => {
    fetch(`${backend}/api/environments`)
      .then(res => res.json())
      .then(data => {
        const envArray = Array.isArray(data) ? data : data.content || [];
        setEnvironments(envArray);
      })
      .catch(console.error);
  }, [backend]);

  useEffect(() => {
    fetch(`${backend}/api/applications`)
      .then(res => res.json())
      .then(setApplications)
      .catch(console.error);
  }, [backend]);

  console.log(environments.map(environment => environment.name));

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
      options: environments.map(record => ({
        value: record.id,    // Use the LogicGate record ID as the value
        label: record.name   // Display the human-readable name
      }))
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

      // TODO: Refresh the applications data
      // window.location.reload(); // Simple refresh, or use proper state management

    } catch (error) {
      console.error('❌ Error submitting application:', error);
      throw error; // Let the Form component handle the error display
    }
  };


  return (
    <PageWrapper>
      <AuthContent>
        <div className={styles.dashboard}>
          <div className={styles.col}>
            {/* <Card className={styles.welcome} title="Add Application"> */}
            <div>
              <Card title="Applications" />
              <Form
                title="Add Application"
                fields={applicationFields}
                onSubmit={handleApplicationSubmit}
                submitButtonText="Submit"
                clearButtonText="Clear Form"
              />
            </div>
            {/* </Card> */}

            {/* Applications Grid */}
            {!applications && applications.content && applications.content.length > 0 ? (
              <GridCard>
                {applications.content.map((application, index) => {
                  // Extract application details with safe fallbacks
                  const applicationName = String(application.name || `Application ${index + 1}`);
                  const environment = application.environment || 'Production';
                  const recordCount = application.recordCount || 0;

                  // Cycle through themes for visual variety

                  return (
                    <Card
                      title={applicationName}
                    >
                      <p>{environment}</p>
                      <p>{recordCount}</p>
                    </Card>

                  );
                })}
              </GridCard>
            ) : (
              // Empty state when no applications
              <Card>
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{":("}</div>
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