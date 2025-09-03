import { Link } from "react-router-dom";
import styles from "./styles/Navbar.module.scss";
import logo from "../../assets/logo.png";

export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">
                    <image src={logo} alt="Logo" classname={styles.logo} />
                </Link>
            </div>
            <ul className={styles.navLinks}>
                <li><Link to="/endpoint"></Link></li>
            </ul>
        </nav>
    );
}