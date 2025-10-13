import React, { useState } from 'react';
import styles from './styles/DeleteButton.module.scss';

const DeleteButton = ({ 
    onDelete, 
    applicationName = "this application",
    disabled = false,
    className = "",
    showConfirmation = true,
    buttonText = "Delete Application"
}) => {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleClick = (e) => {
        e.preventDefault();
        
        if (!showConfirmation) {
            onDelete();
            return;
        }

        if (!isConfirming) {
            setIsConfirming(true);
        } else {
            onDelete();
            setIsConfirming(false);
        }
    };

    const handleCancel = (e) => {
        e.preventDefault();
        setIsConfirming(false);
    };

    if (isConfirming) {
        return (
            <div className={`${styles.confirmationGroup} ${className}`}>
                <p className={styles.confirmationText}>
                    Delete "{applicationName}"? This action cannot be undone.
                </p>
                <div className={styles.confirmationButtons}>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={styles.cancelButton}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleClick}
                        className={styles.confirmDeleteButton}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Yes, Delete
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`${styles.deleteButton} ${className}`}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            {buttonText}
        </button>
    );
};

export default DeleteButton;