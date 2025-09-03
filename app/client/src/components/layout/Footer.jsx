import { Link } from "react-router-dom";
import styles from "./styles/Navbar.module.scss";
import logo from "../../assets/logo.png";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            {/* <div className={styles.logo}>
                <Link to="/">
                    <image src={logo} alt="Logo" className={styles.logo} />
                </Link>
            </div>
            <ul className={styles.navLinks}>
                <li><Link to="/endpoint"></Link></li>
            </ul> */}
        </footer>
    );
}