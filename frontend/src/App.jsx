import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Image as ImageIcon,
  Leaf,
  Menu,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  RefreshCw,
  Scan,
  ScanLine,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import './App.css'

/* ─── Languages ──────────────────────────────────────────────────────── */
const LANG_MAP = {
  Hindi:   { bcp: 'hi-IN', label: 'हिन्दी', greeting: 'नमस्ते! मैं आपका कृषि सहायक हूँ।', badge: 'IN' },
  English: { bcp: 'en-IN', label: 'English', greeting: 'Namaste! I am AgriSahayak, your AI farm assistant.', badge: 'EN' },
  Marathi: { bcp: 'mr-IN', label: 'मराठी',  greeting: 'नमस्कार! मी तुमचा कृषी सहाय्यक आहे.', badge: 'MR' },
  Telugu:  { bcp: 'te-IN', label: 'తెలుగు',  greeting: 'నమస్కారం! నేను మీ వ్యవసాయ సహాయకుడిని.', badge: 'TE' },
}

const QUICK_PROMPTS = [
  '🌾 What is today’s tomato mandi rate?',
  '🐛 How to prevent yellow leaf curl?',
  '🚚 Where can I sell grade B produce?',
  '💧 Ideal irrigation time for wheat',
  '💰 Government subsidy for drip irrigation',
]

