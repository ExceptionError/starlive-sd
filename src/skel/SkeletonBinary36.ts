import { BinaryInput } from "./BinaryInput";

export class SkeletonBinary36 {
  public scale = 1;
  private linkedMeshes: LinkedMesh[] = [];

  constructor(public attachmentLoader: spine.AttachmentLoader) {}

  public readSkeletonData(binary: Uint8Array): spine.SkeletonData {
    const scale = this.scale;
    const input = new BinaryInput(binary);
    const skel = new spine.SkeletonData();
    skel.name = ""; // BOZO

    const nonessential = this.assignMeta(input, skel);
    const bones = this.readBones(input, scale, nonessential);
    const slots = this.readSlots(input, bones);
    skel.bones = bones;
    skel.slots = slots;
    skel.ikConstraints = this.readIkConstraints(input, bones);
    skel.transformConstraints = this.readTransformConstraints(input, scale);
    skel.pathConstraints = this.readPathConstraints(input, bones, slots, scale);
    this.assignSkins(input, skel, scale, nonessential);
    this.linkedMeshes = this.assignLinkedMeshes(skel, this.linkedMeshes);
    skel.events = this.readEvents(input);
    skel.animations = this.readAnimations(input, skel, scale);

    return skel;
  }

  private assignMeta(input: BinaryInput, skel: spine.SkeletonData): boolean {
    skel.hash = input.readString();
    skel.version = input.readString();
    skel.width = input.readFloat();
    skel.height = input.readFloat();
    const nonessential = input.readBoolean();
    if (nonessential) {
      skel.fps = input.readFloat();
      skel.imagesPath = input.readString();
    }
    return nonessential;
  }

