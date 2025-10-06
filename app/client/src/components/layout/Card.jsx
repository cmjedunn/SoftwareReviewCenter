import styles from './styles/Card.module.scss'

export function Card({ title, children, className }) {
    return (
        <div className={`${styles.card} ${className || ''}`}>
            <div className={styles.cardContent}>
                {title && <h3 className={styles.title}>{title}</h3>}
                {children && <div className={styles.description}>{children}</div>}
            </div>
        </div>
    );
}

export function LoadingCard(){
    return (
        <div className={styles.card}>
            <div className={styles.cardContent}>
                <p>Loading...</p>
            </div>
        </div>
    );
}

export function GridCard(props) {
    return (
        <div className={styles.gridCard}>

            {props.children}
        </div>
    );
}