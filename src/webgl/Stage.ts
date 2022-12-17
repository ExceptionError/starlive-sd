export type Model = {
  skel: spine.Skeleton;
  animationState: spine.AnimationState;
  bounds: {
    offset: spine.Vector2;
    size: spine.Vector2;
  };
};

export class Stage {
  public context: spine.webgl.ManagedWebGLRenderingContext;
  public gl: WebGLRenderingContext;

  public lastFrameTime: number;
  public mvp: spine.webgl.Matrix4;

  public shader: spine.webgl.Shader;
  public batcher: spine.webgl.PolygonBatcher;
  public skeletonRenderer: spine.webgl.SkeletonRenderer;

  public debug: boolean;
  public debugRenderer: spine.webgl.SkeletonDebugRenderer;
  public debugShader: spine.webgl.Shader;
  public debugShapes: spine.webgl.ShapeRenderer;

  public model?: Model;

  constructor(
    public canvas: HTMLCanvasElement,
    public assetManager: spine.webgl.AssetManager
  ) {
    this.context = new spine.webgl.ManagedWebGLRenderingContext(canvas);
    this.gl = this.context.gl;

    this.lastFrameTime = Date.now() / 1000;
    this.mvp = new spine.webgl.Matrix4();

    this.shader = spine.webgl.Shader.newTwoColoredTextured(this.context);
    this.batcher = new spine.webgl.PolygonBatcher(this.context);
    this.skeletonRenderer = new spine.webgl.SkeletonRenderer(this.context);

    this.debug = false;
    const debugRenderer = new spine.webgl.SkeletonDebugRenderer(this.gl);
    debugRenderer.drawBones = true;
    debugRenderer.drawRegionAttachments = true;
    debugRenderer.drawBoundingBoxes = false;
    debugRenderer.drawMeshHull = false;
    debugRenderer.drawMeshTriangles = false;
    debugRenderer.drawPaths = false;
    debugRenderer.drawSkeletonXY = false;
    debugRenderer.drawClipping = false;
    this.debugRenderer = debugRenderer;
    this.debugShader = spine.webgl.Shader.newColored(this.context);
    this.debugShapes = new spine.webgl.ShapeRenderer(this.context);

    requestAnimationFrame(this.waitForAssets.bind(this));
  }

  private waitForAssets = () => {
    if (this.assetManager.isLoadingComplete()) {
      if (this.assetManager.hasErrors()) {
        console.error(this.assetManager.getErrors());
      } else {
        this.tick();
      }
      return;
    }
    requestAnimationFrame(this.waitForAssets);
  };

  private tick = () => {
    const now = Date.now() / 1000;
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.model) {
      this.resize();

      const { skel, animationState } = this.model;
      animationState.update(delta);
      animationState.apply(skel);
      skel.updateWorldTransform();

      this.render();
      this.renderDebug();
    }

    requestAnimationFrame(this.tick.bind(this));
  }

  private resize = () => {
    if (!this.model) return;
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const bounds = this.model.bounds;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const centerX = bounds.offset.x + bounds.size.x / 2;
    const centerY = bounds.offset.y + bounds.size.y / 2;
    const scaleX = bounds.size.x / canvas.width;
    const scaleY = bounds.size.y / canvas.height;
    let scale = Math.max(scaleX, scaleY);
    if (scale < 1) scale = 1;
    const width = canvas.width * scale;
    const height = canvas.height * scale;

    this.mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  private render = () => {
    if (!this.model) return;
    this.gl.clearColor(0.3, 0.3, 0.3, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.shader.bind();
    this.shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
    this.shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, this.mvp.values);
    this.batcher.begin(this.shader);
    this.skeletonRenderer.premultipliedAlpha = true;
    this.skeletonRenderer.draw(this.batcher, this.model.skel);
    this.batcher.end();
    this.shader.unbind();
  }

  private renderDebug = () => {
    if (!this.model) return;
    if (this.debug) {
      this.debugShader.bind();
      this.debugShader.setUniform4x4f(
        spine.webgl.Shader.MVP_MATRIX,
        this.mvp.values
      );
      this.debugShapes.begin(this.debugShader);
      this.debugRenderer.premultipliedAlpha = true;
      this.debugRenderer.draw(this.debugShapes, this.model.skel);
      this.debugShapes.end();
      this.debugShader.unbind();
    }
  }
}
