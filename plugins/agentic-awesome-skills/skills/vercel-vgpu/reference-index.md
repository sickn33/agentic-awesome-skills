# vgpu

Generated from the vgpu `.docs.md` source. Each entry maps to a file in `references/` and to a
doc included in this skill. Load only the references needed for the task.

vgpu is layered: vgpu/core (thin WebGPU wrappers) → vgpu (main API with WGSL reflection) → vgpu/scene (geometry/camera helpers). Lower layers are always accessible and interoperable.

Glossary: **Surface** means a canvas-backed render target (swapchain) created with `surface(gpu, canvas)`; do not confuse it with the general phrase ‘API surface’.

Search the local `references/` directory by guide title or symbol.

## Core concepts

- **Context** — Everything in vgpu starts from one call.  `references/guides/concepts-context.docs.md`
- **Draws** — A Draw renders geometry with custom vertex buffers: you write both the vertex and the fragment stage, and a geometry supplies the buffers.  `references/guides/concepts-draws.docs.md`
- **Compilation** — Pipelines compile lazily: the first draw() against a new target pays the pipeline creation cost, and that cost lands inside your frame.  `references/guides/concepts-compilation.docs.md`
- **Effects** — An Effect is a full-screen fragment shader created with effect(gpu, source).  `references/guides/concepts-effects.docs.md`
- **Passes** — A pass is a render-pass section inside a frame.  `references/guides/concepts-passes.docs.md`
- **Frames** — A frame is one unit of GPU work.  `references/guides/concepts-frames.docs.md`
- **Render bundles** — A render loop re-encodes every pipeline, bind group, and draw on every tick — even when nothing changed.  `references/guides/concepts-render-bundles.docs.md`

## CLI reference

- **CLI** — vgpu CLI commands, arguments, flags, and exit codes.  `references/guides/cli.docs.md`

## Performance guides

Writing or optimizing a shader? Read **performance-model** first, then the rest as needed.

