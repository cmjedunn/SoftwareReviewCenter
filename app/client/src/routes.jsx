import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Applications from "./pages/Applications";
import ThirdParties from "./pages/ThirdParties";

//Import the loaders for those components
//import * as applications from "./loaders/applications.loader";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home/>
    },
    {
        path: "/applications",
        element: <Applications/>,
        // loader: applications.load_all
    },
    {
        path: "/thirdparties", 
        element: <ThirdParties/>
    }
]);

export default router;