import { useState } from 'react'

import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'


function Home() {
  const [count, setCount] = useState(0)

  return (

    <div className="page-wrapper">
      <title>JE Dunn - Software Review Manager</title>
      <Navbar />
      <div className="main-content">
        <h1>Vite + React</h1>
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <Footer />
    </div>

  )
}

export default Home
