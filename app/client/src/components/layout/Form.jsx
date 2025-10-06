import React, { useState } from 'react';
import styles from './styles/Form.module.scss';
import { Card } from './Card';

const Form = ({
    title = "Form",
    fields = [],
    onSubmit,
    submitButtonText = "Submit",
    clearButtonText = "Clear"
}) => {
    // Initialize form data based on field definitions
    const initialData = fields.reduce((acc, field) => {
        acc[field.name] = field.defaultValue || '';
        return acc;
    }, {});

    const [formData, setFormData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (onSubmit) {
                await onSubmit(formData);
            } else {
                // Default mock behavior
                alert('Record submitted successfully!');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Error submitting record. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = () => {
        setFormData(initialData);
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
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder || ''}
                        className={styles.input}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder || ''}
                        rows={field.rows || 4}
                        className={styles.textarea}
                    />
                );

            case 'select':
                return (
                    <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className={styles.select}
                    >
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'date':
                return (
                    <input
                        type="date"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className={styles.input}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder || ''}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className={styles.input}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder || ''}
                        className={styles.input}
                    />
                );
        }
    };

    return (
        <Card className={styles.form} title={title}>
            <div className={styles.formContent}>
                {fields.map((field, index) => (
                    <div key={field.name || index} className={styles.fieldGroup}>
                        <label className={styles.label}>
                            {field.label} {field.required && <span className={styles.required}>*</span>}
                        </label>
                        {renderField(field)}
                        {field.helpText && (
                            <div className={styles.helpText}>
                                {field.helpText}
                            </div>
                        )}
                    </div>
                ))}

                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                    >
                        {clearButtonText}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`${styles.submitButton} ${isSubmitting ? styles.submitting : ''}`}
                    >
                        {isSubmitting ? 'Submitting...' : submitButtonText}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default Form;