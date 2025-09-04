import { Link } from "react-router-dom";
import styles from "./styles/Navbar.module.scss";
import logo from "../../assets/logo.png";
import Login from '../resource/Login';


export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">
                    <img src={logo} alt="Logo" className={styles.logo} />
                </Link>
            </div>
            <div className={styles.name}>
                <p>Software Review Manager</p>
            </div>
            <div className={styles.navlinks}>
                <ul>
                    <li><Link to="/applications">Third-Parties</Link></li>
                    <li><Link to="/applications">Applications</Link></li>
                </ul>
            </div>
            <div className={styles.login}>
                <Login />
            </div>

        </nav>
    );
}