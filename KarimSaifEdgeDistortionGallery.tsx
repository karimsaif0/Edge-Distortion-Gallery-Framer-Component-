import * as React from "react"
import * as THREE from "three"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

// Made with 💛 by Karim Saif

const DEFAULT_IMAGES = [
    "https://i.pinimg.com/736x/aa/07/71/aa0771966b0d5b5060bf2c658c04b189.jpg",
    "https://i.pinimg.com/736x/c7/ce/94/c7ce943d488adaed5d08095d47561eb6.jpg",
    "https://i.pinimg.com/1200x/f6/39/84/f63984b0872a25e95bcadbe3bda3a275.jpg",
    "https://i.pinimg.com/236x/5d/7d/c4/5d7dc470354274887e4bfaf684906d0f.jpg",
    "https://i.pinimg.com/1200x/1b/06/4f/1b064f821cccc5aad2fb6adbd8325fad.jpg",
    "https://i.pinimg.com/736x/f6/7b/c8/f67bc8f81a69fef994f5d44d29fca451.jpg",
]

type Props = {
    images: string[]
    backgroundColor: string
    columns: number
    rows: number
    cardWidth: number
    cardHeight: number
    gapX: number
    gapY: number
    cornerRadius: number
    distortion: number
    chromatic: number
    edgeStart: number
    driftX: number
    driftY: number
    dragSpeed: number
    inertia: number
    zoom: number
    autoDrift: boolean
    enableDrag: boolean
    touchDrag: boolean
    paused: boolean
    maxDpr: number
    maxTextureSize: number
    style?: React.CSSProperties
}

const defaults: Props = {
    images: DEFAULT_IMAGES,
    backgroundColor: "#FFFFFF",
    columns: 5,
    rows: 5,
    cardWidth: 600,
    cardHeight: 750,
    gapX: 200,
    gapY: 200,
    cornerRadius: 40,
    distortion: 0.3,
    chromatic: 0.008,
    edgeStart: 0.75,
    driftX: 1,
    driftY: -0.5,
    dragSpeed: 1.5,
    inertia: 0.92,
    zoom: 1,
    autoDrift: true,
    enableDrag: true,
    touchDrag: true,
    paused: false,
    maxDpr: 2,
    maxTextureSize: 1024,
}

const vertexShader = [
    "varying vec2 vUv;",
    "void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
].join("\n")

const fragmentShader = [
    "precision highp float;",
    "uniform sampler2D tDiffuse;",
    "uniform float uDistortion;",
    "uniform float uChromatic;",
    "uniform float uEdgeStart;",
    "uniform vec3 uBackground;",
    "varying vec2 vUv;",
    "void main(){",
    "vec2 pos=vUv*2.0-1.0;",
    "float r=max(abs(pos.x),abs(pos.y));",
    "float edge=smoothstep(uEdgeStart,1.05,r);",
    "vec2 uv=(pos/(1.0+uDistortion*edge*r*r))*0.5+0.5;",
    "vec2 offset=normalize(pos+vec2(0.00001))*uChromatic*edge;",
    "vec2 ru=uv+offset;vec2 bu=uv-offset;",
    "float rr=texture2D(tDiffuse,clamp(ru,0.0,1.0)).r;",
    "float gg=texture2D(tDiffuse,clamp(uv,0.0,1.0)).g;",
    "float bb=texture2D(tDiffuse,clamp(bu,0.0,1.0)).b;",
    "float ok=step(0.0,ru.x)*step(ru.x,1.0)*step(0.0,ru.y)*step(ru.y,1.0);",
    "gl_FragColor=vec4(mix(uBackground,vec3(rr,gg,bb),ok),1.0);",
    "}",
].join("\n")

function norm(url: string) {
    return url.includes("i.pinimg.com/") && !url.includes("wsrv.nl")
        ? "https://wsrv.nl/?url=" + encodeURIComponent(url)
        : url
}

function wrap(v: number, p: number) {
    return ((v + p / 2) % p + p) % p - p / 2
}

