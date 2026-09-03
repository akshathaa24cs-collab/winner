import { useRef, useState } from 'react'
import { ArrowRight, BarChart3, Camera, Check, ChevronDown, CircleHelp, Leaf, Menu, Mic, Phone, ScanLine, ShieldCheck, ShoppingBasket, Sprout, TrendingUp, Upload, X } from 'lucide-react'
import './App.css'

const steps = [
  { label: 'Voice assistant', icon: Mic },
  { label: 'Crop grading', icon: ScanLine },
  { label: 'Marketplace', icon: ShoppingBasket },
]
const impactMetrics = [
  ['2.4 min', 'average response time', 'down 42%'],
  ['86%', 'successful conversations', 'voice-first access'],
  ['₹1.53L Cr', 'post-harvest loss / year', 'recoverable value'],
]

function App() {
  const [activeStep, setActiveStep] = useState('Voice assistant')
  const [isListening, setIsListening] = useState(false)
  const [language, setLanguage] = useState('Hindi')
  const [fileName, setFileName] = useState('')
  const [voiceText, setVoiceText] = useState('')
  const [voiceReply, setVoiceReply] = useState('')
  const [gradeResult, setGradeResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiError, setApiError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const fileInput = useRef(null)
  const recognition = useRef(null)
  const selectStep = (step) => { setActiveStep(step); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }) }
  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setGradeResult(null)
    setApiError('')
    setIsProcessing(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/grade`, { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error || 'Unable to grade this image.')
      setGradeResult(result)
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }
  const askAssistant = async (messageOverride = '') => {
    const message = messageOverride.trim() || voiceText.trim() || 'Which crop should I sell first?'
    setIsListening(false)
    setIsProcessing(true)
    setApiError('')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, language }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail?.[0]?.msg || 'Assistant is unavailable.')
      setVoiceReply(result.reply)
    } catch (error) {
      setApiError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }
  const toggleVoiceCapture = () => {
    if (isListening) {
      recognition.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setApiError('Voice capture is not supported in this browser. Type your question instead.')
      return
    }
    const voiceCapture = new SpeechRecognition()
    voiceCapture.lang = language === 'Hindi' ? 'hi-IN' : language === 'Marathi' ? 'mr-IN' : language === 'Telugu' ? 'te-IN' : 'en-IN'
    voiceCapture.interimResults = false
    voiceCapture.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceText(transcript)
      askAssistant(transcript)
    }
    voiceCapture.onerror = () => setApiError('I could not hear that. Please try again or type your question.')
    voiceCapture.onend = () => setIsListening(false)
    recognition.current = voiceCapture
    setApiError('')
    setIsListening(true)
    voiceCapture.start()
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="AgriSahayak home"><span className="brand-mark"><Sprout size={20} /></span><span>Agri<span>Sahayak</span></span></a>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <nav className={mobileOpen ? 'nav-links open' : 'nav-links'}><a className="active" href="#workspace">Workspace</a><a href="#how-it-works">How it works</a><a href="#impact">Impact</a><button className="help-link"><CircleHelp size={16} /> Help centre</button></nav>
      <div className="profile"><span>RK</span><div><strong>Ramesh Kumar</strong><small>Farmer account</small></div><ChevronDown size={16} /></div>
    </header>

    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><span className="pulse-dot" /> Good morning, Ramesh</p><h1>Make every harvest<br /><em>count.</em></h1><p className="hero-text">Your voice, your crops, your market. Get practical guidance and a fair route for every kilogram you grow.</p><div className="hero-actions"><button className="primary-action" onClick={() => selectStep('Voice assistant')}><Mic size={18} /> Talk to AgriSahayak <ArrowRight size={17} /></button><button className="quiet-action" onClick={() => selectStep('Crop grading')}><Camera size={18} /> Grade a crop</button></div><div className="trust-line"><ShieldCheck size={16} /> Works on a basic phone call <span /> <Leaf size={16} /> Available in 8 languages</div></div>
      <div className="hero-art" aria-label="Illustration of a farmer and crop field"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="farmer"><div className="hat" /><div className="head" /><div className="body" /><div className="arm" /><div className="phone"><Phone size={13} /></div></div><div className="crop crop-one"><span /><span /><span /></div><div className="crop crop-two"><span /><span /><span /></div><div className="crop crop-three"><span /><span /><span /></div><div className="art-label"><TrendingUp size={17} /><span><b>+24%</b><small>value recovered</small></span></div></div>
    </section>

    <section className="workflow" id="workspace"><div className="section-heading"><div><p className="eyebrow">Your harvest workspace</p><h2>What do you need today?</h2></div><div className="language-picker"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>Hindi</option><option>English</option><option>Marathi</option><option>Telugu</option></select><ChevronDown size={15} /></div></div><div className="step-tabs">{steps.map(({ label, icon: Icon }, index) => <button key={label} className={activeStep === label ? 'step-tab selected' : 'step-tab'} onClick={() => setActiveStep(label)}><span className="step-number">0{index + 1}</span><Icon size={18} />{label}{index < steps.length - 1 && <ArrowRight className="step-arrow" size={16} />}</button>)}</div>
      <div className="workspace-grid"><section className="voice-panel panel"><div className="panel-top"><div><span className="tag green">AI VOICE ASSISTANT</span><h3>Ask anything about your farm.</h3></div><span className="online"><i /> Online</span></div><div className="conversation"><div className="assistant-avatar"><Sprout size={20} /></div><div className="bubble assistant-bubble"><small>AgriSahayak · just now</small><p>{voiceReply || 'Namaste Ramesh! How can I help you today?'}</p></div><div className="bubble farmer-bubble"><small>You · just now</small><p>{voiceText || 'Which crop should I sell first?'}</p></div></div><div className="voice-input"><input value={voiceText} onChange={(event) => setVoiceText(event.target.value)} placeholder="Type a question or tap the mic" onKeyDown={(event) => event.key === 'Enter' && askAssistant()} /><button onClick={() => askAssistant()} aria-label="Send question"><ArrowRight size={16} /></button></div><button className={isListening ? 'listen-button listening' : 'listen-button'} onClick={toggleVoiceCapture}><span className="listen-icon">{isListening ? <span className="bars"><i /><i /><i /><i /></span> : <Mic size={24} />}</span><span>{isListening ? 'Listening… tap to finish' : 'Tap to speak'}</span><small>{isListening ? 'I am hearing you' : 'Hindi · English · Marathi'}</small></button><div className="voice-note"><span className="lock-dot">⌁</span> {isProcessing ? 'AgriSahayak is thinking…' : 'Your conversation stays private'} <span className="voice-time">0:00 / 0:30</span></div></section>
        <section className="grade-panel panel"><div className="panel-top"><div><span className="tag orange">CROP GRADING</span><h3>See what your crop is worth.</h3></div><span className="info-badge">AI + expert</span></div><div className={fileName ? 'upload-box has-file' : 'upload-box'} onClick={() => fileInput.current?.click()}><input ref={fileInput} type="file" accept="image/*" onChange={handleFile} /><div className="upload-icon">{fileName ? <Check size={25} /> : <Upload size={24} />}</div><strong>{fileName || 'Upload a crop photo'}</strong><span>{isProcessing ? 'AI is assessing your crop…' : fileName ? 'Assessment complete' : 'JPG or PNG · up to 10 MB'}</span>{!fileName && <button type="button">Browse files</button>}</div>{gradeResult && <div className="grade-result"><span className="grade-score">{gradeResult.grade}</span><span><b>{gradeResult.market === 'food' ? 'Food marketplace' : 'Waste marketplace'}</b><small>{Math.round(gradeResult.confidence * 100)}% confidence · {gradeResult.reason}</small></span></div>}<div className="grade-footer"><div><span className="mini-icon"><ScanLine size={16} /></span><span><b>Fair, transparent grading</b><small>Size · colour · ripeness · defects</small></span></div><button className="text-button" onClick={() => fileInput.current?.click()}>Use camera <Camera size={15} /></button></div></section></div>
      {apiError && <p className="api-error">{apiError}</p>}
    </section>

    <section className="routing-band" id="how-it-works"><div className="routing-intro"><p className="eyebrow">One harvest. Two opportunities.</p><h2>Nothing you grow<br />should become waste.</h2><p>Our AI grades your produce and routes it to the best value chain automatically.</p></div><div className="route-flow"><div className="route-source"><div className="produce-icon"><Sprout size={26} /></div><strong>Your crop</strong><small>assessed by AI</small></div><ArrowRight className="flow-arrow" /><div className="route-destinations"><div className="destination food"><span><ShoppingBasket size={21} /></span><div><strong>Food marketplace</strong><small>Retailers · wholesalers · consumers</small></div><Check size={19} /></div><div className="destination waste"><span><Leaf size={21} /></span><div><strong>Waste marketplace</strong><small>Composters · biogas · recyclers</small></div><Check size={19} /></div></div></div></section>
    <section className="impact-section" id="impact"><div className="section-heading"><div><p className="eyebrow">Built for measurable change</p><h2>Small decisions. Big impact.</h2></div><a className="text-button" href="#workspace">Open dashboard <ArrowRight size={15} /></a></div><div className="metric-grid">{impactMetrics.map(([metric, label, note]) => <div className="metric" key={label}><BarChart3 size={20} /><strong>{metric}</strong><span>{label}</span><small>{note}</small></div>)}</div><div className="impact-chain"><span>Voice guidance</span><ArrowRight size={15} /><span>Better decisions</span><ArrowRight size={15} /><span>Less waste</span><ArrowRight size={15} /><span>Higher farmer income</span></div></section>
    <footer><div className="brand footer-brand"><span className="brand-mark"><Sprout size={18} /></span><span>Agri<span>Sahayak</span></span></div><span>AI-powered agriculture, made human.</span><span>© 2026 AgriSahayak · Avenger Labs</span></footer>
  </main>
}
export default App
