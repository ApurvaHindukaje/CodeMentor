import './globals.css'
import '../features/navbar/navbar.css'
import '../features/auth/auth.css'
import '../features/problems/problems.css'
import '../features/ai-mentor/ai-mentor.css'

export const metadata = {
  title: 'CodeMentor AI - Interactive Full-Stack Coding Platform',
  description: 'Practice algorithmic coding challenges, track your progress, and level up your skills with CodeMentor AI backed by FastAPI and PostgreSQL.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="root-app-container">
          {children}
        </div>
      </body>
    </html>
  )
}
