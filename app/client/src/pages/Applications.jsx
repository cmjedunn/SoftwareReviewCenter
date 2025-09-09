import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import styles from './styles/Applications.module.scss'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

export default function Applications() {

  return (
    
    <div className="page-wrapper">
      <Navbar />
          <AuthenticatedTemplate>
            {/* Display user details fetched from Microsoft Graph */}

            <p>Welcome, authenticated user!</p>


          </AuthenticatedTemplate>
          <UnauthenticatedTemplate>
            <p>Please sign in.</p>
          </UnauthenticatedTemplate>
      <Footer />
    </div>


  );
}
