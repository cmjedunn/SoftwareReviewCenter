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
    clearButtonText = "Clear"
}) => {
    const handleClear = (e) => {
        e.preventDefault();
        const form = e.target.closest('form');
        if (form) {
            form.reset();
        }
    };

    const handleSubmit = async (e) => {
        if (onSubmit) {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await onSubmit(formData);
            } catch (error) {
                console.error('Form submission error:', error);
                // Handle error display here if needed
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
                    />
                );

            case 'select':
                return (
                    <select
                        name={field.name}
                        defaultValue={field.defaultValue || ''}
                        className={styles.select}
                        required={field.required}
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
                </div>
                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                    >
                        {clearButtonText}
                    </button>

                    <button
                        type="submit"
                        className={styles.submitButton}
                    >
                        {submitButtonText}
                    </button>
                </div>
            </Form>
        </Card>
    );
};

export default FormCard;