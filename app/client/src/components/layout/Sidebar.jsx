import React, { useState, Children, cloneElement, isValidElement } from 'react';
import styles from './styles/Sidebar.module.scss';

const Sidebar = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  const animatedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;

    const delay = `${index * 0.05}s`;

    const existingClass = child.props.className || '';

    return cloneElement(child, {
      className: `${styles.menuItem} ${!isCollapsed ? styles.menuLinkAnimated : ''} ${existingClass}`.trim(),
      style: {
        ...child.props.style,
        animationDelay: !isCollapsed ? delay : '0s',
      },
    });
  });

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <button className={styles.togglebutton} onClick={toggleSidebar}>
        ☰
      </button>
      <nav className={styles.menu}>
        {animatedChildren}
      </nav>
    </div>
  );
};

export default Sidebar;
