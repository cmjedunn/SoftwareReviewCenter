import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Applications from "./pages/Applications";
import Application from "./pages/Application";
import ThirdParties from "./pages/ThirdParties";

// Loaders
//import * as applications from "./loaders/applications.loader";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />
    },
    {
        path: "/applications",
        element: <Applications />,
        // loader: applications.load_all
    },
    {
        path: "/applications/:id",
        element: <Application />,
    },
    {
        path: "/thirdparties",
        element: <ThirdParties />
    },

]);

export default router;