import styles from './styles/Card.module.scss'


export function Card(props) {
    return (
        <div className={styles.card}>
            
            {props.children}
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