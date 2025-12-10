import { createAuthenticatedLoader } from '../utils/createAuthenticatedLoader.js';


const backend = import.meta.env.VITE_BACKEND_URL || "";

async function load_one_internal({ params, authenticatedFetch }) {
    const res = await authenticatedFetch(`${backend}/api/applications/${params.id}`);
    if (!res.ok) {
        throw new Response("Failed to load resource.", { status: res.status });
    }
    const data = await res.json();
    return { resourse: data };
}

async function load_all_internal({ authenticatedFetch }) {
    const res = await authenticatedFetch(`${backend}/api/applications/`);
    if (!res.ok) {
        throw new Response("Failed to load resources.", { status: res.status });
    }
    const data = await res.json();
    return { resource: data };
}

export const load_one = createAuthenticatedLoader(load_one_internal);
export const load_all = createAuthenticatedLoader(load_all_internal);