  private readBones(
    input: BinaryInput,
    scale: number,
    nonessential: boolean
  ): spine.BoneData[] {
    const bones = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const name = input.readString();
      if (!name) {
        throw new Error("Bone name must not be null.");
      }
      const parent = i == 0 ? null : bones[input.readInt(true)];
      const data = new spine.BoneData(i, name, parent);
      data.rotation = input.readFloat();
      data.x = input.readFloat() * scale;
      data.y = input.readFloat() * scale;
      data.scaleX = input.readFloat();
      data.scaleY = input.readFloat();
      data.shearX = input.readFloat();
      data.shearY = input.readFloat();
      data.length = input.readFloat() * scale;
      data.transformMode = input.readInt(true);
      if (nonessential) {
        spine.Color.rgba8888ToColor(data.color, input.readInt32());
      }
      bones.push(data);
    }
    return bones;
  }

  private readSlots(
    input: BinaryInput,
    bones: spine.BoneData[]
  ): spine.SlotData[] {
    const slots = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const slotName = input.readString();
      if (!slotName) {
        throw new Error("Slot name must not be null.");
      }
      const boneData = bones[input.readInt(true)];
      const data = new spine.SlotData(i, slotName, boneData);
      spine.Color.rgba8888ToColor(data.color, input.readInt32());
      const darkColor = input.readInt32();
      if (darkColor != -1) {
        data.darkColor = new spine.Color();
        spine.Color.rgb888ToColor(data.darkColor, darkColor);
      }
      data.attachmentName = input.readString();
      data.blendMode = input.readInt(true);
      slots.push(data);
    }
    return slots;
  }

  private readIkConstraints(
    input: BinaryInput,
    bones: spine.BoneData[]
  ): spine.IkConstraintData[] {
    const ikConstraints = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const name = input.readString();
      if (!name) {
        throw new Error("IK constraint data name must not be null.");
      }
      const data = new spine.IkConstraintData(name);
      data.order = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        data.bones.push(bones[input.readInt(true)]);
      }
      data.target = bones[input.readInt(true)];
      data.mix = input.readFloat();
      data.bendDirection = input.readByte();
      ikConstraints.push(data);
    }
    return ikConstraints;
  }

  private readTransformConstraints(
    input: BinaryInput,
    scale: number
  ): spine.TransformConstraintData[] {
    const transformConstraints = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const name = input.readString();
      if (!name) {
        throw new Error("Transform constraint data name must not be null.");
      }
      const data = new spine.TransformConstraintData(name);
      data.order = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        data.bones.push(data.bones[input.readInt(true)]);
      }
      data.target = data.bones[input.readInt(true)];
      data.local = input.readBoolean();
      data.relative = input.readBoolean();
      data.offsetRotation = input.readFloat();
      data.offsetX = input.readFloat() * scale;
      data.offsetY = input.readFloat() * scale;
      data.offsetScaleX = input.readFloat();
      data.offsetScaleY = input.readFloat();
      data.offsetShearY = input.readFloat();
      data.rotateMix = input.readFloat();
      data.translateMix = input.readFloat();
      data.scaleMix = input.readFloat();
      data.shearMix = input.readFloat();
      transformConstraints.push(data);
    }
    return transformConstraints;
  }

  private readPathConstraints(
    input: BinaryInput,
    bones: spine.BoneData[],
    slots: spine.SlotData[],
    scale: number
  ): spine.PathConstraintData[] {
    const pathConstraints = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const name = input.readString();
      if (!name) {
        throw new Error("Path constraint data name must not be null.");
      }
      const data = new spine.PathConstraintData(name);
      data.order = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        data.bones.push(bones[input.readInt(true)]);
      }
      data.target = slots[input.readInt(true)];
      data.positionMode = input.readInt(true);
      data.spacingMode = input.readInt(true);
      data.rotateMode = input.readInt(true);
      data.offsetRotation = input.readFloat();
      data.position = input.readFloat();
      if (data.positionMode == spine.PositionMode.Fixed) {
        data.position *= scale;
      }
      data.spacing = input.readFloat();
      const s = data.spacingMode;
      if (s == spine.SpacingMode.Length || s == spine.SpacingMode.Fixed) {
        data.spacing *= scale;
      }
      data.rotateMix = input.readFloat();
      data.translateMix = input.readFloat();
      pathConstraints.push(data);
    }
    return pathConstraints;
  }

  private assignSkins(
    input: BinaryInput,
    skel: spine.SkeletonData,
    scale: number,
    nonessential: boolean
  ): void {
    const skins = [];
    const defaultSkin = this.readSkin(input, skel, true, scale, nonessential);
    if (defaultSkin) {
      skel.defaultSkin = defaultSkin;
      skins.push(defaultSkin);
    }
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const skin = this.readSkin(input, skel, false, scale, nonessential);
      if (!skin) {
        throw new Error("readSkin() should not have returned null.");
      }
      skins.push(skin);
    }
    skel.skins = skins;
  }

  private readSkin(
    input: BinaryInput,
    skel: spine.SkeletonData,
    defaultSkin: boolean,
    scale: number,
    nonessential: boolean
  ): spine.Skin | null {
    let skin: spine.Skin;
    let slotCount = 0;

    if (defaultSkin) {
      slotCount = input.readInt(true);
      if (slotCount == 0) {
        return null;
      }
      skin = new spine.Skin("default");
    } else {
      const skinName = input.readString();
      if (!skinName) {
        throw new Error("Skin name must not be null.");
      }
      skin = new spine.Skin(skinName);
      skin.bones.length = input.readInt(true);
      for (let i = 0, n = skin.bones.length; i < n; i++) {
        skin.bones[i] = skel.bones[input.readInt(true)];
      }
      for (let i = 0, n = input.readInt(true); i < n; i++) {
        skin.constraints.push(skel.ikConstraints[input.readInt(true)]);
      }
      for (let i = 0, n = input.readInt(true); i < n; i++) {
        skin.constraints.push(skel.transformConstraints[input.readInt(true)]);
      }
      for (let i = 0, n = input.readInt(true); i < n; i++) {
        skin.constraints.push(skel.pathConstraints[input.readInt(true)]);
      }
      slotCount = input.readInt(true);
    }

    for (let i = 0; i < slotCount; i++) {
      const slotIndex = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        const name = input.readString();
        if (!name) {
          throw new Error("Attachment name must not be null");
        }
        const attachment = this.readAttachment(
          input,
          skel,
          skin,
          slotIndex,
          name,
          scale,
          nonessential
        );
        if (attachment) {
          skin.setAttachment(slotIndex, name, attachment);
        }
      }
    }
    return skin;
  }

  private readAttachment(
    input: BinaryInput,
    skel: spine.SkeletonData,
    skin: spine.Skin,
    slotIndex: number,
    attachmentName: string,
    scale: number,
    nonessential: boolean
  ): spine.Attachment | null {
    let name = input.readString();
    if (!name) {
      name = attachmentName;
    }

    switch (input.readByte()) {
      case spine.AttachmentType.Region: {
        let path = input.readString();
        const rotation = input.readFloat();
        const x = input.readFloat();
        const y = input.readFloat();
        const scaleX = input.readFloat();
        const scaleY = input.readFloat();
        const width = input.readFloat();
        const height = input.readFloat();
        const color = input.readInt32();
        if (!path) {
          path = name;
        }
        const region = this.attachmentLoader.newRegionAttachment(
          skin,
          name,
          path
        );
        if (!region) {
          return null;
        }
        region.path = path;
        region.x = x * scale;
        region.y = y * scale;
        region.scaleX = scaleX;
        region.scaleY = scaleY;
        region.rotation = rotation;
        region.width = width * scale;
        region.height = height * scale;
        spine.Color.rgba8888ToColor(region.color, color);
        region.updateOffset();
        return region;
      }
      case spine.AttachmentType.BoundingBox: {
        const vertexCount = input.readInt(true);
        const vertices = this.readVertices(input, scale, vertexCount);
        const color = nonessential ? input.readInt32() : 0;
        const box = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
        if (!box) {
          return null;
        }
        box.worldVerticesLength = vertexCount << 1;
        box.vertices = vertices.vertices!;
        box.bones = vertices.bones;
        if (nonessential) {
          spine.Color.rgba8888ToColor(box.color, color);
        }
        return box;
      }
      case spine.AttachmentType.Mesh: {
        let path = input.readString();
        const color = input.readInt32();
        const vertexCount = input.readInt(true);
        const uvs = this.readFloatArray(input, vertexCount << 1, 1);
        const triangles = this.readShortArray(input);
        const vertices = this.readVertices(input, scale, vertexCount);
        const hullLength = input.readInt(true);
        let edges: number[] = [];
        let width = 0;
        let height = 0;
        if (nonessential) {
          edges = this.readShortArray(input);
          width = input.readFloat();
          height = input.readFloat();
        }
        if (!path) {
          path = name;
        }
        const mesh = this.attachmentLoader.newMeshAttachment(skin, name, path);
        if (!mesh) {
          return null;
        }
        mesh.path = path;
        spine.Color.rgba8888ToColor(mesh.color, color);
        mesh.bones = vertices.bones;
        mesh.vertices = vertices.vertices!;
        mesh.worldVerticesLength = vertexCount << 1;
        mesh.triangles = triangles;
        mesh.regionUVs = uvs;
        mesh.updateUVs();
        mesh.hullLength = hullLength << 1;
        if (nonessential) {
          mesh.edges = edges;
          mesh.width = width * scale;
          mesh.height = height * scale;
        }
        return mesh;
      }
      case spine.AttachmentType.LinkedMesh: {
        let path = input.readString();
        const color = input.readInt32();
        const skinName = input.readString();
        const parent = input.readString();
        const inheritTimeline = input.readBoolean();
        let width = 0;
        let height = 0;
        if (nonessential) {
          width = input.readFloat();
          height = input.readFloat();
        }
        if (!path) {
          path = name;
        }
        const mesh = this.attachmentLoader.newMeshAttachment(skin, name, path);
        if (!mesh) {
          return null;
        }
        mesh.path = path;
        spine.Color.rgba8888ToColor(mesh.color, color);
        if (nonessential) {
          mesh.width = width * scale;
          mesh.height = height * scale;
        }
        this.linkedMeshes.push({
          mesh,
          skin: skinName,
          slotIndex,
          parent,
          inheritTimeline,
        });
        return mesh;
      }
      case spine.AttachmentType.Path: {
        const closed = input.readBoolean();
        const constantSpeed = input.readBoolean();
        const vertexCount = input.readInt(true);
        const vertices = this.readVertices(input, scale, vertexCount);
        const lengths = spine.Utils.newArray(vertexCount / 3, 0);
        for (let i = 0, n = lengths.length; i < n; i++) {
          lengths[i] = input.readFloat() * scale;
        }
        const color = nonessential ? input.readInt32() : 0;
        const path = this.attachmentLoader.newPathAttachment(skin, name);
        if (!path) {
          return null;
        }
        path.closed = closed;
        path.constantSpeed = constantSpeed;
        path.worldVerticesLength = vertexCount << 1;
        path.vertices = vertices.vertices!;
        path.bones = vertices.bones;
        path.lengths = lengths;
        if (nonessential) {
          spine.Color.rgba8888ToColor(path.color, color);
        }
        return path;
      }
      case spine.AttachmentType.Point: {
        const rotation = input.readFloat();
        const x = input.readFloat();
        const y = input.readFloat();
        const color = nonessential ? input.readInt32() : 0;
        const point = this.attachmentLoader.newPointAttachment(skin, name);
        if (!point) {
          return null;
        }
        point.x = x * scale;
        point.y = y * scale;
        point.rotation = rotation;
        if (nonessential) {
          spine.Color.rgba8888ToColor(point.color, color);
        }
        return point;
      }
      case spine.AttachmentType.Clipping: {
        const endSlotIndex = input.readInt(true);
        const vertexCount = input.readInt(true);
        const vertices = this.readVertices(input, scale, vertexCount);
        const color = nonessential ? input.readInt32() : 0;
        const clip = this.attachmentLoader.newClippingAttachment(skin, name);
        if (!clip) {
          return null;
        }
        clip.endSlot = skel.slots[endSlotIndex];
        clip.worldVerticesLength = vertexCount << 1;
        clip.vertices = vertices.vertices!;
        clip.bones = vertices.bones;
        if (nonessential) {
          spine.Color.rgba8888ToColor(clip.color, color);
        }
        return clip;
      }
    }
    return null;
  }

  private readVertices(
    input: BinaryInput,
    scale: number,
    vertexCount: number
  ): Vertices {
    const verticesLength = vertexCount << 1;
    if (!input.readBoolean()) {
      const vertices = this.readFloatArray(input, verticesLength, scale);
      return { vertices, bones: null };
    }
    const weights: number[] = [];
    const bonesArray: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const boneCount = input.readInt(true);
      bonesArray.push(boneCount);
      for (let ii = 0; ii < boneCount; ii++) {
        bonesArray.push(input.readInt(true));
        weights.push(input.readFloat() * scale);
        weights.push(input.readFloat() * scale);
        weights.push(input.readFloat());
      }
    }
    const vertices = spine.Utils.toFloatArray(weights);
    const bones = bonesArray;
    return { vertices, bones };
  }

  private readFloatArray(
    input: BinaryInput,
    n: number,
    scale: number
  ): number[] {
    const array = [];
    for (let i = 0; i < n; i++) {
      array.push(input.readFloat() * scale);
    }
    return array;
  }

  private readShortArray(input: BinaryInput): number[] {
    const n = input.readInt(true);
    const array = [];
    for (let i = 0; i < n; i++) {
      array.push(input.readShort());
    }
    return array;
  }

  private assignLinkedMeshes(
    skel: spine.SkeletonData,
    linkedMeshes: LinkedMesh[]
  ): LinkedMesh[] {
    for (let i = 0, n = linkedMeshes.length; i < n; i++) {
      const linkedMesh = linkedMeshes[i];
      const skin = !linkedMesh.skin
        ? skel.defaultSkin
        : skel.findSkin(linkedMesh.skin);
      if (!skin) {
        throw new Error("Not skin found for linked mesh.");
      }
      if (!linkedMesh.parent) {
        throw new Error("Linked mesh parent must not be null");
      }
      const parent = skin.getAttachment(
        linkedMesh.slotIndex,
        linkedMesh.parent
      );
      if (!parent) {
        throw new Error(`Parent mesh not found: ${linkedMesh.parent}`);
      }
      linkedMesh.mesh.setParentMesh(parent as spine.MeshAttachment);
      linkedMesh.mesh.updateUVs();
    }
    return [];
  }

  private readEvents(input: BinaryInput): spine.EventData[] {
    const events = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const eventName = input.readString();
      if (!eventName) {
        throw new Error("No EventName");
      }
      const data = new spine.EventData(eventName);
      data.intValue = input.readInt(false);
      data.floatValue = input.readFloat();
      data.stringValue = input.readString();
      events.push(data);
    }
    return events;
  }

  private readAnimations(
    input: BinaryInput,
    skel: spine.SkeletonData,
    scale: number
  ): spine.Animation[] {
    const animations = [];
    for (let i = 0, n = input.readInt(true); i < n; i++) {
      animations.push(this.readAnimation(input, skel, scale));
    }
    return animations;
  }

  private readAnimation(
    input: BinaryInput,
    skel: spine.SkeletonData,
    scale: number
  ): spine.Animation {
    const name = input.readString();
    if (!name) {
      throw new Error("Animatio name must not be null.");
    }

    const timelines: spine.Timeline[] = [];
    let duration = 0;
    const tempColor1 = new spine.Color();
    const tempColor2 = new spine.Color();

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const slotIndex = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        const timelineType = input.readByte();
        const frameCount = input.readInt(true);
        switch (timelineType) {
          case SLOT_ATTACHMENT: {
            const timeline = new spine.AttachmentTimeline(frameCount);
            timeline.slotIndex = slotIndex;
            for (let frame = 0; frame < frameCount; frame++) {
              timeline.setFrame(frame, input.readFloat(), input.readString());
            }
            timelines.push(timeline);
            duration = Math.max(duration, timeline.frames[frameCount - 1]);
            break;
          }
          case SLOT_COLOR: {
            const timeline = new spine.ColorTimeline(frameCount);
            timeline.slotIndex = slotIndex;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = input.readFloat();
              spine.Color.rgba8888ToColor(tempColor1, input.readInt32());
              timeline.setFrame(
                frameIndex,
                time,
                tempColor1.r,
                tempColor1.g,
                tempColor1.b,
                tempColor1.a
              );
              if (frameIndex < frameCount - 1) {
                this.readCurve(input, frameIndex, timeline);
              }
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[(frameCount - 1) * spine.ColorTimeline.ENTRIES]
            );
            break;
          }
          case SLOT_TWO_COLOR: {
            const timeline = new spine.TwoColorTimeline(frameCount);
            timeline.slotIndex = slotIndex;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = input.readFloat();
              spine.Color.rgba8888ToColor(tempColor1, input.readInt32());
              spine.Color.rgb888ToColor(tempColor2, input.readInt32());
              timeline.setFrame(
                frameIndex,
                time,
                tempColor1.r,
                tempColor1.g,
                tempColor1.b,
                tempColor1.a,
                tempColor2.r,
                tempColor2.g,
                tempColor2.b
              );
              if (frameIndex < frameCount - 1) {
                this.readCurve(input, frameIndex, timeline);
              }
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[(frameCount - 1) * spine.TwoColorTimeline.ENTRIES]
            );
            break;
          }
          default:
            throw new Error("unknown timeline type" + timelineType);
        }
      }
    }

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const boneIndex = input.readInt(true);
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        const type = input.readByte();
        const frameCount = input.readInt(true);
        switch (type) {
          case BONE_ROTATE: {
            const timeline = new spine.RotateTimeline(frameCount);
            timeline.boneIndex = boneIndex;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              timeline.setFrame(
                frameIndex,
                input.readFloat(),
                input.readFloat()
              );
              if (frameIndex < frameCount - 1)
                this.readCurve(input, frameIndex, timeline);
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[(frameCount - 1) * spine.RotateTimeline.ENTRIES]
            );
            break;
          }
          case BONE_TRANSLATE:
          case BONE_SCALE:
          case BONE_SHEAR: {
            let timeline: spine.TranslateTimeline;
            let timelineScale = 1;
            if (type == BONE_SCALE) {
              timeline = new spine.ScaleTimeline(frameCount);
            } else if (type == BONE_SHEAR) {
              timeline = new spine.ShearTimeline(frameCount);
            } else {
              timeline = new spine.TranslateTimeline(frameCount);
              timelineScale = scale;
            }
            timeline.boneIndex = boneIndex;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              timeline.setFrame(
                frameIndex,
                input.readFloat(),
                input.readFloat() * timelineScale,
                input.readFloat() * timelineScale
              );
              if (frameIndex < frameCount - 1) {
                this.readCurve(input, frameIndex, timeline);
              }
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[
                (frameCount - 1) * spine.TranslateTimeline.ENTRIES
              ]
            );
            break;
          }
          default:
            throw new Error("unknown bone type: " + type);
        }
      }
    }

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const index = input.readInt(true);
      const frameCount = input.readInt(true);
      const timeline = new spine.IkConstraintTimeline(frameCount);
      timeline.ikConstraintIndex = index;
      for (let frame = 0; frame < frameCount; frame++) {
        const time = input.readFloat();
        const mix = input.readFloat();
        const blendPositive = input.readByte();
        timeline.setFrame(frame, time, mix, 0, blendPositive, false, false);
        if (frame < frameCount - 1) {
          this.readCurve(input, frame, timeline);
        }
      }
      timelines.push(timeline);
      duration = Math.max(
        duration,
        timeline.frames[(frameCount - 1) * spine.IkConstraintTimeline.ENTRIES]
      );
    }

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const index = input.readInt(true);
      const frameCount = input.readInt(true);
      const timeline = new spine.TransformConstraintTimeline(frameCount);
      timeline.transformConstraintIndex = index;
      for (let frame = 0; frame < frameCount; frame++) {
        const time = input.readFloat();
        const mixRotate = input.readFloat();
        const mix = input.readFloat();
        const mixScale = input.readFloat();
        const mixShear = input.readFloat();
        timeline.setFrame(frame, time, mixRotate, mix, mixScale, mixShear);
        if (frame < frameCount - 1) {
          this.readCurve(input, frame, timeline);
        }
      }
      timelines.push(timeline);
      duration = Math.max(
        duration,
        timeline.frames[
          (frameCount - 1) * spine.PathConstraintPositionTimeline.ENTRIES
        ]
      );
    }

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const index = input.readInt(true);
      const data = skel.pathConstraints[index];
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        const timelineType = input.readByte();
        const frameCount = input.readInt(true);
        switch (timelineType) {
          case PATH_POSITION:
          case PATH_SPACING: {
            let timeline: spine.PathConstraintPositionTimeline;
            let timelineScale = 1;
            if (timelineType == PATH_SPACING) {
              timeline = new spine.PathConstraintSpacingTimeline(frameCount);
              if (
                data.spacingMode == spine.SpacingMode.Length ||
                data.spacingMode == spine.SpacingMode.Fixed
              )
                timelineScale = scale;
            } else {
              timeline = new spine.PathConstraintPositionTimeline(frameCount);
              if (data.positionMode == spine.PositionMode.Fixed) {
                timelineScale = scale;
              }
            }
            timeline.pathConstraintIndex = index;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              timeline.setFrame(
                frameIndex,
                input.readFloat(),
                input.readFloat() * timelineScale
              );
              if (frameIndex < frameCount - 1) {
                this.readCurve(input, frameIndex, timeline);
              }
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[
                (frameCount - 1) * spine.PathConstraintPositionTimeline.ENTRIES
              ]
            );
            break;
          }
          case PATH_MIX: {
            const timeline = new spine.PathConstraintMixTimeline(frameCount);
            timeline.pathConstraintIndex = index;
            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
              const time = input.readFloat();
              const rotateMix = input.readFloat();
              const mix = input.readFloat();
              timeline.setFrame(frameIndex, time, rotateMix, mix);
              if (frameIndex < frameCount - 1) {
                this.readCurve(input, frameIndex, timeline);
              }
            }
            timelines.push(timeline);
            duration = Math.max(
              duration,
              timeline.frames[
                (frameCount - 1) * spine.PathConstraintMixTimeline.ENTRIES
              ]
            );
            break;
          }
        }
      }
    }

    for (let i = 0, n = input.readInt(true); i < n; i++) {
      const skin = skel.skins[input.readInt(true)];
      for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
        const slotIndex = input.readInt(true);
        for (let iii = 0, nnn = input.readInt(true); iii < nnn; iii++) {
          const attachmentName = input.readString();
          if (!attachmentName) {
            throw new Error("attachmentName must not be null.");
          }
          const attachment = skin.getAttachment(slotIndex, attachmentName);
          const vertexAttachment = attachment as spine.VertexAttachment;
          const weighted = vertexAttachment.bones != null;
          const vertices = vertexAttachment.vertices;
          const deformLength = weighted
            ? (vertices.length / 3) * 2
            : vertices.length;

          const frameCount = input.readInt(true);
          const timeline = new spine.DeformTimeline(frameCount);
          timeline.slotIndex = slotIndex;
          timeline.attachment = vertexAttachment;

          for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const time = input.readFloat();
            let deform: spine.ArrayLike<number>;
            let end = input.readInt(true);
            if (end == 0) {
              deform = weighted
                ? spine.Utils.newFloatArray(deformLength)
                : vertices;
            } else {
              deform = spine.Utils.newFloatArray(deformLength);
              const start = input.readInt(true);
              end += start;
              if (scale == 1) {
                for (let v = start; v < end; v++) deform[v] = input.readFloat();
              } else {
                for (let v = start; v < end; v++)
                  deform[v] = input.readFloat() * scale;
              }
              if (!weighted) {
                for (let v = 0, vn = deform.length; v < vn; v++)
                  deform[v] += vertices[v];
              }
            }

            timeline.setFrame(frameIndex, time, deform);
            if (frameIndex < frameCount - 1)
              this.readCurve(input, frameIndex, timeline);
          }
          timelines.push(timeline);
          duration = Math.max(duration, timeline.frames[frameCount - 1]);
        }
      }
    }

    const drawOrderCount = input.readInt(true);
    if (drawOrderCount > 0) {
      const timeline = new spine.DrawOrderTimeline(drawOrderCount);
      const slotCount = skel.slots.length;
      for (let i = 0; i < drawOrderCount; i++) {
        const time = input.readFloat();
        const offsetCount = input.readInt(true);
        const drawOrder = spine.Utils.newArray(slotCount, 0);
        for (let ii = slotCount - 1; ii >= 0; ii--) {
          drawOrder[ii] = -1;
        }
        const unchanged = spine.Utils.newArray(slotCount - offsetCount, 0);
        let originalIndex = 0;
        let unchangedIndex = 0;
        for (let ii = 0; ii < offsetCount; ii++) {
          const slotIndex = input.readInt(true);
          // Collect unchanged items.
          while (originalIndex != slotIndex) {
            unchanged[unchangedIndex++] = originalIndex++;
          }
          // Set changed items.
          drawOrder[originalIndex + input.readInt(true)] = originalIndex++;
        }
        // Collect remaining unchanged items.
        while (originalIndex < slotCount) {
          unchanged[unchangedIndex++] = originalIndex++;
        }
        // Fill in unchanged items.
        for (let ii = slotCount - 1; ii >= 0; ii--) {
          if (drawOrder[ii] == -1) {
            drawOrder[ii] = unchanged[--unchangedIndex];
          }
        }
        timeline.setFrame(i, time, drawOrder);
      }
      timelines.push(timeline);
      duration = Math.max(duration, timeline.frames[drawOrderCount - 1]);
    }

    const eventCount = input.readInt(true);
    if (eventCount > 0) {
      const timeline = new spine.EventTimeline(eventCount);
      for (let i = 0; i < eventCount; i++) {
        const time = input.readFloat();
        const eventData = skel.events[input.readInt(true)];
        const event = new spine.Event(time, eventData);
        event.intValue = input.readInt(false);
        event.floatValue = input.readFloat();
        event.stringValue = input.readBoolean()
          ? input.readString()
          : eventData.stringValue;
        timeline.setFrame(i, event);
      }
      timelines.push(timeline);
      duration = Math.max(duration, timeline.frames[eventCount - 1]);
    }

    return new spine.Animation(name, timelines, duration);
  }

  private readCurve(
    input: BinaryInput,
    frameIndex: number,
    timeline: spine.CurveTimeline
  ): void {
    const v = input.readByte();
    switch (v) {
      case CURVE_LINEAR:
        break;
      case CURVE_STEPPED:
        timeline.setStepped(frameIndex);
        break;
      case CURVE_BEZIER:
        timeline.setCurve(
          frameIndex,
          input.readFloat(),
          input.readFloat(),
          input.readFloat(),
          input.readFloat()
        );
        break;
      default:
        throw new Error("unknown curve type: " + v);
    }
  }
}

type Vertices = {
  bones: number[] | null;
  vertices: number[] | Float32Array;
};

type LinkedMesh = {
  parent: string | null;
  skin: string | null;
  slotIndex: number;
  mesh: spine.MeshAttachment;
  inheritTimeline: boolean;
};

const BONE_ROTATE = 0;
const BONE_TRANSLATE = 1;
const BONE_SCALE = 2;
const BONE_SHEAR = 3;

const SLOT_ATTACHMENT = 0;
const SLOT_COLOR = 1;
const SLOT_TWO_COLOR = 2;

const PATH_POSITION = 0;
const PATH_SPACING = 1;
const PATH_MIX = 2;

const CURVE_LINEAR = 0;
const CURVE_STEPPED = 1;
const CURVE_BEZIER = 2;