const MANDI_RATES = [
  { crop: 'Tomato (Hybrid)', mandi: 'Nashik Mandi', price: '₹2,400', unit: '/quintal', change: '+4.5%', trend: 'up' },
  { crop: 'Onion (Red)',    mandi: 'Lasalgaon Mandi', price: '₹1,850', unit: '/quintal', change: '+1.8%', trend: 'up' },
  { crop: 'Wheat (Sharbati)', mandi: 'Indore Mandi', price: '₹2,680', unit: '/quintal', change: '-0.8%', trend: 'down' },
  { crop: 'Cotton (Medium)', mandi: 'Warangal Mandi', price: '₹7,150', unit: '/quintal', change: '+3.2%', trend: 'up' },
  { crop: 'Potato (Jyoti)', mandi: 'Agra Mandi', price: '₹1,220', unit: '/quintal', change: '0.0%', trend: 'flat' },
]

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:8000`

/* ─── TTS helper ─────────────────────────────────────────────────────── */
function speakText(text, bcp, muted) {
  if (muted || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = bcp
  utt.rate = 0.96
  utt.pitch = 1.0
  window.speechSynthesis.speak(utt)
}

/* ─── App Component ─────────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab] = useState('assistant') // 'assistant' | 'scanner' | 'marketplace' | 'mandi'
  const [language, setLanguage]   = useState('Hindi')
  const [muted, setMuted]         = useState(false)

  // Chat message stream
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: 'Namaste! 🙏 I am AgriSahayak, your multilingual agricultural assistant. You can speak or type in Hindi, Marathi, Telugu, or English. Ask me about crop grading, current mandi prices, disease cures, or finding direct buyers!',
      timestamp: 'Just now',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Speech-to-Text state
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [sttStatus, setSttStatus] = useState('')

  // Crop Scanner state
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)

  // Feedback & alerts
  const [alertNotice, setAlertNotice] = useState('')

  const recognitionRef = useRef(null)
  const fileInputRef   = useRef(null)
  const cameraInputRef = useRef(null)
  const chatBottomRef  = useRef(null)

  const bcp = LANG_MAP[language]?.bcp || 'hi-IN'

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, interimText])

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      recognitionRef.current?.stop()
    }
  }, [])

  /* ── Send Message Flow (User first -> AI reply after) ─────────────── */
  const handleSendMessage = useCallback(async (textOverride = '') => {
    const text = (typeof textOverride === 'string' && textOverride.trim())
      ? textOverride.trim()
      : inputText.trim()

    if (!text || isProcessing) return

    // Clear input & interim
    setInputText('')
    setInterimText('')
    setAlertNotice('')

    // 1. Appends the USER message FIRST
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: now,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsProcessing(true)

    // 2. Call backend /api/voice
    try {
      const res = await fetch(`${API_BASE}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail?.[0]?.msg || errorData.detail || 'Assistant server unavailable')
      }

      const data = await res.json()
      const reply = data.reply || 'I received your query.'

      // 3. Appends the AI message AFTER the user's message
      const botMsg = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])

      // 4. Speak response aloud in user's language
      speakText(reply, bcp, muted)
    } catch (err) {
      console.error('API Error:', err)
      const errorMsg = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: `⚠️ Could not get AI reply: ${err.message}. Please check that the backend is running at ${API_BASE}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, isProcessing, language, bcp, muted])

  /* ── Microphone / Speech-to-Text Handler ─────────────────────────── */
  const toggleSpeechRecognition = async () => {
    // If already listening, stop
    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch (err) {
        console.warn(err)
      }
      setIsListening(false)
      setSttStatus('')
      return
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      setAlertNotice('Speech Recognition is not supported by your browser. Please use Google Chrome, Edge, or Safari, or type in the box below.')
      return
    }

    // Request audio stream to prompt browser for mic permissions on mobile
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop stream tracks immediately so SpeechRecognition can bind to the device
        stream.getTracks().forEach((track) => track.stop())
      }
    } catch (micErr) {
      console.warn('Microphone permission request error:', micErr)
      setAlertNotice('Microphone access was blocked. Please allow microphone permissions in your browser or type your question.')
      return
    }

    // Cancel any current text-to-speech to prevent echo
    window.speechSynthesis?.cancel()

    try {
      const rec = new SpeechRec()
      rec.lang = bcp
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.continuous = false

      rec.onstart = () => {
        setIsListening(true)
        setSttStatus('Listening... Speak your question clearly')
        setAlertNotice('')
      }

      rec.onresult = (event) => {
        let finalTrans = ''
        let interimTrans = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTrans += trans
          } else {
            interimTrans += trans
          }
        }

        if (interimTrans) {
          setInterimText(interimTrans)
        }

        if (finalTrans) {
          setInterimText('')
          setIsListening(false)
          setSttStatus('')
          handleSendMessage(finalTrans)
        }
      }

      rec.onerror = (event) => {
        console.warn('Speech Recognition error:', event.error)
        setIsListening(false)
        setSttStatus('')
        setInterimText('')

        if (event.error === 'not-allowed') {
          setAlertNotice('Microphone permission denied. Tap the lock/tune icon in your browser URL bar to allow microphone.')
        } else if (event.error === 'no-speech') {
          setAlertNotice('No speech detected. Please tap the mic and try again.')
        } else if (event.error === 'network') {
          setAlertNotice('Speech recognition network error. On mobile over Wi-Fi, you can type your query in the text box.')
        } else {
          setAlertNotice(`Speech input note: ${event.error}. You can also type your question.`)
        }
      }

      rec.onend = () => {
        setIsListening(false)
        setSttStatus('')
      }

      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setIsListening(false)
      setAlertNotice('Could not start speech recognition. Please type your message.')
    }
  }

  /* ── Image Upload & Grading Handler ──────────────────────────────── */
  const handleImageSelected = async (file) => {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setGradeResult(null)
    setIsScanning(true)
    setAlertNotice('')

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`${API_BASE}/api/grade`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze crop image.')
      }

      setGradeResult(data)

      // Add a friendly notification in chat that a crop was graded
      const gradeNotice = {
        id: 'scan_notice_' + Date.now(),
        sender: 'bot',
        text: `📸 Crop assessed! Grade: ${data.grade} (${Math.round(data.confidence * 100)}% confidence). Recommended route: ${data.destination}. Switch to the Marketplace tab to view buyers.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, gradeNotice])
    } catch (err) {
      console.error('Grading Error:', err)
      setAlertNotice(`Image Grading Failed: ${err.message}`)
    } finally {
      setIsScanning(false)
    }
  }

  /* ── Copy text to clipboard ──────────────────────────────────────── */
  const copyMessage = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="app-container">
      {/* ── TOP BAR (Native App Header) ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">
            <Sprout className="sprout-icon" size={20} />
          </div>
          <div className="brand-text">
            <div className="brand-title">
              Agri<strong>Sahayak</strong>
              <span className="ai-pill">AI 2.0</span>
            </div>
            <div className="brand-sub">
              <span className="live-dot" /> Kisan Assistant · SIH 2026
            </div>
          </div>
        </div>

        <div className="header-controls">
          {/* Language Selector */}
          <div className="lang-dropdown-wrap">
            <Globe size={14} className="globe-icon" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
              aria-label="Select Language"
            >
              {Object.entries(LANG_MAP).map(([name, item]) => (
                <option key={name} value={name}>
                  {item.label} ({name})
                </option>
              ))}
            </select>
          </div>

          {/* Sound Mute Toggle */}
          <button
            className={`tool-btn ${muted ? 'muted' : 'active'}`}
            onClick={() => {
              const next = !muted
              setMuted(next)
              if (next) window.speechSynthesis?.cancel()
            }}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </header>

      {/* ── TOP NAVIGATION TABS (Real App Mode Switcher) ── */}
      <nav className="app-nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          <Bot size={17} />
          <span>AI Assistant</span>
          <span className="tab-indicator" />
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Scan size={17} />
          <span>Crop Scan</span>
          {gradeResult && <span className="tab-badge">{gradeResult.grade}</span>}
          <span className="tab-indicator" />
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          <Store size={17} />
          <span>Marketplace</span>
          <span className="tab-indicator" />
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'mandi' ? 'active' : ''}`}
          onClick={() => setActiveTab('mandi')}
        >
          <TrendingUp size={17} />
          <span>Mandi Rates</span>
          <span className="tab-indicator" />
        </button>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="app-screen">
        {/* Global Notice / Error toast */}
        {alertNotice && (
          <div className="app-toast-alert" role="alert">
            <span>{alertNotice}</span>
            <button onClick={() => setAlertNotice('')} aria-label="Close alert">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 1: AI VOICE & CHAT ASSISTANT                            */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'assistant' && (
          <section className="screen-assistant">
            {/* Chat Stream Header */}
            <div className="assistant-welcome-banner">
              <div className="banner-avatar">
                <Sparkles size={18} />
              </div>
              <div className="banner-info">
                <strong>{LANG_MAP[language]?.greeting}</strong>
                <p>Voice-first advisory · Groq LLaMA 3.1 & local offline fallback</p>
              </div>
            </div>

            {/* Message Thread (Chronological: User first, AI replies after) */}
            <div className="chat-messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="bot-avatar-icon">
                      <Sprout size={16} />
                    </div>
                  )}

                  <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'} ${msg.isError ? 'error-bubble' : ''}`}>
                    <div className="bubble-header">
                      <span className="sender-tag">
                        {msg.sender === 'user' ? 'You' : 'AgriSahayak AI'}
                      </span>
                      <span className="bubble-time">{msg.timestamp}</span>
                    </div>

                    <div className="bubble-body">
                      <p>{msg.text}</p>
                    </div>

                    <div className="bubble-footer">
                      {msg.sender === 'bot' ? (
                        <>
                          <button
                            className="bubble-action-btn"
                            onClick={() => speakText(msg.text, bcp, false)}
                            title="Listen aloud"
                            aria-label="Listen aloud"
                          >
                            <Volume2 size={13} /> Listen
                          </button>
                          <button
                            className="bubble-action-btn"
                            onClick={() => copyMessage(msg.id, msg.text)}
                            title="Copy reply"
                            aria-label="Copy reply"
                          >
                            {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </>
                      ) : (
                        <span className="user-sent-status">
                          <CheckCheck size={14} className="check-double" />
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="user-avatar-icon">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}

              {/* Live typing / thinking indicator */}
              {isProcessing && (
                <div className="chat-bubble-row bot-row">
                  <div className="bot-avatar-icon">
                    <Sprout size={16} />
                  </div>
                  <div className="chat-bubble bot-bubble typing-bubble">
                    <span className="typing-dots">
                      <i /><i /><i />
                    </span>
                    <span className="typing-label">AgriSahayak is thinking…</span>
                  </div>
                </div>
              )}

              {/* Live interim transcript while user is speaking */}
              {isListening && interimText && (
                <div className="chat-bubble-row user-row interim-row">
                  <div className="chat-bubble user-bubble interim-bubble">
                    <div className="bubble-header">
                      <span className="sender-tag">Hearing you speak…</span>
                    </div>
                    <p>{interimText}</p>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts Chips */}
            <div className="quick-prompts-bar">
              <div className="prompts-scroll">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="prompt-chip"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Recording Soundwave HUD (Shows during active speech recognition) */}
            {isListening && (
              <div className="recording-hud-card">
                <div className="hud-wave">
                  <span className="wave-bar bar-1" />
                  <span className="wave-bar bar-2" />
                  <span className="wave-bar bar-3" />
                  <span className="wave-bar bar-4" />
                  <span className="wave-bar bar-5" />
                </div>
                <div className="hud-content">
                  <strong>{sttStatus || `Listening in ${language}…`}</strong>
                  <p>{interimText || 'Speak clearly into your microphone'}</p>
                </div>
                <button
                  className="hud-stop-btn"
                  onClick={toggleSpeechRecognition}
                  aria-label="Finish speaking"
                >
                  Done
                </button>
              </div>
            )}

            {/* Sticky Bottom Input Bar */}
            <div className="chat-input-bar">
              {/* Tap to Speak Button */}
              <button
                className={`mic-trigger-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Stop recording' : 'Tap to speak'}
                aria-label={isListening ? 'Stop recording' : 'Tap to speak'}
                id="tap-to-speak-btn"
              >
                <span className="mic-icon-circle">
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </span>
                <span className="mic-btn-text">
                  {isListening ? 'Stop' : 'Tap to speak'}
                </span>
              </button>

              {/* Text Input */}
              <div className="input-field-wrap">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Ask in ${language} or English…`}
                  className="chat-text-input"
                  aria-label="Type your message"
                  id="chat-input-text"
                />

                <button
                  className={`send-action-btn ${inputText.trim() ? 'can-send' : ''}`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isProcessing}
                  aria-label="Send message"
                  id="chat-send-btn"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 2: AI CROP SCAN & GRADING                                */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'scanner' && (
          <section className="screen-scanner">
            <div className="scanner-hero-card">
              <div className="scanner-header-info">
                <span className="section-pill orange-pill">Vision AI</span>
                <h2>AI Post-Harvest Crop Grading</h2>
                <p>
                  Upload or take a photo of your harvested produce. Our computer vision
                  model grades freshness, detects defects, and routes to food or waste markets.
                </p>
              </div>

              {/* Hidden file and camera inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />

              {/* Upload / Camera Action Zone */}
              <div className="upload-dropzone">
                {imagePreview ? (
                  <div className="preview-container">
                    <img src={imagePreview} alt="Crop Preview" className="crop-preview-img" />
                    {isScanning && (
                      <div className="scanning-overlay">
                        <div className="laser-line" />
                        <span className="scanning-text">Analyzing RGB Freshness & Quality…</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="dropzone-empty" onClick={() => fileInputRef.current?.click()}>
                    <div className="dropzone-icon-ring">
                      <Camera size={32} />
                    </div>
                    <strong>Take or Upload a Crop Photo</strong>
                    <span>Supports JPG, PNG · Up to 15 MB</span>
                  </div>
                )}

                <div className="upload-btn-row">
                  <button
                    className="app-btn camera-btn"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={16} /> Open Camera
                  </button>

                  <button
                    className="app-btn browse-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} /> Choose from Gallery
                  </button>
                </div>
              </div>
            </div>

            {/* Assessment Scorecard */}
            {gradeResult && (
              <div className={`scorecard-card ${gradeResult.market}`}>
                <div className="scorecard-top">
                  <div className="grade-badge-huge">
                    {gradeResult.grade}
                  </div>
                  <div className="grade-title-group">
                    <span className="grade-status-pill">
                      {gradeResult.market === 'food' ? 'Food-Grade Harvest' : 'Biomass / Waste Grade'}
                    </span>
                    <h3>{gradeResult.destination}</h3>
                    <p className="confidence-text">
                      Confidence: <strong>{Math.round(gradeResult.confidence * 100)}%</strong> · AI Model: Heuristic Spectral
                    </p>
                  </div>
                </div>

                <div className="scorecard-reason">
                  <p>{gradeResult.reason}</p>
                </div>

                {/* Metrics meters */}
                <div className="metrics-meter-grid">
                  <div className="meter-box">
                    <small>Freshness (Green Ratio)</small>
                    <strong>{(gradeResult.green_ratio * 100).toFixed(1)}%</strong>
                    <div className="progress-track">
                      <div
                        className="progress-fill green-fill"
                        style={{ width: `${Math.min(100, gradeResult.green_ratio * 200)}%` }}
                      />
                    </div>
                  </div>

                  <div className="meter-box">
                    <small>Spoilage (Red Ratio)</small>
                    <strong>{(gradeResult.red_ratio * 100).toFixed(1)}%</strong>
                    <div className="progress-track">
                      <div
                        className="progress-fill orange-fill"
                        style={{ width: `${Math.min(100, gradeResult.red_ratio * 200)}%` }}
                      />
                    </div>
                  </div>

                  <div className="meter-box">
                    <small>Lighting Quality</small>
                    <strong>{Math.round(gradeResult.brightness)} / 255</strong>
                    <div className="progress-track">
                      <div
                        className="progress-fill blue-fill"
                        style={{ width: `${Math.min(100, (gradeResult.brightness / 255) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Target buyers */}
                <div className="buyer-types-section">
                  <small>Eligible Buyer Channels:</small>
                  <div className="buyer-chips-wrap">
                    {gradeResult.buyer_types?.map((buyer, idx) => (
                      <span key={idx} className="buyer-chip">
                        <Check size={12} /> {buyer}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="app-btn full-btn primary-btn"
                  onClick={() => setActiveTab('marketplace')}
                >
                  <ShoppingBag size={16} /> View Verified Buyers in Marketplace →
                </button>
              </div>
            )}
          </section>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 3: DUAL MARKETPLACE (Food vs Waste)                      */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'marketplace' && (
          <section className="screen-marketplace">
            <div className="marketplace-intro">
              <span className="section-pill green-pill">Zero-Waste Routing</span>
              <h2>Two Marketplaces. Complete Monetization.</h2>
              <p>
                Grade A crops go directly to retail & food mandis. Grade B produce is immediately
                routed to industrial bio-refineries, biogas digesters, and composters so nothing goes to waste.
              </p>
            </div>

            <div className="market-split-grid">
              {/* Channel 1: Food Marketplace */}
              <div className={`market-channel-card food-channel ${gradeResult?.market === 'food' ? 'highlighted-channel' : ''}`}>
                <div className="channel-header">
                  <div className="channel-icon food-icon">
                    <ShoppingBasket size={24} />
                  </div>
                  <div>
                    <span className="channel-type-tag">High Value</span>
                    <h3>Food & Retail Marketplace</h3>
                  </div>
                </div>

                <p className="channel-desc">
                  For Grade A+ and Grade A produce. Connect with urban wholesalers, retail supermarkets,
                  and export aggregators.
                </p>

                <div className="active-buyers-list">
                  <div className="buyer-card">
                    <div className="buyer-meta">
                      <strong>Kisan Mandi Aggregators</strong>
                      <small>📍 Nashik APMC · Verified Buyer</small>
                    </div>
                    <span className="badge-rate">₹28 - ₹34 / kg</span>
                    <button className="connect-btn" onClick={() => alert('Connecting to Mandi Aggregator')}>
                      <PhoneCall size={13} /> Connect
                    </button>
                  </div>

                  <div className="buyer-card">
                    <div className="buyer-meta">
                      <strong>FreshCart Supply Chain</strong>
                      <small>📍 Mumbai Distribution · Daily Pickup</small>
                    </div>
                    <span className="badge-rate">₹30 / kg</span>
                    <button className="connect-btn" onClick={() => alert('Connecting to FreshCart Supply Chain')}>
                      <PhoneCall size={13} /> Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* Channel 2: Industrial / Waste Marketplace */}
              <div className={`market-channel-card waste-channel ${gradeResult?.market === 'waste' ? 'highlighted-channel' : ''}`}>
                <div className="channel-header">
                  <div className="channel-icon waste-icon">
                    <Leaf size={24} />
                  </div>
                  <div>
                    <span className="channel-type-tag waste-tag">Waste Monetization</span>
                    <h3>Biomass & Industrial Chain</h3>
                  </div>
                </div>

                <p className="channel-desc">
                  For Grade B+ and Grade B crops. Zero dumping! Sell to biogas digesters, cattle feed processors,
                  and pectin/extract manufacturing plants.
                </p>

                <div className="active-buyers-list">
                  <div className="buyer-card">
                    <div className="buyer-meta">
                      <strong>BioUrja Green Energy Ltd</strong>
                      <small>📍 Compressed Biogas Plant</small>
                    </div>
                    <span className="badge-rate waste-rate">₹4.50 / kg</span>
                    <button className="connect-btn waste-btn" onClick={() => alert('Connecting to BioUrja Plant')}>
                      <Truck size={13} /> Book Pickup
                    </button>
                  </div>

                  <div className="buyer-card">
                    <div className="buyer-meta">
                      <strong>EcoSoil Organic Composters</strong>
                      <small>📍 Bulk Processing Hub</small>
                    </div>
                    <span className="badge-rate waste-rate">₹3.80 / kg</span>
                    <button className="connect-btn waste-btn" onClick={() => alert('Connecting to EcoSoil Composters')}>
                      <Truck size={13} /> Book Pickup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 4: LIVE MANDI COMMODITY PRICES                           */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'mandi' && (
          <section className="screen-mandi">
            <div className="mandi-header">
              <span className="section-pill green-pill">Live Mandi API</span>
              <h2>Today's Market Benchmarks</h2>
              <p>Updated live from Agmarknet mandi feeds across Maharashtra and neighboring APMCs.</p>
            </div>

            <div className="mandi-table-wrap">
              <table className="mandi-table">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>APMC Mandi</th>
                    <th>Modal Price</th>
                    <th>24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  {MANDI_RATES.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.crop}</strong>
                      </td>
                      <td>{item.mandi}</td>
                      <td className="price-cell">
                        {item.price} <small>{item.unit}</small>
                      </td>
                      <td>
                        <span className={`trend-pill ${item.trend}`}>
                          {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {item.change}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mandi-tip-card">
              <Sprout size={20} className="tip-icon" />
              <div>
                <strong>AI Market Insight:</strong>
                <p>
                  Tomato demand is high in Nashik APMC today due to weekend distribution. Grade A harvest
                  is fetching 12% higher prices if delivered before 11:00 AM.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <footer className="mobile-bottom-bar">
        <button
          className={`bottom-nav-item ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          <Bot size={20} />
          <span>Assistant</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Scan size={20} />
          <span>Scan Crop</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          <Store size={20} />
          <span>Market</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'mandi' ? 'active' : ''}`}
          onClick={() => setActiveTab('mandi')}
        >
          <TrendingUp size={20} />
          <span>Rates</span>
        </button>
      </footer>
    </div>
  )
}
