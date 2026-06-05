import { useRef, useEffect } from 'react'
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

  // אתחול WebGL
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false })
    if (!gl) { console.warn('WebGL not supported'); return }
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
    if (!vShader || !fShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program)); return
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
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // תנועת עכבר (אפקט blur)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
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
      <canvas ref={canvasRef} className="gbm__canvas" />
    </div>
  )
}
