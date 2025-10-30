import { redirect } from "react-router-dom";
import { authenticatedFetch } from '../services/authService.js';

const backend = import.meta.env.VITE_BACKEND_URL || "";

async function create({ request }) {
    const formData = await request.formData();

    // Convert FormData to a regular object
    const applicationData = {
        name: formData.get('name'),
        owner: formData.get('owner'),
        description: formData.get('description'),
        environment: formData.get('environment')
    };

    console.log('🔍 Sending application data:', applicationData);

    const response = await authenticatedFetch(`${backend}/api/applications/`, {
        method: "POST",
        body: JSON.stringify(applicationData),
    });

    if (response.ok) {
        let createdApplicationRecord = await response.json();
        console.log('✅ Application created:', createdApplicationRecord);

        // Redirect to the frontend applications page, not the API endpoint
        return redirect("/applications");
    } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to create application:', errorData);

        // Return error data that can be displayed to the user
        return {
            error: errorData.error || `Failed to create application: ${response.status} ${response.statusText}`
        };
    }
}

export default { create };