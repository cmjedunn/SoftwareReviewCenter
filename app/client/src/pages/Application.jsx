import { PageWrapper, AuthContent } from '../components/layout/Utils';
import { Card } from '../components/layout/Card';
import styles from './styles/Application.module.scss'; // Use dedicated Applications styles
import { useLoaderData } from 'react-router-dom';

export default function Applications() {

    const applicationRecord = useLoaderData();

    return (
        <PageWrapper>
            <AuthContent>
                <Card className={styles.appCard} title={applicationRecord.name}></Card>
            </AuthContent>
        </PageWrapper>
    );
}