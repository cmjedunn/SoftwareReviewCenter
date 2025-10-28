import React, { useState, Children, cloneElement, isValidElement, useEffect } from 'react';
import styles from './styles/Sidebar.module.scss';

const Sidebar = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 600);
      // Auto-collapse on mobile when switching to mobile view
      if (window.innerWidth <= 600) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && !isCollapsed) {
        const sidebar = event.target.closest(`.${styles.sidebar}`);
        if (!sidebar) {
          setIsCollapsed(true);
        }
      }
    };

    // Only add listener when mobile menu is open
    if (isMobile && !isCollapsed) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobile, isCollapsed]);

  const toggleSidebar = (event) => {
    event.stopPropagation(); // Prevent immediate closing from click outside
    setIsCollapsed(prev => !prev);
  };

  const handleMenuItemClick = (originalOnClick) => {
    return (event) => {
      // Close mobile menu when item is clicked
      if (isMobile) {
        setIsCollapsed(true);
      }
      // Call original onClick if it exists
      if (originalOnClick) {
        originalOnClick(event);
      }
    };
  };

  const animatedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;

    const delay = `${index * 0.05}s`;
    const existingClass = child.props.className || '';

    // For mobile, use different animation class and no delays
    if (isMobile) {
      const delay = `${(index + 3) * 0.05}s`;
      return cloneElement(child, {
        className: `${styles.menuItem} ${!isCollapsed ? styles.menuLinkAnimated : ''} ${existingClass}`.trim(),
        style: {
          ...child.props.style,
          animationDelay: delay,
        },
        onClick: handleMenuItemClick(child.props.onClick)
      });
    }

    // Desktop vertical layout with staggered animations
    return cloneElement(child, {
      className: `${styles.menuItem} ${!isCollapsed ? styles.menuLinkAnimated : ''} ${existingClass}`.trim(),
      style: {
        ...child.props.style,
        animationDelay: !isCollapsed ? delay : '0s',
      },
      onClick: handleMenuItemClick(child.props.onClick)
    });
  });

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.togglebutton}
        onClick={toggleSidebar}
        aria-label={isMobile ? 'Toggle navigation menu' : 'Toggle sidebar'}
      >
        <p>☰</p>
      </button>
      <nav className={styles.menu}>
        {animatedChildren}
      </nav>
    </div>
  );
};

export default Sidebar;