function maskTexture(w: number, h: number, radius: number) {
    const c = document.createElement("canvas")
    c.width = 512
    c.height = Math.max(1, Math.round(512 * h / w))
    const ctx = c.getContext("2d")
    if (!ctx) return null
    const r = Math.min(c.width / 2, c.height / 2, Math.max(0, radius / w * c.width))
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(c.width - r, 0)
    ctx.quadraticCurveTo(c.width, 0, c.width, r)
    ctx.lineTo(c.width, c.height - r)
    ctx.quadraticCurveTo(c.width, c.height, c.width - r, c.height)
    ctx.lineTo(r, c.height)
    ctx.quadraticCurveTo(0, c.height, 0, c.height - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
    const t = new THREE.CanvasTexture(c)
    t.generateMipmaps = false
    t.minFilter = THREE.LinearFilter
    return t
}

function placeholder(i: number) {
    const c = document.createElement("canvas")
    c.width = 16
    c.height = 20
    const ctx = c.getContext("2d")
    if (ctx) {
        ctx.fillStyle = ["#d9d0c5", "#b9c8d4", "#d9bdb4", "#bbc8b5", "#c9bfd5", "#c8c0b0"][i % 6]
        ctx.fillRect(0, 0, 16, 20)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
}

export default function KarimSaifEdgeDistortionGallery(incoming: Partial<Props>) {
    const p = { ...defaults, ...incoming }
    const host = React.useRef<HTMLDivElement>(null)
    const canvas = React.useRef<HTMLCanvasElement>(null)
    const staticMode = useIsStaticRenderer()
    const [failed, setFailed] = React.useState(false)
    const [dragging, setDragging] = React.useState(false)
    const [size, setSize] = React.useState({ w: 1200, h: 800 })
    const images = (p.images || []).filter(Boolean)
    const sources = images.length ? images : DEFAULT_IMAGES
    const signature = JSON.stringify([
        sources, p.backgroundColor, p.columns, p.rows, p.cardWidth,
        p.cardHeight, p.gapX, p.gapY, p.cornerRadius, p.distortion,
        p.chromatic, p.edgeStart, p.driftX, p.driftY, p.dragSpeed,
        p.inertia, p.zoom, p.autoDrift, p.enableDrag, p.touchDrag,
        p.maxDpr, p.maxTextureSize,
    ])

    React.useEffect(() => {
        const el = host.current
        if (!el || typeof ResizeObserver === "undefined") return
        const o = new ResizeObserver(entries => {
            const r = entries[0].contentRect
            setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
        })
        o.observe(el)
        return () => o.disconnect()
    }, [])

    React.useEffect(() => {
        const el = host.current
        const cvs = canvas.current
        if (!el || !cvs || staticMode || failed) return
        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: cvs, antialias: false, alpha: false,
                powerPreference: "high-performance",
            })
        } catch {
            setFailed(true)
            return
        }

        let dead = false
        let lost = false
        let visible = true
        let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        let raf = 0
        let last = 0
        let ox = 0
        let oy = 0
        let vx = 0
        let vy = 0
        let pointer: number | null = null
        let px = 0
        let py = 0
        let pointerTime = 0
        let viewW = 2000
        let viewH = 2000
        let nx = Math.max(2, Math.floor(p.columns))
        let ny = Math.max(2, Math.floor(p.rows))
        const cw = Math.max(1, p.cardWidth)
        const ch = Math.max(1, p.cardHeight)
        const sx = cw + Math.max(0, p.gapX)
        const sy = ch + Math.max(0, p.gapY)
        const bg = new THREE.Color(p.backgroundColor)
        const scene = new THREE.Scene()
        scene.background = bg
        const camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -1000, 1000)
        camera.position.z = 100
        const target = new THREE.WebGLRenderTarget(1, 1, {
            minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
            depthBuffer: false, stencilBuffer: false,
        })
        const post = new THREE.Scene()
        const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const shader = new THREE.ShaderMaterial({
            vertexShader, fragmentShader,
            uniforms: {
                tDiffuse: { value: target.texture },
                uDistortion: { value: p.distortion },
                uChromatic: { value: p.chromatic },
                uEdgeStart: { value: p.edgeStart },
                uBackground: { value: bg },
            },
            depthWrite: false, depthTest: false,
        })
        const quadGeometry = new THREE.PlaneGeometry(2, 2)
        post.add(new THREE.Mesh(quadGeometry, shader))
        const geo = new THREE.PlaneGeometry(cw, ch)
        const alpha = maskTexture(cw, ch, p.cornerRadius)
        const materials = sources.map((_, i) => new THREE.MeshBasicMaterial({
            map: placeholder(i), alphaMap: alpha || undefined,
            transparent: true, alphaTest: 0.1, depthWrite: false,
        }))
        const textures = materials.map(m => m.map).filter((t): t is THREE.Texture => !!t)
        const meshes: THREE.Mesh[] = []
        const imagesLoading: HTMLImageElement[] = []

        function rebuild() {
            meshes.forEach(m => scene.remove(m))
            meshes.length = 0
            for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
                const m = new THREE.Mesh(geo, materials[(y * nx + x) % materials.length])
                m.userData.x = x
                m.userData.y = y
                meshes.push(m)
                scene.add(m)
            }
        }

        function positions() {
            const periodX = nx * sx
            const periodY = ny * sy
            meshes.forEach(m => {
                m.position.x = wrap((m.userData.x - (nx - 1) / 2) * sx + ox, periodX)
                m.position.y = wrap(((ny - 1) / 2 - m.userData.y) * sy + oy, periodY)
            })
        }

        function draw() {
            if (dead || lost || !visible || document.hidden) return
            positions()
            renderer.setRenderTarget(target)
            renderer.render(scene, camera)
            renderer.setRenderTarget(null)
            renderer.render(post, postCamera)
        }

        function resize() {
            if (dead || lost) return
            const rect = el!.getBoundingClientRect()
            const w = Math.max(1, rect.width)
            const h = Math.max(1, rect.height)
            const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, Math.min(2, p.maxDpr)))
            renderer.setPixelRatio(dpr)
            renderer.setSize(w, h, false)
            target.setSize(Math.round(w * dpr), Math.round(h * dpr))
            viewH = 2000 / Math.max(0.1, p.zoom)
            viewW = viewH * w / h
            camera.left = -viewW / 2
            camera.right = viewW / 2
            camera.top = viewH / 2
            camera.bottom = -viewH / 2
            camera.updateProjectionMatrix()
            const a = Math.max(2, Math.floor(p.columns), Math.ceil(viewW * (1 + p.distortion) / sx) + 4)
            const b = Math.max(2, Math.floor(p.rows), Math.ceil(viewH * (1 + p.distortion) / sy) + 4)
            if (a !== nx || b !== ny || !meshes.length) {
                nx = a
                ny = b
                rebuild()
            }
            draw()
        }

        function moving() {
            return !dead && !lost && visible && !document.hidden &&
                !p.paused && !reduced &&
                (p.autoDrift || Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01)
        }

        function tick(t: number) {
            raf = 0
            if (!moving()) return
            const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60
            last = t
            if (pointer === null) {
                ox += vx * dt
                oy += vy * dt
                const friction = Math.pow(Math.max(0, Math.min(0.99, p.inertia)), dt * 60)
                vx *= friction
                vy *= friction
                if (p.autoDrift) {
                    ox += p.driftX * dt * 60
                    oy += p.driftY * dt * 60
                }
            }
            draw()
            schedule()
        }

        function stop() {
            if (raf) cancelAnimationFrame(raf)
            raf = 0
            last = 0
        }

        function schedule() {
            if (!raf && moving()) raf = requestAnimationFrame(tick)
        }

        function down(e: PointerEvent) {
            if (p.paused || !p.enableDrag ||
                (e.pointerType === "touch" && !p.touchDrag) ||
                (e.pointerType === "mouse" && e.button !== 0)) return
            pointer = e.pointerId
            px = e.clientX
            py = e.clientY
            pointerTime = performance.now()
            vx = vy = 0
            setDragging(true)
            try { cvs!.setPointerCapture(pointer) } catch {}
        }

        function move(e: PointerEvent) {
            if (pointer !== e.pointerId) return
            const now = performance.now()
            const dt = Math.max(0.008, Math.min(0.1, (now - pointerTime) / 1000))
            const factor = viewH / Math.max(1, el!.clientHeight) * p.dragSpeed
            const dx = (e.clientX - px) * factor
            const dy = (py - e.clientY) * factor
            ox += dx
            oy += dy
            vx = dx / dt
            vy = dy / dt
            px = e.clientX
            py = e.clientY
            pointerTime = now
            draw()
        }

        function up(e: PointerEvent) {
            if (pointer !== e.pointerId) return
            pointer = null
            setDragging(false)
            if (reduced || p.paused) vx = vy = 0
            try { if (cvs!.hasPointerCapture(e.pointerId)) cvs!.releasePointerCapture(e.pointerId) } catch {}
            schedule()
        }

        function visibility() {
            stop()
            if (!document.hidden && visible) {
                draw()
                schedule()
            }
        }

        function contextLost(e: Event) {
            e.preventDefault()
            lost = true
            stop()
        }

        function contextRestored() {
            if (dead) return
            lost = false
            resize()
            schedule()
        }

        const media = window.matchMedia("(prefers-reduced-motion: reduce)")
        function mediaChanged() {
            reduced = media.matches
            if (reduced) { vx = vy = 0; stop(); draw() }
            else schedule()
        }

        const observer = new ResizeObserver(resize)
        const intersection = new IntersectionObserver(entries => {
            visible = entries[0]?.isIntersecting ?? true
            if (!visible) stop()
            else { resize(); schedule() }
        }, { threshold: 0.01 })

        observer.observe(el)
        intersection.observe(el)
        media.addEventListener?.("change", mediaChanged)
        document.addEventListener("visibilitychange", visibility)
        cvs.addEventListener("pointerdown", down)
        cvs.addEventListener("pointermove", move)
        cvs.addEventListener("pointerup", up)
        cvs.addEventListener("pointercancel", up)
        cvs.addEventListener("lostpointercapture", up)
        cvs.addEventListener("webglcontextlost", contextLost)
        cvs.addEventListener("webglcontextrestored", contextRestored)

        sources.forEach((src, index) => {
            const image = new Image()
            image.crossOrigin = "anonymous"
            image.onload = () => {
                if (dead || lost) return
                const longest = Math.max(image.naturalWidth, image.naturalHeight)
                const scale = Math.min(1, Math.max(256, p.maxTextureSize) / Math.max(1, longest))
                const iw = Math.max(1, Math.round(image.naturalWidth * scale))
                const ih = Math.max(1, Math.round(image.naturalHeight * scale))
                const c = document.createElement("canvas")
                c.width = iw
                c.height = ih
                const ctx = c.getContext("2d")
                if (!ctx) return
                ctx.drawImage(image, 0, 0, iw, ih)
                const texture = new THREE.CanvasTexture(c)
                texture.colorSpace = THREE.SRGBColorSpace
                texture.minFilter = THREE.LinearMipmapLinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.generateMipmaps = true
                const imageAspect = iw / ih
                const cardAspect = cw / ch
                const rx = imageAspect > cardAspect ? cardAspect / imageAspect : 1
                const ry = imageAspect > cardAspect ? 1 : imageAspect / cardAspect
                texture.repeat.set(rx, ry)
                texture.offset.set((1 - rx) / 2, (1 - ry) / 2)
                const material = materials[index]
                const old = material.map
                material.map = texture
                material.needsUpdate = true
                old?.dispose()
                textures.push(texture)
                draw()
            }
            image.onerror = () => {}
            image.src = norm(src)
            imagesLoading.push(image)
        })

        resize()
        schedule()

        return () => {
            dead = true
            stop()
            observer.disconnect()
            intersection.disconnect()
            media.removeEventListener?.("change", mediaChanged)
            document.removeEventListener("visibilitychange", visibility)
            cvs.removeEventListener("pointerdown", down)
            cvs.removeEventListener("pointermove", move)
            cvs.removeEventListener("pointerup", up)
            cvs.removeEventListener("pointercancel", up)
            cvs.removeEventListener("lostpointercapture", up)
            cvs.removeEventListener("webglcontextlost", contextLost)
            cvs.removeEventListener("webglcontextrestored", contextRestored)
            imagesLoading.forEach(i => { i.onload = null; i.onerror = null })
            meshes.forEach(m => scene.remove(m))
            geo.dispose()
            alpha?.dispose()
            textures.forEach(t => t.dispose())
            materials.forEach(m => m.dispose())
            quadGeometry.dispose()
            shader.dispose()
            target.dispose()
            renderer.dispose()
        }
    }, [signature, staticMode, failed, p.paused])

    const scale = size.h / (2000 / Math.max(0.1, p.zoom))
    const sw = (p.cardWidth + p.gapX) * scale
    const sh = (p.cardHeight + p.gapY) * scale
    const cx = Math.max(2, Math.ceil(size.w / Math.max(1, sw)) + 4)
    const cy = Math.max(2, Math.ceil(size.h / Math.max(1, sh)) + 4)
    const fallbackCards = []
    for (let y = 0; y < cy; y++) for (let x = 0; x < cx; x++) {
        fallbackCards.push({
            x: (x - (cx - 1) / 2) * sw,
            y: (y - (cy - 1) / 2) * sh,
            image: sources[(y * cx + x) % sources.length],
        })
    }

    return (
        <div ref={host} role="group" aria-label="Interactive infinite image gallery"
            style={{
                ...p.style, width: "100%", height: "100%", position: "relative",
                overflow: "hidden", isolation: "isolate", background: p.backgroundColor,
            }}>
            {staticMode || failed ? (
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                    {fallbackCards.map((item, i) => (
                        <img key={i} src={norm(item.image)} alt="" draggable={false}
                            style={{
                                position: "absolute", left: "50%", top: "50%",
                                width: p.cardWidth * scale, height: p.cardHeight * scale,
                                transform: "translate(-50%,-50%) translate(" + item.x + "px," + item.y + "px)",
                                objectFit: "cover", borderRadius: p.cornerRadius * scale,
                            }} />
                    ))}
                </div>
            ) : (
                <canvas ref={canvas} aria-hidden="true" style={{
                    display: "block", width: "100%", height: "100%",
                    cursor: p.enableDrag ? dragging ? "grabbing" : "grab" : "default",
                    touchAction: p.enableDrag && p.touchDrag ? "none" : "auto",
                }} />
            )}
        </div>
    )
}

