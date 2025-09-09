import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { BrowserUtils } from "@azure/msal-browser";
import { useState, useEffect } from "react";
import styles from "./styles/Login.module.scss";

export default function Login() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userDisplayName, setUserDisplayName] = useState("");
    const [userPhotoUrl, setUserPhotoUrl] = useState("");

    const { instance } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const account = instance.getActiveAccount();

    useEffect(() => {
        if (isAuthenticated && account) {
            setIsLoggedIn(true);
            setUserDisplayName(account.name || "UNKNOWN USER");
            fetchUserPhoto();
        }
    }, [isAuthenticated, account]);

    const fetchUserPhoto = async () => {
        try {
            const tokenResponse = await instance.acquireTokenSilent({
                scopes: ["User.Read"],
                account: account,
            });

            const photoResponse = await fetch(
                "https://graph.microsoft.com/v1.0/me/photo/$value",
                {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.accessToken}`,
                    },
                }
            );

            if (photoResponse.ok) {
                const photoBlob = await photoResponse.blob();
                const photoUrl = URL.createObjectURL(photoBlob);
                setUserPhotoUrl(photoUrl);
            } else {
                console.warn("No profile photo found.");
            }
        } catch (error) {
            console.error("Error fetching profile photo:", error);
        }
    };

    const handleLogin = async () => {
        try {
            let res;
            try {
                res = await instance.ssoSilent({ scopes: ["User.Read"] });
            } catch {
                res = await instance.loginPopup({ scopes: ["User.Read"] });
            }

            if (res.account) {
                instance.setActiveAccount(res.account);
                setIsLoggedIn(true);
                setUserDisplayName(res.account.name || "UNKNOWN USER");
                fetchUserPhoto();
            } else {
                setIsLoggedIn(false);
            }
        } catch (error) {
            setIsLoggedIn(false);
            console.error("Login failed:", error);
        }
    };

    const handleLogout = async () => {
        const activeAccount = instance.getActiveAccount();
        setIsLoggedIn(false);
        setUserDisplayName("");
        setUserPhotoUrl("");

        await instance.logoutRedirect({
            account: activeAccount,
            postLogoutRedirectUri: import.meta.env.VITE_ENTRA_LOGOUT_REDIRECT_URI,
            onRedirectNavigate: () => !BrowserUtils.isInIframe(),
        }).catch((e) => {
            console.error("Logout error:", e);
        });
    };

    return (
        <div className={styles.loginContainer}>
            {!isLoggedIn && (
                <a className={styles.loginButton} onClick={handleLogin}>
                    Sign in
                </a>
            )}
            {isLoggedIn && (
                <div className={styles.wrapper}>
                    <div className={styles.dropdown}>
                        <button className={styles.dropbtn}>
                            <div className={styles.user}>
                                <p>{userDisplayName}</p>
                                {userPhotoUrl && (
                                    <img
                                        src={userPhotoUrl}
                                        alt="Profile"
                                        className={styles.userPhoto}
                                    />
                                )}
                            </div>
                        </button>
                        <div className={styles.dropdownContent}>
                            <a href="https://myprofile.microsoft.com/">Profile</a>
                            <a href="https://myapps.microsoft.com/">Apps</a>
                            <a onClick={handleLogout}>Logout</a>
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
}