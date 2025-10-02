import styles from './styles/Card.module.scss'


export function Card(props) {
    return (
        <div className={styles.card}>
            <div className={styles.cardContent}>
                {props.title && <h3 className={styles.title}>{props.title}</h3>}
                {props.children && <p className={styles.description}>{props.children}</p>}
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