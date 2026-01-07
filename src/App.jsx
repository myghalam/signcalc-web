import React, { useMemo, useState } from 'react'
import presets from './presets.json'
import { buildPreviewSvg, calcTextPerimeterMeters, calcCirclePerimeterMeters } from './engine.js'

const DEFAULTS = {
  widthM: 6,
  heightM: 4,
  presetId: 'P11',
  faText: 'دفتر فقی قلم',
  enText: '',
  hasLogoCircle: true,
  logoDiameterRatio: 0.25,
  fontFaUrl: '/fonts/Vazirmatn-ExtraBold.ttf',
  fontEnUrl: '/fonts/Montserrat-Black.ttf'
}

function StepHeader({step, title}){
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
      <div style={{fontWeight:800, fontSize:16}}>{title}</div>
      <div style={{fontSize:12, color:'#6b7280'}}>مرحله {step} از 3</div>
    </div>
  )
}

function Field({label, children}){
  return (
    <div style={{display:'flex', flexDirection:'column', gap:6}}>
      <div style={{fontSize:12, color:'#374151', fontWeight:700}}>{label}</div>
      {children}
    </div>
  )
}

function Input(props){
  return <input {...props} style={{height:44, border:'1px solid #e5e7eb', borderRadius:12, padding:'0 12px', fontSize:14}} />
}

function Select(props){
  return <select {...props} style={{height:44, border:'1px solid #e5e7eb', borderRadius:12, padding:'0 12px', fontSize:14, background:'#fff'}} />
}

function Button({children, onClick, disabled}){
  return (
    <button onClick={onClick} disabled={disabled}
      style={{height:48, width:'100%', borderRadius:14, border:'none', background: disabled ? '#93c5fd':'#2563eb', color:'#fff', fontWeight:800, fontSize:14}}>
      {children}
    </button>
  )
}

