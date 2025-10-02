const backend = import.meta.env.VITE_BACKEND_URL || "";

export async function load_one( {params} ) {
    const res = await fetch(`${backend}/api/applications/${params.id}`);
    if (!res.ok) {
        throw new Response("Failed to load resource.", { status: res.status });
    }
    const data = await res.json();
    return { resourse: data };
}

export async function load_all() {
    const url = `${backend}/api/applications/`;
    console.log('🔍 Making request to:', url);
    const res = await fetch(`${backend}/api/applications`);
    if (!res.ok) {
        throw new Response("Failed to load resources.", { status: res.status });
    }
    const data = await res.json();
    return { resourse: data };
}