import { useState, useEffect } from 'react';
import FormCard from '../layout/FormCard';


export default function AddApplicationForm() {

    const backend = import.meta.env.VITE_BACKEND_URL || "";

    const [environments, setEnvironments] = useState([]);

    useEffect(() => {
        fetch(`${backend}/api/environments`)
            .then(res => res.json())
            .then(data => {
                const envArray = Array.isArray(data) ? data : data.content || [];
                setEnvironments(envArray);
            })
            .catch(console.error);
    }, [backend]);

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
            defaultValue: '',
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
        <FormCard
            title="Add Application"
            fields={applicationFields}
            onSubmit={handleApplicationSubmit}
            submitButtonText="Submit"
            clearButtonText="Clear Form"
        />);
}