KarimSaifEdgeDistortionGallery.defaultProps = defaults

addPropertyControls(KarimSaifEdgeDistortionGallery, {
    images: { type: ControlType.Array, title: "Images", description: "Images repeated throughout the gallery; upload licensed assets.", control: { type: ControlType.Image }, maxCount: 30 },
    backgroundColor: { type: ControlType.Color, title: "Background", description: "Color behind the image cards.", defaultValue: "#FFFFFF" },
    columns: { type: ControlType.Number, title: "Columns", description: "Minimum number of grid columns.", min: 2, max: 12, step: 1, defaultValue: 5 },
    rows: { type: ControlType.Number, title: "Rows", description: "Minimum number of grid rows.", min: 2, max: 12, step: 1, defaultValue: 5 },
    cardWidth: { type: ControlType.Number, title: "Card Width", description: "Card width in world units.", min: 100, max: 1200, step: 10, defaultValue: 600 },
    cardHeight: { type: ControlType.Number, title: "Card Height", description: "Card height in world units.", min: 100, max: 1500, step: 10, defaultValue: 750 },
    gapX: { type: ControlType.Number, title: "Horizontal Gap", description: "Space between columns.", min: 0, max: 600, step: 10, defaultValue: 200 },
    gapY: { type: ControlType.Number, title: "Vertical Gap", description: "Space between rows.", min: 0, max: 600, step: 10, defaultValue: 200 },
    cornerRadius: { type: ControlType.Number, title: "Corners", description: "Rounded card-corner radius.", min: 0, max: 200, step: 1, defaultValue: 40 },
    distortion: { type: ControlType.Number, title: "Fisheye", description: "Strength of fisheye distortion at the edges.", min: 0, max: 0.8, step: 0.01, defaultValue: 0.3 },
    chromatic: { type: ControlType.Number, title: "RGB Split", description: "Amount of chromatic aberration near the edges.", min: 0, max: 0.03, step: 0.001, defaultValue: 0.008 },
    edgeStart: { type: ControlType.Number, title: "Edge Start", description: "Distance from the center where edge distortion starts.", min: 0.2, max: 0.95, step: 0.01, defaultValue: 0.75 },
    zoom: { type: ControlType.Number, title: "Zoom", description: "Scale of the gallery view.", min: 0.3, max: 3, step: 0.05, defaultValue: 1 },
    autoDrift: { type: ControlType.Boolean, title: "Auto Drift", description: "Automatically move the gallery while idle.", defaultValue: true },
    driftX: { type: ControlType.Number, title: "Drift X", description: "Horizontal automatic drift.", min: -5, max: 5, step: 0.1, defaultValue: 1, hidden: p => !p.autoDrift },
    driftY: { type: ControlType.Number, title: "Drift Y", description: "Vertical automatic drift.", min: -5, max: 5, step: 0.1, defaultValue: -0.5, hidden: p => !p.autoDrift },
    enableDrag: { type: ControlType.Boolean, title: "Drag", description: "Enable mouse, pen and optional touch panning.", defaultValue: true },
    touchDrag: { type: ControlType.Boolean, title: "Touch Drag", description: "Allow touch dragging; disable to preserve mobile page scrolling.", defaultValue: true, hidden: p => !p.enableDrag },
    dragSpeed: { type: ControlType.Number, title: "Drag Speed", description: "Pointer movement sensitivity.", min: 0.1, max: 4, step: 0.1, defaultValue: 1.5, hidden: p => !p.enableDrag },
    inertia: { type: ControlType.Number, title: "Inertia", description: "Gliding momentum after drag release.", min: 0, max: 0.99, step: 0.01, defaultValue: 0.92, hidden: p => !p.enableDrag },
    paused: { type: ControlType.Boolean, title: "Paused", description: "Stop automatic movement and dragging.", defaultValue: false },
    maxDpr: { type: ControlType.Number, title: "Max DPR", description: "Maximum pixel density for GPU rendering.", min: 1, max: 2, step: 0.5, defaultValue: 2 },
    maxTextureSize: { type: ControlType.Number, title: "Texture Size", description: "Maximum image texture dimension to limit memory usage.", min: 256, max: 2048, step: 256, defaultValue: 1024 },
})
