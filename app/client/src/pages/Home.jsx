import { useState } from 'react'
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";

import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

export default function Home() {

  return (

    <div className="page-wrapper">
      <title>JE Dunn - Software Review Tool</title>
      <Navbar />
      <div className="main-content">
        <div className="card">
          <AuthenticatedTemplate>
            {/* Display user details fetched from Microsoft Graph */}

            <p>Welcome, authenticated user!</p>


          </AuthenticatedTemplate>
          <UnauthenticatedTemplate>
            <p>Please sign in.</p>
          </UnauthenticatedTemplate>
        </div>
      </div>
      <Footer />
    </div>


  );
}
