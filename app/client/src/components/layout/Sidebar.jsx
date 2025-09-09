import React, { useState } from 'react';
import styles from './styles/Sidebar.module.scss';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => !prev);
    };

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <button className={styles.togglebutton} onClick={toggleSidebar}>
                ☰
            </button>

            <nav className={styles.menu}>
                <a href="#">🏠 Home</a>
                <a href="#">🔍 Search</a>
                <a href="#">⚙️ Settings</a>
            </nav>
        </div>
    );
};

export default Sidebar;
