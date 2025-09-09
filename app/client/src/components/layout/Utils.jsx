import { useState } from 'react';
import styles from "./styles/Utils.module.scss"

import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";

export function PageWrapper(props) {

    const [sidebarOpen, setSideBarOpen] = useState(false);
    const handleViewSidebar = () => {
        setSideBarOpen(!sidebarOpen);
    };
    return (
        <div className={styles.pageWrapper}>
            <title>JE Dunn - Software Review Tool</title>
            <Navbar />
            <div className={styles.content}>
                <span>
                    
                    <Sidebar isOpen={sidebarOpen} toggleSidebar={handleViewSidebar} />
                </span>
                {props.children}
            </div>
            <Footer />
        </div>
    );
}

export function MainContent(props) {
    return (
        <div className={styles.mainContent}>{props.children}</div>
    );
}

export function AuthContent(props) {
    return (
        <div>
            <AuthenticatedTemplate>
                <div className={styles.mainContent}>{props.children}</div>
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
                <p><b>This content is unauthorized.</b></p>
                <p>Please sign in with an authorized account.</p>
            </UnauthenticatedTemplate>
        </div>
    );
}