export default function App(){
  const [step, setStep] = useState(1)
  const [s, setS] = useState(DEFAULTS)
  const preset = useMemo(() => presets.find(p => p.id === s.presetId) || presets[0], [s.presetId])
  const logoDiameterM = s.hasLogoCircle ? (s.heightM * s.logoDiameterRatio) : 0
  const [result, setResult] = useState(null)

  async function calculate(){
    const logoM = s.hasLogoCircle ? calcCirclePerimeterMeters(logoDiameterM) : 0
    const mainLetterHeightM = preset.primaryLineHeightRatio * s.heightM
    const secLetterHeightM = (preset.lines >= 2 ? (preset.secondaryLineHeightRatio || preset.primaryLineHeightRatio*0.6) : preset.primaryLineHeightRatio) * s.heightM

    const faM = s.faText?.trim()
      ? await calcTextPerimeterMeters({ text: s.faText.trim(), fontUrl: s.fontFaUrl, targetCapHeightMeters: mainLetterHeightM })
      : 0
    const enM = s.enText?.trim()
      ? await calcTextPerimeterMeters({ text: s.enText.trim(), fontUrl: s.fontEnUrl, targetCapHeightMeters: secLetterHeightM })
      : 0

    const totalM = faM + enM + logoM
    const svg = await buildPreviewSvg({ widthM: s.widthM, heightM: s.heightM, preset, faText: s.faText, enText: s.enText, hasLogoCircle: s.hasLogoCircle, logoDiameterM })
    setResult({ faM, enM, logoM, totalM, svg })
    setStep(3)
  }

  return (
    <div style={{minHeight:'100vh', background:'#fff'}}>
      <div style={{maxWidth: 980, margin:'0 auto', padding:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div style={{fontWeight:900, fontSize:18}}>SignCalc (نسخه وب)</div>
          <div style={{fontSize:12, color:'#6b7280'}}>محاسبه متر دور بر اساس outline فونت</div>
        </div>

        <div style={{border:'1px solid #e5e7eb', borderRadius:16, padding:16, marginTop:16}}>
          {step === 1 && (
            <>
              <StepHeader step={1} title="ابعاد و چیدمان" />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
                <Field label="عرض تابلو (متر)"><Input type="number" value={s.widthM} onChange={e=>setS({...s,widthM: Number(e.target.value)})} /></Field>
                <Field label="ارتفاع تابلو (متر)"><Input type="number" value={s.heightM} onChange={e=>setS({...s,heightM: Number(e.target.value)})} /></Field>
              </div>

              <div style={{marginTop:12}}>
                <Field label="انتخاب پریست (۱۸ حالت)">
                  <Select value={s.presetId} onChange={e=>setS({...s,presetId:e.target.value})}>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.id} — {p.title}</option>)}
                  </Select>
                </Field>
                <div style={{marginTop:8, fontSize:12, color:'#6b7280'}}>
                  ارتفاع حروف اصلی از نسبت پریست محاسبه می‌شود.
                </div>
              </div>

              <div style={{marginTop:12}}>
                <Field label="لوگو (دایره)">
                  <label style={{display:'flex', gap:8, alignItems:'center'}}>
                    <input type="checkbox" checked={s.hasLogoCircle} onChange={e=>setS({...s,hasLogoCircle:e.target.checked})} />
                    <span style={{fontSize:13}}>لوگو دایره‌ای دارم</span>
                  </label>
                  {s.hasLogoCircle && (
                    <div style={{marginTop:8, fontSize:12, color:'#374151'}}>
                      قطر لوگو = {(s.logoDiameterRatio*100).toFixed(0)}٪ از ارتفاع تابلو
                      <input type="range" min="0.10" max="0.45" step="0.01" value={s.logoDiameterRatio}
                        onChange={e=>setS({...s,logoDiameterRatio:Number(e.target.value)})}
                        style={{width:'100%'}} />
                    </div>
                  )}
                </Field>
              </div>

              <div style={{marginTop:16}}>
                <Button onClick={()=>setStep(2)}>ادامه</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader step={2} title="متن و محاسبه" />
              <div style={{display:'grid', gridTemplateColumns:'1fr', gap:12, marginTop:12}}>
                <Field label="متن فارسی"><Input value={s.faText} onChange={e=>setS({...s,faText:e.target.value})} /></Field>
                <Field label="متن انگلیسی (اختیاری)"><Input value={s.enText} onChange={e=>setS({...s,enText:e.target.value})} /></Field>
              </div>

              <div style={{marginTop:12, fontSize:12, color:'#6b7280'}}>
                برای محاسبه دقیقِ دور، فایل فونت‌ها را در مسیر <b>/public/fonts</b> قرار دهید:
                <div style={{direction:'ltr', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', marginTop:8, padding:10, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12}}>
                  public/fonts/Vazirmatn-ExtraBold.ttf<br/>
                  public/fonts/Montserrat-Black.ttf
                </div>
              </div>

              <div style={{display:'flex', gap:10, marginTop:16}}>
                <button onClick={()=>setStep(1)} style={{height:48, flex:1, borderRadius:14, border:'1px solid #e5e7eb', background:'#fff', fontWeight:800}}>بازگشت</button>
                <div style={{flex:2}}><Button onClick={calculate}>محاسبه متر دور + ساخت طرح</Button></div>
              </div>
            </>
          )}

          {step === 3 && result && (
            <>
              <StepHeader step={3} title="خروجی" />
              <div style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div style={{border:'1px solid #e5e7eb', borderRadius:14, padding:12}}>
                  <div style={{fontWeight:900}}>متر دور فارسی</div>
                  <div style={{fontSize:22, fontWeight:900, marginTop:6}}>{result.faM.toFixed(2)} m</div>
                </div>
                <div style={{border:'1px solid #e5e7eb', borderRadius:14, padding:12}}>
                  <div style={{fontWeight:900}}>متر دور انگلیسی</div>
                  <div style={{fontSize:22, fontWeight:900, marginTop:6}}>{result.enM.toFixed(2)} m</div>
                </div>
                <div style={{border:'1px solid #e5e7eb', borderRadius:14, padding:12}}>
                  <div style={{fontWeight:900}}>متر دور لوگو</div>
                  <div style={{fontSize:22, fontWeight:900, marginTop:6}}>{result.logoM.toFixed(2)} m</div>
                </div>
                <div style={{border:'1px solid #2563eb', borderRadius:14, padding:12, background:'#eff6ff'}}>
                  <div style={{fontWeight:900}}>جمع کل</div>
                  <div style={{fontSize:22, fontWeight:900, marginTop:6}}>{result.totalM.toFixed(2)} m</div>
                </div>
              </div>

              <div style={{marginTop:14, border:'1px solid #e5e7eb', borderRadius:16, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                  <div style={{fontWeight:900}}>پیش‌نمایش طرح (SVG)</div>
                  <a href={'data:image/svg+xml;utf8,' + encodeURIComponent(result.svg)} download={'sign-preview.svg'} style={{fontSize:12, color:'#2563eb', fontWeight:800}}>
                    دانلود SVG
                  </a>
                </div>
                <div style={{marginTop:10, overflow:'auto'}} dangerouslySetInnerHTML={{__html: result.svg}} />
              </div>

              <div style={{display:'flex', gap:10, marginTop:16}}>
                <button onClick={()=>setStep(2)} style={{height:48, flex:1, borderRadius:14, border:'1px solid #e5e7eb', background:'#fff', fontWeight:800}}>ویرایش</button>
                <button onClick={()=>{ setResult(null); setStep(1); }} style={{height:48, flex:1, borderRadius:14, border:'1px solid #e5e7eb', background:'#fff', fontWeight:800}}>پروژه جدید</button>
              </div>
            </>
          )}
        </div>

        <div style={{marginTop:12, fontSize:12, color:'#6b7280'}}>
          یادداشت: این پروژه MVP است. اگر شکل‌دهی حروف فارسی دقیقاً مثل نرم‌افزارهای گرافیکی نشد، در نسخه بعد موتور HarfBuzz اضافه می‌کنیم.
        </div>
      </div>
    </div>
  )
}
