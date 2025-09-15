import styles from './styles/Card.module.scss'

export default function Card(props) {
    return (
        <div className={styles.card}>
            {props.children}
        </div>
    );
}