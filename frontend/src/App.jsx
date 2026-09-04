import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight, BarChart3, Camera, Check, ChevronDown, CircleHelp,
  Leaf, Menu, Mic, MicOff, Phone, ScanLine, ShieldCheck,
  ShoppingBasket, Sprout, TrendingUp, Upload, Volume2, VolumeX, X,
} from 'lucide-react'
import './App.css'

/* ─── constants ─────────────────────────────────────────────────────── */
const STEPS = [
  { label: 'Voice assistant', icon: Mic },
  { label: 'Crop grading',    icon: ScanLine },
  { label: 'Marketplace',     icon: ShoppingBasket },
]

const IMPACT_METRICS = [
  ['2.4 min',   'average response time',        'down 42%'],
  ['86%',       'successful conversations',      'voice-first access'],
  ['₹1.53L Cr', 'post-harvest loss / year',      'recoverable value'],
]

const LANG_MAP = {
  Hindi:   { bcp: 'hi-IN', label: 'हिन्दी'  },
  English: { bcp: 'en-IN', label: 'English' },
  Marathi: { bcp: 'mr-IN', label: 'मराठी'  },
  Telugu:  { bcp: 'te-IN', label: 'తెలుగు' },
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:8000`

/* ─── helpers ───────────────────────────────────────────────────────── */
function speak(text, bcp, muted) {
  if (muted || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = bcp
  utt.rate = 0.95
  utt.pitch = 1.0
  window.speechSynthesis.speak(utt)
}

/* ─── App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [activeStep,   setActiveStep]   = useState('Voice assistant')
  const [language,     setLanguage]     = useState('Hindi')
  const [muted,        setMuted]        = useState(false)

  // voice panel
  const [isListening,  setIsListening]  = useState(false)
  const [interim,      setInterim]      = useState('')   // live transcript
  const [voiceText,    setVoiceText]    = useState('')
  const [voiceReply,   setVoiceReply]   = useState('')

  // grading panel
  const [fileName,     setFileName]     = useState('')
  const [gradeResult,  setGradeResult]  = useState(null)

  // shared
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiError,     setApiError]     = useState('')
  const [mobileOpen,   setMobileOpen]   = useState(false)

  const fileInput     = useRef(null)
  const recognition   = useRef(null)
  const workspaceRef  = useRef(null)
  const marketRef     = useRef(null)

  const bcp = LANG_MAP[language]?.bcp ?? 'hi-IN'

  /* scroll helper */
  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' })

  const selectStep = (step) => {
    setActiveStep(step)
    scrollTo(workspaceRef)
  }

  /* ── stop TTS on unmount ── */
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  /* ── voice assistant call ── */
  const askAssistant = useCallback(async (msgOverride = '') => {
    const message = (msgOverride || voiceText).trim() || 'Which crop should I sell first?'
    setIsListening(false)
    setInterim('')
    setIsProcessing(true)
    setApiError('')
    try {
      const res  = await fetch(`${API_BASE}/api/voice`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message, language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail?.[0]?.msg || 'Assistant is unavailable.')
      setVoiceReply(data.reply)
      speak(data.reply, bcp, muted)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [voiceText, language, bcp, muted])

  /* ── STT toggle ── */
  const toggleSTT = () => {
    if (isListening) {
      recognition.current?.stop()
      setIsListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setApiError('Voice capture is not supported in this browser. Please use Chrome or Edge.')
      return
    }
    window.speechSynthesis?.cancel()  // mute TTS while listening
    const rec = new SR()
    rec.lang              = bcp
    rec.interimResults    = true
    rec.maxAlternatives   = 1
    rec.continuous        = false

    rec.onresult = (e) => {
      let final = '', inter = ''
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript
        else                inter += result[0].transcript
      }
      if (inter) setInterim(inter)
      if (final) {
        setVoiceText(final)
        setInterim('')
        askAssistant(final)
      }
    }
    rec.onerror = () => {
      setApiError('Could not hear that. Please try again or type your question.')
      setIsListening(false)
    }
    rec.onend = () => setIsListening(false)

    recognition.current = rec
    setApiError('')
    setIsListening(true)
    rec.start()
  }

  /* ── image upload & grading ── */
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setGradeResult(null)
    setApiError('')
    setIsProcessing(true)
    const form = new FormData()
    form.append('image', file)
    try {
      const res  = await fetch(`${API_BASE}/api/grade`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Unable to grade this image.')
      setGradeResult(data)
      // auto-navigate to marketplace tab
      setActiveStep('Marketplace')
      setTimeout(() => scrollTo(marketRef), 200)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  /* ── replay TTS for last reply ── */
  const replayTTS = () => voiceReply && speak(voiceReply, bcp, false)

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <main className="app-shell">

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AgriSahayak home">
          <span className="brand-mark"><Sprout size={20} /></span>
          <span>Agri<span>Sahayak</span></span>
        </a>

        <button
          className="mobile-menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={mobileOpen ? 'nav-links open' : 'nav-links'}>
          <a className="active" href="#workspace">Workspace</a>
          <a href="#how-it-works">How it works</a>
          <a href="#impact">Impact</a>
          <button className="help-link"><CircleHelp size={16} /> Help centre</button>
        </nav>

        <div className="profile">
          <span>RK</span>
          <div><strong>Ramesh Kumar</strong><small>Farmer account</small></div>
          <ChevronDown size={16} />
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse-dot" /> Good morning, Ramesh</p>
          <h1>Make every harvest<br /><em>count.</em></h1>
          <p className="hero-text">
            Your voice, your crops, your market. Get practical guidance
            and a fair route for every kilogram you grow.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => selectStep('Voice assistant')}>
              <Mic size={18} /> Talk to AgriSahayak <ArrowRight size={17} />
            </button>
            <button className="quiet-action" onClick={() => selectStep('Crop grading')}>
              <Camera size={18} /> Grade a crop
            </button>
          </div>
          <div className="trust-line">
            <ShieldCheck size={16} /> Works on a basic phone call
            <span /> <Leaf size={16} /> Available in 4 languages
          </div>
        </div>

        <div className="hero-art" aria-label="Illustration of a farmer and crop field">
          <div className="sun" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="farmer">
            <div className="hat" /><div className="head" /><div className="body" />
            <div className="arm" />
            <div className="phone"><Phone size={13} /></div>
          </div>
          <div className="crop crop-one"><span /><span /><span /></div>
          <div className="crop crop-two"><span /><span /><span /></div>
          <div className="crop crop-three"><span /><span /><span /></div>
          <div className="art-label">
            <TrendingUp size={17} />
            <span><b>+24%</b><small>value recovered</small></span>
          </div>
        </div>
      </section>

      {/* ── WORKSPACE ── */}
      <section className="workflow" id="workspace" ref={workspaceRef}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your harvest workspace</p>
            <h2>What do you need today?</h2>
          </div>
          <div className="language-picker">
            <span>Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select language"
            >
              {Object.keys(LANG_MAP).map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <ChevronDown size={15} />
          </div>
        </div>

        {/* step tabs */}
        <div className="step-tabs">
          {STEPS.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              className={activeStep === label ? 'step-tab selected' : 'step-tab'}
              onClick={() => setActiveStep(label)}
              id={`step-tab-${i + 1}`}
            >
              <span className="step-number">0{i + 1}</span>
              <Icon size={18} />
              {label}
              {i < STEPS.length - 1 && <ArrowRight className="step-arrow" size={16} />}
            </button>
          ))}
        </div>

        {/* panels grid */}
        <div className="workspace-grid">

          {/* ── VOICE PANEL ── */}
          <section className="voice-panel panel">
            <div className="panel-top">
              <div>
                <span className="tag green">AI VOICE ASSISTANT</span>
                <h3>Ask anything about your farm.</h3>
              </div>
              <div className="panel-top-actions">
                <span className="online"><i /> Online</span>
                <button
                  className="icon-btn"
                  onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel() }}
                  title={muted ? 'Unmute voice' : 'Mute voice'}
                  aria-label={muted ? 'Unmute voice' : 'Mute voice'}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                {voiceReply && !muted && (
                  <button className="icon-btn" onClick={replayTTS} title="Replay last reply" aria-label="Replay reply">
                    <Volume2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* conversation */}
            <div className="conversation">
              <div className="assistant-avatar"><Sprout size={20} /></div>
              <div className="bubble assistant-bubble">
                <small>AgriSahayak · just now</small>
                <p>{voiceReply || 'Namaste Ramesh! How can I help you today?'}</p>
              </div>
              <div className="bubble farmer-bubble">
                <small>You · just now</small>
                <p>{interim || voiceText || 'Which crop should I sell first?'}</p>
              </div>
            </div>

            {/* text input */}
            <div className="voice-input">
              <input
                id="voice-text-input"
                value={interim || voiceText}
                onChange={(e) => { setVoiceText(e.target.value); setInterim('') }}
                placeholder="Type a question or tap the mic…"
                onKeyDown={(e) => e.key === 'Enter' && askAssistant()}
                aria-label="Type your question"
              />
              <button onClick={() => askAssistant()} aria-label="Send question" id="send-btn">
                <ArrowRight size={16} />
              </button>
            </div>

            {/* mic button */}
            <button
              id="mic-btn"
              className={isListening ? 'listen-button listening' : 'listen-button'}
              onClick={toggleSTT}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              <span className="listen-icon">
                {isListening
                  ? <span className="bars"><i /><i /><i /><i /></span>
                  : <Mic size={24} />}
              </span>
              <span>{isListening ? 'Listening… tap to finish' : 'Tap to speak'}</span>
              <small>{isListening ? 'I am hearing you' : `${language} · tap mic to start`}</small>
            </button>

            <div className="voice-note">
              <span className="lock-dot">⌁</span>
              {isProcessing ? 'AgriSahayak is thinking…' : 'Your conversation stays private'}
              <span className="voice-time">
                {muted ? <MicOff size={11} /> : <Volume2 size={11} />}
                {muted ? ' Muted' : ' Voice on'}
              </span>
            </div>
          </section>

          {/* ── GRADING PANEL ── */}
          <section className="grade-panel panel">
            <div className="panel-top">
              <div>
                <span className="tag orange">CROP GRADING</span>
                <h3>See what your crop is worth.</h3>
              </div>
              <span className="info-badge">AI + expert</span>
            </div>

            <div
              className={fileName ? 'upload-box has-file' : 'upload-box'}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
              aria-label="Upload crop image"
            >
              <input
                ref={fileInput}
                id="crop-image-input"
                type="file"
                accept="image/*"
                onChange={handleFile}
              />
              <div className="upload-icon">
                {fileName ? <Check size={25} /> : <Upload size={24} />}
              </div>
              <strong>{fileName || 'Upload a crop photo'}</strong>
              <span>
                {isProcessing
                  ? 'AI is assessing your crop…'
                  : fileName ? 'Assessment complete — check Marketplace tab'
                  : 'JPG or PNG · up to 10 MB'}
              </span>
              {!fileName && <button type="button">Browse files</button>}
            </div>

            {gradeResult && (
              <div className="grade-result">
                <span className="grade-score">{gradeResult.grade}</span>
                <span>
                  <b>{gradeResult.market === 'food' ? 'Food marketplace' : 'Waste marketplace'}</b>
                  <small>
                    {Math.round(gradeResult.confidence * 100)}% confidence · {gradeResult.reason}
                  </small>
                </span>
              </div>
            )}

            <div className="grade-footer">
              <div>
                <span className="mini-icon"><ScanLine size={16} /></span>
                <span>
                  <b>Fair, transparent grading</b>
                  <small>Size · colour · ripeness · defects</small>
                </span>
              </div>
              <button className="text-button" onClick={() => fileInput.current?.click()}>
                Use camera <Camera size={15} />
              </button>
            </div>
          </section>
        </div>

        {/* ── MARKETPLACE PANEL (below grid, full width) ── */}
        <section className="marketplace-panel panel" ref={marketRef} id="marketplace-panel">
          <div className="panel-top">
            <div>
              <span className="tag green">SMART MARKETPLACE ROUTING</span>
              <h3>Where does your crop go?</h3>
            </div>
          </div>
          {gradeResult ? (
            <div className="market-result">
              <div className={`market-card ${gradeResult.market}`}>
                <div className="market-icon">
                  {gradeResult.market === 'food'
                    ? <ShoppingBasket size={28} />
                    : <Leaf size={28} />}
                </div>
                <div className="market-info">
                  <strong>{gradeResult.destination}</strong>
                  <p>{gradeResult.reason}</p>
                  <div className="buyer-chips">
                    {gradeResult.buyer_types?.map(b => (
                      <span key={b} className="chip">{b}</span>
                    ))}
                  </div>
                </div>
                <div className="market-grade">
                  <span className="grade-badge">{gradeResult.grade}</span>
                  <small>{Math.round(gradeResult.confidence * 100)}% confidence</small>
                </div>
              </div>
              <button
                className="quiet-action retry-btn"
                onClick={() => { fileInput.current?.click() }}
              >
                <Camera size={16} /> Grade another crop
              </button>
            </div>
          ) : (
            <div className="market-empty">
              <ScanLine size={32} />
              <p>Upload a crop photo in the <strong>Crop Grading</strong> panel above — we'll automatically route it to the right marketplace.</p>
            </div>
          )}
        </section>

        {apiError && <p className="api-error" role="alert">{apiError}</p>}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="routing-band" id="how-it-works">
        <div className="routing-intro">
          <p className="eyebrow">One harvest. Two opportunities.</p>
          <h2>Nothing you grow<br />should become waste.</h2>
          <p>Our AI grades your produce and routes it to the best value chain automatically.</p>
        </div>
        <div className="route-flow">
          <div className="route-source">
            <div className="produce-icon"><Sprout size={26} /></div>
            <strong>Your crop</strong>
            <small>assessed by AI</small>
          </div>
          <ArrowRight className="flow-arrow" />
          <div className="route-destinations">
            <div className="destination food">
              <span><ShoppingBasket size={21} /></span>
              <div>
                <strong>Food marketplace</strong>
                <small>Retailers · wholesalers · consumers</small>
              </div>
              <Check size={19} />
            </div>
            <div className="destination waste">
              <span><Leaf size={21} /></span>
              <div>
                <strong>Waste marketplace</strong>
                <small>Composters · biogas · recyclers</small>
              </div>
              <Check size={19} />
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT ── */}
      <section className="impact-section" id="impact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Built for measurable change</p>
            <h2>Small decisions. Big impact.</h2>
          </div>
          <a className="text-button" href="#workspace">Open dashboard <ArrowRight size={15} /></a>
        </div>
        <div className="metric-grid">
          {IMPACT_METRICS.map(([metric, label, note]) => (
            <div className="metric" key={label}>
              <BarChart3 size={20} />
              <strong>{metric}</strong>
              <span>{label}</span>
              <small>{note}</small>
            </div>
          ))}
        </div>
        <div className="impact-chain">
          <span>Voice guidance</span><ArrowRight size={15} />
          <span>Better decisions</span><ArrowRight size={15} />
          <span>Less waste</span><ArrowRight size={15} />
          <span>Higher farmer income</span>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark"><Sprout size={18} /></span>
          <span>Agri<span>Sahayak</span></span>
        </div>
        <span>AI-powered agriculture, made human.</span>
        <span>© 2026 AgriSahayak · Avenger Labs · SIH 2026</span>
      </footer>

    </main>
  )
}
