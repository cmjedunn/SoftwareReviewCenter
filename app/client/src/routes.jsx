import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Applications from "./pages/Applications";
import ThirdParties from "./pages/ThirdParties";
import AddApplicationForm from "./components/resource/AddApplicationForm";

import applicationRecordActions from "./actions/applicationRecordActions";

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
        action: applicationRecordActions.create
        // loader: applications.load_all
    },
    {
        path: "/thirdparties", 
        element: <ThirdParties/>
    },
]);

export default router;