import { useState, useEffect } from 'react';
import FormCard from '../layout/FormCard';

export default function AddApplicationForm({ onJobStarted = () => {}, isSubmitDisabled = false }) {
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

    const handleFormSubmit = async (formData) => {
        const applicationData = {
            name: formData.get('name'),
            owner: formData.get('owner'),
            description: formData.get('description'),
            environment: formData.get('environment')
        };

        //console.log('🚀 Submitting application data:', applicationData);

        const response = await fetch(`${backend}/api/applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(applicationData),
        });

        if (response.ok) {
            const result = await response.json();
            const jobId = result.jobId;

            if (jobId) {
                //console.log('✅ Job queued successfully:', jobId);
                onJobStarted(jobId);  // Tell parent about the job
            }
        } else {
            throw new Error(`Failed to create application: ${response.status}`);
        }
    };

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

    return (
        <FormCard
            title="Add Application"
            onSubmit={handleFormSubmit}
            fields={applicationFields}
            submitButtonText="Submit"
            clearButtonText="Clear Form"
            isSubmitDisabled={isSubmitDisabled} 
        />
    );
}