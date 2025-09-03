import {createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
//Import all resource components:

//Import the loaders for those components
import * as resources from "./loaders/example-loader";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home/>,
        //loader: resources.load_all  
    }
]);

export default router;