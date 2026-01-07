import React from 'react';
import styles from './styles/EditButton.module.scss';

const EditButton = ({
    onEdit,
    disabled = false,
    className = "",
    buttonText = "Edit Application"
}) => {
    const handleClick = (e) => {
        e.preventDefault();
        onEdit();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`${styles.editButton} ${className}`}
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            {buttonText}
        </button>
    );
};

export default EditButton;
