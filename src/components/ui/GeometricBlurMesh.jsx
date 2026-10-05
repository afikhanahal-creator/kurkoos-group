import { useRef, useEffect, useState } from 'react'
import './GeometricBlurMesh.css'

/* ============================================================
   אפקט WebGL — קובייה תיל תלת-ממדית מסתובבת עם blur בריחוף.
   מותאם מ-geometric-blur-mesh (TSX/Tailwind) ל-React+Vite (JS).
   ממלא את הקונטיינר ההורה (לא מסך מלא), נעול על צורת קובייה.
   ============================================================ */

const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;
uniform int u_shape;
#define PI 3.1415926535897932384626433832795
#define TWO_PI 6.2831853071795864769252867665590
mat3 rotateX(float angle){float s=sin(angle);float c=cos(angle);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}
mat3 rotateY(float angle){float s=sin(angle);float c=cos(angle);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
mat3 rotateZ(float angle){float s=sin(angle);float c=cos(angle);return mat3(c,-s,0.,s,c,0.,0.,0.,1.);}
vec2 coord(in vec2 p){
  p=p/u_resolution.xy;
  if(u_resolution.x>u_resolution.y){p.x*=u_resolution.x/u_resolution.y;p.x+=(u_resolution.y-u_resolution.x)/u_resolution.y/2.0;}
  else{p.y*=u_resolution.y/u_resolution.x;p.y+=(u_resolution.x-u_resolution.y)/u_resolution.x/2.0;}
  p-=0.5;return p;
}
vec2 project(vec3 p){float perspective=2.0/(2.0-p.z);return p.xy*perspective;}
float distToSegment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a;vec2 ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return length(pa-ba*h);}
float drawLine(vec2 p,vec2 a,vec2 b,float thickness,float blur){float d=distToSegment(p,a,b);return smoothstep(thickness+blur,thickness-blur,d);}
void getCubeVertices(out vec3 v[8]){
  float s=0.7;
  v[0]=vec3(-s,-s,-s);v[1]=vec3(s,-s,-s);v[2]=vec3(s,s,-s);v[3]=vec3(-s,s,-s);
  v[4]=vec3(-s,-s,s);v[5]=vec3(s,-s,s);v[6]=vec3(s,s,s);v[7]=vec3(-s,s,s);
}
float drawWireframe(vec2 p,mat3 rotation,float scale,float thickness,float blur){
  float result=0.0;
  vec3 v[8];getCubeVertices(v);
  for(int i=0;i<8;i++){v[i]=rotation*(v[i]*scale);}
  result+=drawLine(p,project(v[0]),project(v[1]),thickness,blur);
  result+=drawLine(p,project(v[1]),project(v[2]),thickness,blur);
  result+=drawLine(p,project(v[2]),project(v[3]),thickness,blur);
  result+=drawLine(p,project(v[3]),project(v[0]),thickness,blur);
  result+=drawLine(p,project(v[4]),project(v[5]),thickness,blur);
  result+=drawLine(p,project(v[5]),project(v[6]),thickness,blur);
  result+=drawLine(p,project(v[6]),project(v[7]),thickness,blur);
  result+=drawLine(p,project(v[7]),project(v[4]),thickness,blur);
  result+=drawLine(p,project(v[0]),project(v[4]),thickness,blur);
  result+=drawLine(p,project(v[1]),project(v[5]),thickness,blur);
  result+=drawLine(p,project(v[2]),project(v[6]),thickness,blur);
  result+=drawLine(p,project(v[3]),project(v[7]),thickness,blur);
  return clamp(result,0.0,1.0);
}
vec4 render(vec2 st,vec2 mouse){
  float mouseDistance=length(st-mouse);
  float mouseInfluence=1.0-smoothstep(0.0,0.5,mouseDistance);
  float time=u_time*0.2;
  mat3 rotation=rotateY(time+(mouse.x-0.5)*mouseInfluence*1.0)*rotateX(time*0.7+(mouse.y-0.5)*mouseInfluence*1.0)*rotateZ(time*0.1);
  float scale=0.4;
  float blur=mix(0.0001,0.05,mouseInfluence);
  float thickness=mix(0.0022,0.0034,mouseInfluence);
  float shape=drawWireframe(st,rotation,scale,thickness,blur);
  float dimming=1.0-mouseInfluence*0.25;
  float vignette=1.0-length(st)*0.2;
  // אלפא = כיסוי הקווים → הרקע שקוף, רק התיל נראה
  float a=clamp(shape*dimming*vignette,0.0,1.0);
  // צבע התיל — טורקיז המותג
  vec3 color=vec3(0.063,0.333,0.447);
  return vec4(color,a);
}
void main(){
  vec2 st=coord(gl_FragCoord.xy);
  vec2 mouse=coord(u_mouse*u_pixelRatio)*vec2(1.,-1.);
  gl_FragColor=render(st,mouse);
}
`

const vertexShader = `
attribute vec3 a_position;
attribute vec2 a_uv;
varying vec2 v_texcoord;
void main(){gl_Position=vec4(a_position,1.0);v_texcoord=a_uv;}
`

/* גיבוי כשאין WebGL בדפדפן (האצת גרפיקה כבויה, דרייבר חסום, הקשר שאבד):
   אותה קובייה, אותו סיבוב, אותו צבע טורקיז — מצוירת ב־Canvas 2D רגיל. */
const CUBE = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
// אותו סדר כמו ב־GLSL (מטריצות לפי עמודות)
const rx = (a, [x, y, z]) => { const s = Math.sin(a), c = Math.cos(a); return [x, c * y + s * z, -s * y + c * z] }
const ry = (a, [x, y, z]) => { const s = Math.sin(a), c = Math.cos(a); return [c * x - s * z, y, s * x + c * z] }
const rz = (a, [x, y, z]) => { const s = Math.sin(a), c = Math.cos(a); return [c * x + s * y, -s * x + c * y, z] }

const smooth = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k) }
const SEG = 28

/* כמו בשיידר: ההשפעה של העכבר מחושבת לכל נקודה על הקו בנפרד, ולכן הקובייה
   מתעקמת ומיטשטשת רק ליד הסמן (קו שמתעבה ונמרח בהילה רכה). */
function draw2D(ctx, w, h, dpr, t, mouse) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const m = Math.min(w, h)
  const mx = (mouse.x * dpr - w / 2) / m, my = -(mouse.y * dpr - h / 2) / m
  const time = t * 0.2
  const s = 0.7 * 0.4
  const inflAt = (x, y) => 1 - smooth(0, 0.5, Math.hypot(x - mx, y - my))
  // נקודה תלת־ממדית → נקודה במסך, עם סיבוב שתלוי בהשפעה במקום שבו היא נוחתת
  const place = (v) => {
    let infl = 0, q
    for (let it = 0; it < 3; it++) {
      const p = ry(time + (mx - 0.5) * infl, rx(time * 0.7 + (my - 0.5) * infl, rz(time * 0.1, v)))
      const f = 2 / (2 - p[2])
      q = [p[0] * f, p[1] * f]
      infl = inflAt(q[0], q[1])
    }
    return [q[0], q[1], infl]
  }
  const toPx = (q) => [w / 2 + q[0] * m, h / 2 - q[1] * m]
  const vign = (q) => 1 - Math.hypot(q[0], q[1]) * 0.2
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgb(16, 85, 114)'
  for (const [ia, ib] of EDGES) {
    const A = CUBE[ia], B = CUBE[ib]
    let prev = null
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG
      const cur = place([(A[0] + (B[0] - A[0]) * u) * s, (A[1] + (B[1] - A[1]) * u) * s, (A[2] + (B[2] - A[2]) * u) * s])
      if (prev) {
        const infl = (prev[2] + cur[2]) / 2
        const pa = toPx(prev), pb = toPx(cur)
        const base = (1 - infl * 0.25) * vign(cur)
        const thick = (0.0022 + infl * 0.0012) * 2 * m
        const blur = (0.0001 + infl * 0.05) * m
        if (blur > 2) {
          // הילה רכה: כמה שכבות רחבות ושקופות שמדמות את הטשטוש של השיידר
          ctx.strokeStyle = 'rgb(150, 205, 232)'
          for (const [k, al] of [[2, 0.16], [1.3, 0.2], [0.7, 0.28]]) {
            ctx.globalAlpha = base * al * infl
            ctx.lineWidth = thick + blur * k
            ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke()
          }
        }
        // ליד הסמן הקו עצמו מתבהר לתכלת, כמו בגרסת ה־WebGL
        ctx.strokeStyle = `rgb(${16 + 120 * infl | 0}, ${85 + 110 * infl | 0}, ${114 + 110 * infl | 0})`
        ctx.globalAlpha = base * (1 - infl * 0.4)
        ctx.lineWidth = Math.max(1, thick)
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke()
      }
      prev = cur
    }
  }
  ctx.globalAlpha = 1
}

export default function GeometricBlurMesh() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const mouseDampRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef()
  const glRef = useRef(null)
  const programRef = useRef(null)
  const uniformsRef = useRef({})
  const startTimeRef = useRef(Date.now())
  const fallbackRef = useRef(null)
  const [fallback, setFallback] = useState(false)

  // אתחול WebGL
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false })
    if (!gl) { setFallback(true); return }
    // הקשר WebGL שאבד באמצע (חזרה מטאב, קריסת GPU) → עוברים לציור 2D
    const onLost = (e) => { e.preventDefault(); glRef.current = null; setFallback(true) }
    canvas.addEventListener('webglcontextlost', onLost)
    glRef.current = gl
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    const createShader = (type, source) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader)); gl.deleteShader(shader); return null
      }
      return shader
    }

    const vShader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fShader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vShader || !fShader) { setFallback(true); return }

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program)); setFallback(true); return
    }
    programRef.current = program
    gl.useProgram(program)

    uniformsRef.current = {
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_pixelRatio: gl.getUniformLocation(program, 'u_pixelRatio'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_shape: gl.getUniformLocation(program, 'u_shape'),
    }

    const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0])
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1])

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)

    const uvBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
    const uvLocation = gl.getAttribLocation(program, 'a_uv')
    gl.enableVertexAttribArray(uvLocation)
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0)

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteProgram(program); gl.deleteShader(vShader); gl.deleteShader(fShader)
    }
  }, [])

  // התאמת גודל לקונטיינר
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const dpr = Math.min(window.devicePixelRatio, 2)
      const width = container.clientWidth
      const height = container.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const gl = glRef.current
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height)
      const fb = fallbackRef.current
      if (fb) { fb.width = width * dpr; fb.height = height * dpr }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fallback])

  // תנועת עכבר (אפקט blur)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const box = containerRef.current
      if (!box) return
      const rect = box.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      mouseRef.current = { x: clientX - rect.left, y: clientY - rect.top }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleMouseMove)
    }
  }, [])

  // לולאת אנימציה
  useEffect(() => {
    let lastTime = performance.now()
    const animate = (time) => {
      const deltaTime = (time - lastTime) / 1000
      lastTime = time
      const canvas = canvasRef.current
      const gl = glRef.current
      const program = programRef.current
      const fb = fallbackRef.current
      if (fb && (!gl || !program)) {
        mouseDampRef.current.x += (mouseRef.current.x - mouseDampRef.current.x) * 8 * deltaTime
        mouseDampRef.current.y += (mouseRef.current.y - mouseDampRef.current.y) * 8 * deltaTime
        const ctx = fb.getContext('2d')
        if (ctx && fb.width) draw2D(ctx, fb.width, fb.height, Math.min(window.devicePixelRatio, 2), (Date.now() - startTimeRef.current) / 1000, mouseDampRef.current)
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      if (!canvas || !gl || !program) { animationFrameRef.current = requestAnimationFrame(animate); return }
      const dampingFactor = 8
      mouseDampRef.current.x += (mouseRef.current.x - mouseDampRef.current.x) * dampingFactor * deltaTime
      mouseDampRef.current.y += (mouseRef.current.y - mouseDampRef.current.y) * dampingFactor * deltaTime
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const dpr = Math.min(window.devicePixelRatio, 2)
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000
      const u = uniformsRef.current
      if (u.u_mouse) gl.uniform2f(u.u_mouse, mouseDampRef.current.x, mouseDampRef.current.y)
      if (u.u_resolution) gl.uniform2f(u.u_resolution, canvas.width, canvas.height)
      if (u.u_pixelRatio) gl.uniform1f(u.u_pixelRatio, dpr)
      if (u.u_time) gl.uniform1f(u.u_time, elapsedTime)
      if (u.u_shape) gl.uniform1i(u.u_shape, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [])

  return (
    <div ref={containerRef} className="gbm">
      <canvas ref={canvasRef} className="gbm__canvas" style={fallback ? { display: 'none' } : undefined} />
      {fallback && <canvas ref={fallbackRef} className="gbm__canvas" aria-hidden="true" />}
    </div>
  )
}
