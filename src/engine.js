import opentype from 'opentype.js'

function metersToPx(m, pxPerMeter) { return m * pxPerMeter }
function pxToMeters(px, pxPerMeter) { return px / pxPerMeter }

export function calcCirclePerimeterMeters(diameterM){
  return Math.PI * diameterM
}

async function loadFont(fontUrl){
  const res = await fetch(fontUrl)
  if(!res.ok) throw new Error('Cannot load font: ' + fontUrl)
  const buf = await res.arrayBuffer()
  return opentype.parse(buf)
}

export async function calcTextPerimeterMeters({ text, fontUrl, targetCapHeightMeters }){
  const font = await loadFont(fontUrl)

  const pxPerMeter = 1000
  const unitsPerEm = font.unitsPerEm || 1000

  const sample = /[A-Za-z]/.test(text) ? 'H' : 'ا'
  const glyph = font.charToGlyph(sample)
  const bbox = glyph.getBoundingBox()
  const capUnits = Math.max(1, bbox.y2 - bbox.y1)

  const targetPx = metersToPx(targetCapHeightMeters, pxPerMeter)
  const fontSizePx = targetPx * (unitsPerEm / capUnits)

  const path = font.getPath(text, 0, 0, fontSizePx)
  const lenPx = approximatePathLength(path)
  return pxToMeters(lenPx, pxPerMeter)
}

function approximatePathLength(path){
  let x=0, y=0, startX=0, startY=0, total=0
  for(const cmd of path.commands){
    if(cmd.type === 'M'){
      x=cmd.x; y=cmd.y; startX=x; startY=y
    }else if(cmd.type === 'L'){
      total += dist(x,y,cmd.x,cmd.y); x=cmd.x; y=cmd.y
    }else if(cmd.type === 'C'){
      total += cubicLength(x,y,cmd.x1,cmd.y1,cmd.x2,cmd.y2,cmd.x,cmd.y); x=cmd.x; y=cmd.y
    }else if(cmd.type === 'Q'){
      total += quadLength(x,y,cmd.x1,cmd.y1,cmd.x,cmd.y); x=cmd.x; y=cmd.y
    }else if(cmd.type === 'Z'){
      total += dist(x,y,startX,startY); x=startX; y=startY
    }
  }
  return total
}

function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1, y2-y1) }

function quadPoint(t,x0,y0,x1,y1,x2,y2){
  const mt=1-t
  return { x: mt*mt*x0 + 2*mt*t*x1 + t*t*x2, y: mt*mt*y0 + 2*mt*t*y1 + t*t*y2 }
}
function cubicPoint(t,x0,y0,x1,y1,x2,y2,x3,y3){
  const mt=1-t
  return {
    x: mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3,
    y: mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3
  }
}
function curveLength(pointFn){
  const steps = 24
  let prev = pointFn(0)
  let len = 0
  for(let i=1;i<=steps;i++){
    const p = pointFn(i/steps)
    len += dist(prev.x,prev.y,p.x,p.y)
    prev = p
  }
  return len
}
function quadLength(x0,y0,x1,y1,x2,y2){
  return curveLength(t => quadPoint(t,x0,y0,x1,y1,x2,y2))
}
function cubicLength(x0,y0,x1,y1,x2,y2,x3,y3){
  return curveLength(t => cubicPoint(t,x0,y0,x1,y1,x2,y2,x3,y3))
}

export async function buildPreviewSvg({ widthM, heightM, preset, faText, enText, hasLogoCircle, logoDiameterM }){
  const pxPerMeter = 120
  const W = Math.max(240, Math.round(widthM * pxPerMeter))
  const H = Math.max(160, Math.round(heightM * pxPerMeter))

  const marginX = Math.round(W * 0.08)
  const marginY = Math.round(H * 0.10)
  const gap = Math.round(W * 0.04)

  let logoBox = null
  let textBox = { x: marginX, y: marginY, w: W-2*marginX, h: H-2*marginY }

  if(hasLogoCircle && preset.supports?.logo){
    if(preset.stackDirection === 'HORIZONTAL'){
      const lw = Math.round((W-2*marginX) * (preset.logoBlockWidthRatio || 0.25))
      const th = H-2*marginY
      const tw = (W-2*marginX) - lw - gap
      if((preset.layoutType||'').includes('RIGHT')){
        textBox = { x: marginX, y: marginY, w: tw, h: th }
        logoBox = { x: marginX + tw + gap, y: marginY, w: lw, h: th }
      }else{
        logoBox = { x: marginX, y: marginY, w: lw, h: th }
        textBox = { x: marginX + lw + gap, y: marginY, w: tw, h: th }
      }
    }else{
      const lh = Math.round((H-2*marginY) * (preset.logoBlockHeightRatio || 0.30))
      const th = (H-2*marginY) - lh - gap
      if((preset.layoutType||'').includes('BOTTOM')){
        textBox = { x: marginX, y: marginY, w: W-2*marginX, h: th }
        logoBox = { x: marginX, y: marginY + th + gap, w: W-2*marginX, h: lh }
      }else{
        logoBox = { x: marginX, y: marginY, w: W-2*marginX, h: lh }
        textBox = { x: marginX, y: marginY + lh + gap, w: W-2*marginX, h: th }
      }
    }
  }

  const mainSize = Math.max(14, Math.round(H * preset.primaryLineHeightRatio * 0.8))
  const secSize = Math.max(12, Math.round(H * (preset.secondaryLineHeightRatio || preset.primaryLineHeightRatio*0.6) * 0.8))

  const anchor = preset.alignment === 'LEFT' ? 'start' : (preset.alignment === 'RIGHT' ? 'end' : 'middle')
  const tx = anchor === 'start' ? textBox.x : (anchor === 'end' ? textBox.x + textBox.w : textBox.x + textBox.w/2)

  const lines = preset.lines || 1
  const centerY = textBox.y + textBox.h/2
  const y1 = lines === 1 ? centerY : centerY - secSize/1.2
  const y2 = centerY + secSize/1.2

  let logoSvg = ''
  if(logoBox && hasLogoCircle){
    const diaPx = Math.min(logoBox.w, logoBox.h) * 0.70
    const r = diaPx/2
    const cx = logoBox.x + logoBox.w/2
    const cy = logoBox.y + logoBox.h/2
    logoSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#111827" stroke-width="3" />`
  }

  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const fa = esc(faText)
  const en = esc(enText)

  let textSvg = ''
  if(lines === 1){
    const content = fa || en
    textSvg = `<text x="${tx}" y="${centerY}" font-size="${mainSize}" font-weight="800" fill="#111827" text-anchor="${anchor}" direction="rtl">${content}</text>`
  }else{
    textSvg = `<text x="${tx}" y="${y1}" font-size="${mainSize}" font-weight="800" fill="#111827" text-anchor="${anchor}" direction="rtl">${fa}</text>
               <text x="${tx}" y="${y2}" font-size="${secSize}" font-weight="800" fill="#111827" text-anchor="${anchor}" direction="ltr">${en}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" stroke="#e5e7eb"/>
    ${logoSvg}
    ${textSvg}
  </svg>`
}
