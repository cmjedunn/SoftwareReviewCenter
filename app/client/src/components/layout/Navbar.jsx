import { Link } from "react-router-dom";
import styles from "./styles/Navbar.module.scss";
import logo from "../../assets/logo.png";

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
                    <li><Link to="/applications">Applications</Link></li>
                </ul>
            </div>

        </nav>
    );
}