- **WebGPU screenshots with agent-browser** — Use agent-browser to verify and capture vgpu previews that run WebGPU on Linux, including containers without a GPU.  `references/guides/agent-browser-webgpu.docs.md`
- **Authoring shaders for performance** — Write WGSL so reflection can build stable layouts.  `references/guides/authoring-for-perf.docs.md`
- **Browser testing with Playwright WebGPU** — Browser tests should exercise the same public API users copy: init(), surface(gpu, canvas, opts), explicit targets, and deterministic frame submiss…  `references/guides/browser-testing.docs.md`
- **External ticker** — By default vgpu owns the clock: every frame(gpu) moves clock(gpu).time forward by the wall-clock delta since the last frame, and frameLoop(gpu, cb)…  `references/guides/external-ticker.docs.md`
- **Getting started** — Start with the public vgpu package.  `references/guides/getting-started.docs.md`
- **MCP** — Connect coding agents directly to VGPU documentation and verified examples through the Model Context Protocol.  `references/guides/mcp.docs.md`
- **Measuring** — Measure the thing you intend to optimize: CPU encoding, pipeline warm-up, bind-group churn, target memory, or shader cost.  `references/guides/measuring.docs.md`
- **Overview** — Share one GPUDevice between vgpu and a machine learning runtime so model outputs stay on the GPU.  `references/guides/ml.docs.md`
- **Quickstart: Browser** — In this quickstart you run an ONNX model with ONNX Runtime Web's WebGPU execution provider and consume its output with vgpu shaders — on one shared…  `references/guides/ml-browser.docs.md`
- **Buffers & ownership** — ts export interface InitOptions { readonly adapter?: VGPUAdapter; / Never set: adoption lives in initFromDevice(device).  `references/guides/ml-buffers.docs.md`
- **Quickstart: Node** — In this quickstart you run the same integration in Node, with Dawn providing WebGPU.  `references/guides/ml-node.docs.md`
- **Using vgpu with Next.js and other bundlers** — effect(gpu, source) takes WGSL as a string, so nothing forces you to use a bundler loader.  `references/guides/nextjs.docs.md`
- **Using vgpu without a bundler** — effect(gpu, source) and draw(gpu, { shader }) take WGSL as a plain string, so nothing forces you to use a bundler.  `references/guides/no-bundler.docs.md`
- **Optimize a pass** — Optimize one pass by first deciding what changes every frame.  `references/guides/optimize-pass.docs.md`
- **Performance model** — vgpu's public API is organized around stable identities.  `references/guides/performance-model.docs.md`
- **Performance patterns** — This is the quick index.  `references/guides/performance-patterns.docs.md`
- **Performance playbook: write fast vgpu by default** — This guide is for LLMs and humans writing shaders.  `references/guides/performance-playbook.docs.md`
- **Publishing WGSL module packages** — A WGSL module package is an ordinary npm package whose exports map points at .wgsl files instead of JavaScript.  `references/guides/publishing-wgsl-packages.docs.md`
- **Debugging shaders by extracting internal values** — A shader has no console.log.  `references/guides/shader-debugging.docs.md`
- **Shader diagnostics and fix-its** — Use these messages as the self-correction map for generated shader code.  `references/guides/shader-fix-its.docs.md`
- **The default workflow for developing shaders with vgpu** — Follow these eight steps in order every time you write or change a shader.  `references/guides/shader-workflow.docs.md`
- **Practical texture-format matrix** — Choose a target format from the operations it must support, not just its channel precision.  `references/guides/texture-formats.docs.md`
- **Two-pass rendering: offscreen depth target composited to the canvas** — Surfaces and canvases have no depth buffer, and Draws need one for any real 3D scene.  `references/guides/two-pass-rendering.docs.md`

## API reference

258 symbols across 20 packages — open `references/<package>/<file>`:

- `@vgpu/adapter-node` — createNodeAdapter, createNodeDevice
- `@vgpu/render/edit` — bevel, bridge, dissolveEdges, dissolveFaces, dissolveVertices, EdgeView, EditableMesh, EditableMeshValue, ElementDomain, ElementSelection, ElementSet, extrude, FaceView, fillHole, gridFill, healManifold, inset, KernelHandle, loopCut, mergeByDistance, MeshEditError, MeshEditWarning, recomputeNormals, ScoredSelection, subdivideEdges, subdivideFaces, toEditable, toEditableWithDiagnostics, VertexView
- `@vgpu/render/inspect` — InspectMaterial, InspectMaterialUniformParams, meshToReadable, meshToWireframe, normalDebugMaterial, NormalDebugMaterialSpec, wireframeMaterial, WireframeMaterialSpec, WireframeMesh
- `@vgpu/render/perf` — gpuFrameTime, GpuFrameTimeOptions, GpuFrameTimeResult, pixelDiff, PixelDiffResult
- `@vgpu/render/utils` — canvasMouseTracker, CanvasMouseTracker, CanvasMouseTrackerSpec, canvasResolution, CanvasResolution, frameClock, FrameClock
- `@vgpu/wgsl` — compile, ResolvedShader, SourceMap, WGSLAst, WGSLSource
- `@vgpu/wgsl-std/color` — applyExposure, luminance, luminanceThreshold, tonemapAces, tonemapReinhard
- `@vgpu/wgsl-std/fullscreen` — fullscreenTriangleClip, fullscreenTriangleUv
- `@vgpu/wgsl-std/hash` — hash1, hash2, hash3, hashU32, pcg2d, pcg3d, unitFloat
- `@vgpu/wgsl-std/noise` — voronoi2d, voronoi3d, VoronoiSample2, VoronoiSample3
- `@vgpu/wgsl-std/noise/perlin` — fbmPerlin2d, fbmPerlin3d, perlin2d, perlin3d
- `@vgpu/wgsl-std/noise/simplex` — fbmSimplex2d, fbmSimplex3d, simplex2d, simplex3d
- `@vgpu/wgsl/loader-vite` — transformWgsl, ViteLoadResult, wgslVitePlugin
- `@vgpu/wgsl/loader-webpack` — wgslWebpackLoader
- `@vgpu/wgsl/reflect-source` — EntryPointInfo, Reflection, reflectSource
- `@vgpu/wgsl/runtime` — ResolvedShader, ResolveOptions, resolveShader, SourceMap, WGSLAst, WGSLModule
- `vgpu` — Bundle, BundleOptions, BundleRecorder, clock, Clock, Compute, ComputeOptions, Draw, DrawCallOptions, DrawLayoutOptions, DrawOptions, Effect, EffectOptions, Frame, FrameLoopHandle, FramePass, FramePassOptions, FrameRunner, Geometry, GeometryLike, Gpu, init, InitOptions, PingPongStorage, PingPongTargets, SharedUniforms, StorageAccess, StorageBuffer, Surface, SurfaceOptions, SurfaceResizeEvent, Target, TargetOptions, TargetTextureOptions, Timer, TimerSpan, Uniform, UniformOptions, Visibility, VisibilityOptions, VisibilityQuery
- `vgpu/core` — bind, Buffer, BufferOptions, createBindGroup, createBindGroupLayout, CreateDeviceOptions, createPipelineLayout, createRenderBundle, createSampler, Device, DeviceOptions, Queue, RenderBundleOptions, RenderBundleRecorder, ScalarUniformType, StorageBuffer, StorageBufferOptions, StructuredUniform, StructuredUniformOptions, Texture, TextureOptions, Uniform, UniformField, UniformLayout, UniformLayoutInfo, UniformOptions, UniformPool, UniformPoolOptions, UniformSlot, UniformValues, ValidationError, VectorUniformInput, VGPUAdapter, VGPUError, WgslUniformType
- `vgpu/mock` — createMockAdapter
- `vgpu/scene` — ambientLight, AmbientLight, AmbientLightOptions, AmbientLightValues, box, BoxOptions, Camera, CameraVec3, capsule, CapsuleOptions, ColorMaterialOptions, ColorMaterialValues, cone, ConeOptions, cylinder, CylinderOptions, degToRad, directionalLight, DirectionalLight, DirectionalLightOptions, DirectionalLightValues, disk, DiskOptions, dodecahedron, fullscreenQuad, FullscreenQuadOptions, geometries, GeometryKind, group, icosahedron, icosphere, IcosphereOptions, lambertMaterial, LambertMaterial, Mat4, MaterialBlend, mesh, MeshNode, NodeOptions, NodeTransformValues, normalMaterial, NormalMaterial, octahedron, orbit, orbitControls, OrbitControls, OrbitControlsElement, OrbitControlsOptions, OrbitControlsValues, OrbitOptions, orthographicCamera, OrthographicCamera, OrthographicCameraOptions, OrthographicCameraValues, perspectiveCamera, PerspectiveCamera, PerspectiveCameraOptions, PerspectiveCameraValues, plane, PlaneOptions, PolyhedronOptions, QuatLike, ring, RingOptions, scene, SceneCamera, SceneGeometry, SceneGeometryOfKind, SceneMaterial, SceneMaterialKind, SceneNode, SceneNodeKind, shaderMaterial, ShaderMaterial, ShaderMaterialOptions, sphere, SphereOptions, srgb, tetrahedron, torus, TorusOptions, unlitMaterial, UnlitMaterial, Vec3, Vec3Like
