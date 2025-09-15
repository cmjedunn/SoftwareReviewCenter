import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Applications from "./pages/Applications";
import ThirdParties from "./pages/ThirdParties";

//Import the loaders for those components
import * as resources from "./loaders/example-loader";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home/>,
        //loader: resources.load_all  
    },
    {
        path: "/applications",
        element: <Applications/>
    },
    {
        path: "/thirdparties", 
        element: <ThirdParties/>
    }
]);

export default router;