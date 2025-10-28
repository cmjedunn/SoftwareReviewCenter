import { Link } from "react-router-dom";

import styles from "./styles/Utils.module.scss"

import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { Card } from "./Card";

import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";

export function PageWrapper(props) {
    return (
        <div className={styles.pageWrapper}>
            <title>JE Dunn - Software Review Tool</title>
            <Navbar />
            <div className={styles.content}>
                <span>
                    <Sidebar>
                        <Link to="/applications">Applications</Link>
                        <Link to="/thirdparties">Third Parties</Link>
                    </Sidebar>
                </span>
                {props.children}
            </div>
            {/* <Footer /> */}
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
        <>
            <AuthenticatedTemplate>
                <div className={styles.mainContent}>{props.children}</div>
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
                <div className={styles.mainContent}>
                    <Card title="This content is unauthorized." className={styles.unauthorized} >
                        <div className={styles.unauthorized}>
                            <p>Please sign in with an authorized account.</p>
                        </div>
                    </Card>
                </div>
            </UnauthenticatedTemplate>
        </>
    );
}