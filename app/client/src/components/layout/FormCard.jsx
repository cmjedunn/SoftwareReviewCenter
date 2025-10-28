import { Form } from "react-router-dom";
import React from 'react';
import styles from './styles/FormCard.module.scss';
import { Card } from './Card';

const FormCard = ({
    title = "Form",
    method = "post",
    action,
    fields = [],
    onSubmit,
    submitButtonText = "Submit",
    clearButtonText = "Clear",
    isSubmitDisabled = false,        // ✨ New prop to disable submit
    disabledMessage = null           // ✨ Optional message to show why disabled
}) => {
    const handleClear = (e) => {
        e.preventDefault();
        const form = e.target.closest('form');
        if (form) {
            form.reset();
        }
    };

    const handleSubmit = async (e) => {
        // ✨ Prevent submission if disabled
        if (isSubmitDisabled) {
            e.preventDefault();
            return;
        }

        if (onSubmit) {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await onSubmit(formData);

                // 🎯 Auto-clear form after successful submission
                console.log('✅ Form submitted successfully, clearing form...');
                const form = e.target;
                if (form) {
                    form.reset();
                }

            } catch (error) {
                console.error('Form submission error:', error);
                // Don't clear form on error - let user see their input
            }
        }
    };

    const renderField = (field) => {
        switch (field.type) {
            case 'text':
            case 'email':
            case 'url':
            case 'tel':
                return (
                    <input
                        type={field.type}
                        name={field.name}
                        defaultValue={field.defaultValue || ''}
                        placeholder={field.placeholder || ''}
                        className={styles.input}
                        required={field.required}
                        disabled={isSubmitDisabled}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        name={field.name}
                        defaultValue={field.defaultValue || ''}
                        placeholder={field.placeholder || ''}
                        rows={field.rows || 4}
                        className={styles.textarea}
                        required={field.required}
                        disabled={isSubmitDisabled}
                    />
                );

            case 'select':
                return (
                    <select
                        name={field.name}
                        defaultValue={field.defaultValue || ''}
                        className={styles.select}
                        required={field.required}
                        disabled={isSubmitDisabled}
                    >
                        <option value="">{field.placeholder || 'Select an option...'}</option>
                        {field.options?.map((option, index) => (
                            <option key={index} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'hidden':
                return (
                    <input
                        type="hidden"
                        name={field.name}
                        value={field.value || ''}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        name={field.name}
                        defaultValue={field.defaultValue || ''}
                        placeholder={field.placeholder || ''}
                        className={styles.input}
                        required={field.required}
                        disabled={isSubmitDisabled}
                    />
                );
        }
    };

    return (
        <Card className={styles.formCard} title={title}>
            <Form
                method={method}
                action={action}
                onSubmit={handleSubmit}
                className={styles.form}
            >
                <div className={styles.formContent}>
                    {fields.map((field, index) => (
                        <div key={field.name || index} className={styles.fieldGroup}>
                            {field.type !== 'hidden' && (
                                <label className={styles.label}>
                                    {field.label} {field.required && <span className={styles.required}>*</span>}
                                </label>
                            )}
                            {renderField(field)}
                            {field.helpText && (
                                <div className={styles.helpText}>
                                    {field.helpText}
                                </div>
                            )}
                        </div>
                    ))}


                    {disabledMessage && (
                        <div className={styles.disabledMessage}>
                            <small>{disabledMessage}</small>
                        </div>
                    )}
                </div>

                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                        disabled={isSubmitDisabled}
                    >
                        {clearButtonText}
                    </button>

                    <button
                        type="submit"
                        className={`${styles.submitButton} ${isSubmitDisabled ? styles.disabled : ''}`}
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitDisabled ? 'Processing...' : submitButtonText}
                    </button>
                </div>
            </Form>
        </Card>
    );
};

export default FormCard;