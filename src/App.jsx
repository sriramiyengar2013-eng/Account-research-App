import { useState } from 'react'
import SlidePreview from './components/SlidePreview'
import { generatePptx } from './pptxGenerator'
import styles from './App.module.css'

export default function App() {
  const [companyName, setCompanyName] = useState('')
  const [research, setResearch] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const name = companyName.trim()
    if (!name) return

    setLoading(true)
    setError(null)
    setResearch(null)

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: name }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      setResearch(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!research) return
    try {
      await generatePptx(research)
    } catch (err) {
      setError('Failed to generate PowerPoint: ' + err.message)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoMark}>ARI</div>
        <div>
          <h1 className={styles.title}>Account Research Intelligence</h1>
          <p className={styles.subtitle}>
            AI-powered research briefs from annual reports and public filings
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="company" className={styles.label}>
              Company Name or Ticker
            </label>
            <div className={styles.inputRow}>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apple, MSFT, Salesforce"
                className={styles.input}
                disabled={loading}
              />
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !companyName.trim()}
              >
                {loading ? 'Researching…' : 'Generate Brief'}
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              Analyzing public filings and annual reports…
            </p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {research && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Research Brief</h2>
              <button
                onClick={handleDownload}
                className={styles.downloadButton}
              >
                Download PPTX
              </button>
            </div>
            <SlidePreview data={research} />
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by Claude AI. Data sourced from public filings and investor
          relations materials.
        </p>
      </footer>
    </div>
  )
}
