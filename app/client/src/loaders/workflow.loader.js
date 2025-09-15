/**
 * NOTE REPLACE ALL ENDPOINT AND RESOURCES WITH THE APPROPREATE ENDPOINT/RESOURCE FOR THIS LOADER
 */

const backend = import.meta.env.VITE_BACKEND_URL || "";

export async function load_one( {params} ) {
    const res = await fetch(`${backend}/api/workflows/${params.id}`);
    if (!res.ok) {
        throw new Response("Failed to load resource.", { status: res.status });
    }
    const data = await res.json();
    return { resourse: data };
}

export async function load_all() {
    const res = await fetch(`${backend}/api/*ENDPOINT HERE*`);
    if (!res.ok) {
        throw new Response("Failed to load resources.", { status: res.status });
    }
    const data = await res.json();
    return { resourse: data };
}