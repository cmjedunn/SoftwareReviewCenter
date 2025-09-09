import { Link } from "react-router-dom";

import styles from "./styles/Navbar.module.scss";

import logo from "../../assets/logo.png";
import Login from '../resource/Login';


export default function Navbar() {
    return (
        <nav className={styles.navbar}>

            <Link to="/" className={styles.logo}>
                <img src={logo} alt="Logo" />
                <p>Software Review Manager</p>
            </Link>
            <div className={styles.navlinks}>
                {/* <ul>
                    <li><Link to="/applications">Applications</Link></li>
                </ul> */}
            </div>
            <div className={styles.login}>
                <Login />
            </div>

        </nav>
    );
}