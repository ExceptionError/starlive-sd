import { proxyAssetManager } from "./karthuria";
import { SkeletonBinary36 } from "./skel";
import { Model, Stage } from "./webgl";

let stage: Stage;

const searchParams = new URLSearchParams(window.location.search);
const rawPath = searchParams.get("path");
const path = rawPath ? rawPath : "costume/1010001/model_right";
// e.g.
// ?path=costume/101001/model_left
// ?path=minigame/making_cake/405/model_right

const atlasPath = `${path}.atlas`;
const skelPath = resolveSkelPath(path);
const flip = path.endsWith("model_left");

function resolveSkelPath(path: string): string {
  const dirs = path.split("/");
  if (dirs[0] === "costume") {
    const character = dirs[1].slice(0, 3);
    const model = dirs[2];
    return `character/${character}/${model}.skel`;
  } else {
    return `${path}.skel`;
  }
}

function init() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  const gl = canvas.getContext("webgl", { alpha: false });
  const pathPrefix = "https://cdn.karth.top/api/assets/jp/res/spine/";
  const assetManager = proxyAssetManager(
    new spine.webgl.AssetManager(gl, pathPrefix)
  );
  stage = new Stage(canvas, assetManager);

  assetManager.loadTextureAtlas(atlasPath);
  assetManager.loadBinary(skelPath);

  requestAnimationFrame(load);
}

function load() {
  if (stage.assetManager.isLoadingComplete()) {
    stage.model = loadModel();
    setupUI();
  } else {
    requestAnimationFrame(load);
  }
}

function loadModel(): Model {
  const atlas: spine.TextureAtlas = stage.assetManager.get(atlasPath);
  const skel: Uint8Array = stage.assetManager.get(skelPath);

  const atlasLoader = new spine.AtlasAttachmentLoader(atlas);
  const skeltonBinary = new SkeletonBinary36(atlasLoader);
  const skeletonData = skeltonBinary.readSkeletonData(skel);
  const skeleton = new spine.Skeleton(skeletonData);
  skeleton.scaleX = flip ? -1 : 1;
  const bounds = calculateBounds(skeleton);

  const animationStateData = new spine.AnimationStateData(skeleton.data);
  const animationState = new spine.AnimationState(animationStateData);
  const defaultAnimation = skeleton.data.animations[0].name;
  animationState.setAnimation(0, defaultAnimation, false);
  return { skel: skeleton, animationState, bounds: bounds };
}

function calculateBounds(skel: spine.Skeleton) {
  skel.setToSetupPose();
  skel.updateWorldTransform();
  const offset = new spine.Vector2();
  const size = new spine.Vector2();
  skel.getBounds(offset, size, []);
  return { offset: offset, size: size };
}

function setupUI(): void {
  const setupAnimationUI = function () {
    const animationList = $("#animationList");
    animationList.empty();
    const skel = stage.model.skel;
    const animationState = stage.model.animationState;
    const activeAnimation = animationState.tracks[0]?.animation.name ?? "";
    const animations = skel.data.animations;
    for (let i = 0, n = animations.length; i < n; i++) {
      const name = animations[i].name;
      const option = $("<option></option>");
      option.attr("value", name).text(name);
      if (name === activeAnimation) {
        option.attr("selected", "selected");
      }
      animationList.append(option);
    }

    const handleAnimationChange = () => {
      const skel = stage.model.skel;
      const animationState = stage.model.animationState;
      const animationName = $("#animationList option:selected").text();
      const loop = $("#loop").is(":checked");
      skel.setToSetupPose();
      animationState.setAnimation(0, animationName, loop);
    };

    animationList.on("change", handleAnimationChange);
    $("#loop").on("change", handleAnimationChange);

    handleAnimationChange();
  };

  const debug = $("#debug");
  debug.on("change", () => {
    stage.debug = debug.is(":checked");
  });

  setupAnimationUI();
}

(() => {
  init();
})();
