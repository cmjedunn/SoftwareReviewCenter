import styles from './styles/NotificationCard.module.scss';
import { Card } from '../layout/Card';

function NotificationCard({ children, className }) {
    return (
        <Card className={`${styles.notificationCard} ${className || ''}`}>
            {children}
        </Card>
    );
}

export function SuccessNotificationCard({ children }) {
    return (
        <NotificationCard className={styles.successNotificationCard}>
            {children}
        </NotificationCard>
    );
}

export function ProgressNotificationCard({ children }) {
    return (
        <NotificationCard className={styles.progressNotificationCard}>
            {children}
        </NotificationCard>
    );
}

export function ErrorNotificationCard({ children }) {
    return (
        <NotificationCard className={styles.NotificationCard}>
            {children}
        </NotificationCard>
    );
}