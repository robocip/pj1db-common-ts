/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const CAMERA_FOV = 50;
const WIREFRAME_COLOR = 0x004444;
const SOLID_COLOR = 0x002222;
const WIREFRAME_SELECTED_COLOR = 0x444444;
const SOLID_SELECTED_COLOR = 0x222222;

const CONTROL_POINT_COLOR = 0xffffff;
const CONTROL_LINE_COLOR = 0xffff00;
const CONTROL_PRIMARY_DIRECTION_COLOR = 0x00ffff;
const CONTROL_SECONDARY_DIRECTION_COLOR = 0xff00ff;
const raycaster = new THREE.Raycaster();

const vecDict: Dict<THREE.Vector3> = {
  xyz: new THREE.Vector3(
    Math.sqrt(1.0 / 3),
    Math.sqrt(1.0 / 3),
    Math.sqrt(1.0 / 3)
  ),
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
  "-x": new THREE.Vector3(-1, 0, 0),
  "-y": new THREE.Vector3(0, -1, 0),
  "-z": new THREE.Vector3(0, 0, -1),
};

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export type LookAtType =
  | "origin"
  | "modelCenter"
  | "selectedObjectCenter"
  | "controlPoint";

export type MaterialType = "wireframe" | "original" | "solid";

export type ViewpointType = "xyz" | "x" | "y" | "z" | "-x" | "-y" | "-z";

export type ConstraintType = {
  key: "x" | "y" | "z";
  min: number;
  max: number;
};

export interface Dict<T> {
  [index: string]: T;
}

const materialDict = {
  wireframe: new THREE.MeshStandardMaterial({
    color: WIREFRAME_COLOR,
    wireframe: true,
  }),
  solid: new THREE.MeshStandardMaterial({
    color: SOLID_COLOR,
  }),
};

class BoundingBox {
  minPos: THREE.Vector3;

  maxPos: THREE.Vector3;

  centerPos: THREE.Vector3;

  direction: THREE.Vector3; // centerPosを始点、maxPosを終点とするベクトル

  constructor(minPos: THREE.Vector3, maxPos: THREE.Vector3) {
    this.minPos = minPos;
    this.maxPos = maxPos;
    this.centerPos = minPos.clone().lerp(maxPos, 0.5);
    this.direction = maxPos.clone().sub(this.centerPos);
  }

  static fromSizeCenter(size: XYZ, center: XYZ): BoundingBox {
    const direction = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    const centerPos = new THREE.Vector3(center.x, center.y, center.z);
    const minPos = centerPos.clone().sub(direction);
    const maxPos = centerPos.clone().add(direction);
    return new BoundingBox(minPos, maxPos);
  }

  static fromMeshList(meshList: THREE.Mesh[]): BoundingBox {
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let minZ = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    let maxZ = -Number.MAX_VALUE;
    meshList.forEach((mesh) => {
      const bbox = mesh.geometry.boundingBox;
      if (bbox) {
        const posA = mesh.localToWorld(bbox.min);
        const posB = mesh.localToWorld(bbox.max);
        minX = Math.min(minX, posA.x, posB.x);
        minY = Math.min(minY, posA.y, posB.y);
        minZ = Math.min(minZ, posA.z, posB.z);
        maxX = Math.max(maxX, posA.x, posB.x);
        maxY = Math.max(maxY, posA.y, posB.y);
        maxZ = Math.max(maxZ, posA.z, posB.z);
      } else {
        throw new Error("mesh has no bbox");
      }
    });
    return new BoundingBox(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    );
  }
}

class LoadedModel {
  scene: THREE.Group;

  bbox: BoundingBox; // ロードしたモデルの１番目のメッシュのバウンディングボックス

  controlPoint: THREE.Mesh;

  controlPointRim: THREE.Mesh;

  controlLineZ: THREE.Mesh;
  
  controlPrimaryDirection: THREE.Mesh;

  controlSecondaryDirection: THREE.Mesh;

  loadedMeshList: THREE.Mesh[];

  loadedOriginalMaterial: THREE.Material[];

  constructor(gltf: GLTF) {
    console.log("LoadedModel construct");
    this.scene = gltf.scene;
    this.loadedMeshList = LoadedModel._findAllMeshes(gltf.scene);
    this.loadedOriginalMaterial = this.loadedMeshList.map((mesh: THREE.Mesh) =>
      mesh.material instanceof THREE.Material ? mesh.material : mesh.material[0]
    );
    console.log("-------------------------------");
    if (this.loadedMeshList.length === 0) {
      throw Error("no mesh");
    }
    // correct boundingbox is available after render()
    this.bbox = BoundingBox.fromMeshList(this.loadedMeshList);
    [this.controlPoint, this.controlPointRim] = this._createControlPoint();
    this.controlLineZ = this._createControlLineZ();
    this.controlPrimaryDirection = this._createControlPrimaryDirection();
    this.controlSecondaryDirection = this._createControlSecondaryDirection();
    this.loadedMeshList.forEach((mesh) => {
      // it is needed for Raycast to calc intersection of mesh
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    });
  }

  get maxXY() {
    return Math.max(
      Math.abs(this.bbox.minPos.x),
      Math.abs(this.bbox.minPos.y),
      Math.abs(this.bbox.maxPos.x),
      Math.abs(this.bbox.maxPos.y)
    );
  }

  _createControlPoint() {
    const centerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        this.bbox ? this.bbox.direction.length() / 30 : 1
      ),
      new THREE.MeshBasicMaterial({
        color: CONTROL_POINT_COLOR,
      })
    );
    centerMesh.position.set(
      this.bbox.centerPos.x,
      this.bbox.centerPos.y,
      this.bbox.centerPos.z
    );
    centerMesh.name="controlPointCenter"

    const rimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial({
        color: CONTROL_POINT_COLOR,
        transparent: true,
        opacity: 0.2,
      })
    );
    rimMesh.position.set(
      this.bbox.centerPos.x,
      this.bbox.centerPos.y,
      this.bbox.centerPos.z
    );
    rimMesh.scale.set(0, 0, 0);
    rimMesh.name="controlPointRim"

    return [centerMesh, rimMesh];
  }

  _createControlLineZ() {
    const radius = this.bbox ? this.bbox.direction.length() / 60 : 1;
    const length = this.bbox.direction.z * 2;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 32, 1, false),
      new THREE.MeshBasicMaterial({
        color: CONTROL_LINE_COLOR,
        transparent: true,
        opacity: 0.5,
      })
    );
    mesh.name="controlLineZ"
    mesh.rotation.set(Math.PI / 2, 0, 0);
    mesh.position.x = this.bbox.centerPos.x;
    mesh.position.y = this.bbox.centerPos.y;
    mesh.position.z = this.bbox.centerPos.z;
    return mesh;
  }
  
  _createControlPrimaryDirection() {
    // 初期値はz軸
    return this._createControlDirection(CONTROL_PRIMARY_DIRECTION_COLOR, "z");
  }

  _createControlSecondaryDirection() {
    // 初期値はx軸
    return this._createControlDirection(CONTROL_SECONDARY_DIRECTION_COLOR, "x");
  }

  _createControlDirection(
    color: THREE.ColorRepresentation,
    axis: "x" | "y" | "z"
  ) {
    const radius = this.bbox ? this.bbox.direction.length() / 60 : 1;
    const length = this.bbox.direction.length();
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    });
    const arrowLength = length * 0.5;
    const arrowRodLength = arrowLength / 2;
    const arrowCornLength = arrowLength / 2;

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, arrowRodLength, 32, 1, false),
      material
    );

    if (axis === "x") {
      mesh.rotation.set(0, 0, -Math.PI / 2);
      mesh.position.x = this.bbox.centerPos.x + length + arrowRodLength / 2;
      mesh.position.y = this.bbox.centerPos.y;
      mesh.position.z = this.bbox.centerPos.z;
    } else if (axis === "y") {
      mesh.position.x = this.bbox.centerPos.x;
      mesh.position.y = this.bbox.centerPos.y + length + arrowRodLength / 2;
      mesh.position.z = this.bbox.centerPos.z;
    } else if (axis === "z") {
      mesh.rotation.set(Math.PI / 2, 0, 0);
      mesh.position.x = this.bbox.centerPos.x;
      mesh.position.y = this.bbox.centerPos.y;
      mesh.position.z = this.bbox.centerPos.z + length + arrowRodLength / 2;
    }
    const childMesh = new THREE.Mesh(
      new THREE.ConeGeometry(arrowCornLength / 2, arrowCornLength, 32),
      material
    );
    childMesh.position.y = arrowRodLength / 2 + arrowCornLength / 2;
    mesh.add(childMesh);

    return mesh;
  }

  _applyMaterial(materialType: MaterialType) {
    if (materialType === "original") {
      this.loadedMeshList.forEach((mesh: THREE.Mesh, index) => {
        mesh.material = this.loadedOriginalMaterial[index].clone();
      });
    } else if (materialType === "wireframe") {
      this.loadedMeshList.forEach((mesh: THREE.Mesh) => {
        mesh.material = materialDict.wireframe.clone();
      });
    } else if (materialType === "solid") {
      this.loadedMeshList.forEach((mesh: THREE.Mesh) => {
        mesh.material = materialDict.solid.clone();
      });
    }
  }

  static _findAllMeshes(target: THREE.Object3D): THREE.Mesh[] {
    const meshList: THREE.Mesh[] = [];
    target.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.isMesh) {
        meshList.push(obj as THREE.Mesh);
      }
    });
    return meshList;
  }

  adjustCamera(
    camera: THREE.Camera,
    lookAtPosition: THREE.Vector3,
    viewpointType: ViewpointType = "xyz"
  ) {
    // カメラは、モノをx,y,z軸値が大の側から見る位置に置く。
    const maxDirection = Math.max(
      this.bbox.direction.x,
      this.bbox.direction.y,
      this.bbox.direction.z
    );
    const scale = 2.0;
    const centerToCameraRatio =
      camera instanceof THREE.OrthographicCamera
        ? 1.0
        : 1.0 + scale / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

    camera.position.set(
      lookAtPosition.x +
        centerToCameraRatio * maxDirection * vecDict[viewpointType].x,
      lookAtPosition.y +
        centerToCameraRatio * maxDirection * vecDict[viewpointType].y,
      lookAtPosition.z +
        centerToCameraRatio * maxDirection * vecDict[viewpointType].z
    );

    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 0.5 / maxDirection;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(lookAtPosition);
  }
}

//------------------------------------------------------------------------

export type OptionsView3D = Partial<Options>;
type Options = {
  autoRotate: boolean;
  displayAxes: boolean;
  displayGrid: boolean;
  displayControlPoint: boolean;
  displayControlLineZ: boolean;
  displayControlPrimaryDirection: boolean;
  displayControlSecondaryDirection: boolean;
  useOrthoCamera: boolean;
  lookAtType: LookAtType;
  materialType: MaterialType;
  gridUnitSize: number;
  gridLimit: number;
  supressHoverWhenDragging: boolean;
  keepSelectionWhenClickBlank: boolean;
  objectSelectable: boolean;
  exceptObjectSelection: string[];
};

export type Callbacks = {
  onOrbitChange?: (position: number[], zoom: number | undefined) => void;
  onObjectSelected?: (object: THREE.Object3D | undefined) => void;
  onObjectHover?: (objectList: THREE.Object3D[]) => void;
  onControlPointMove?: (x: number, y: number, z: number) => void;
  onControlLineZMove?: (x: number, y: number) => void;
};

const DEFAULT_OPTION: Options = {
  autoRotate: false,
  displayAxes: true,
  displayGrid: true,
  displayControlPoint: false,
  displayControlLineZ: false,
  displayControlPrimaryDirection: false,
  displayControlSecondaryDirection: false,
  useOrthoCamera: false,
  lookAtType: "modelCenter",
  materialType: "original",
  gridUnitSize: 0.01,
  gridLimit: 1,
  supressHoverWhenDragging: true,
  keepSelectionWhenClickBlank: false,
  objectSelectable: true,
  exceptObjectSelection: [],
};

type ThreeControls = {
  // cameraの生成時に合わせて生成するもの
  camera: THREE.Camera;
  cameraLight: THREE.Light;
  orbit: OrbitControls;
  drag: DragControls;
};

export default class ThreeControl {
  parentDomId: string;

  renderer: THREE.WebGLRenderer;

  scene: THREE.Scene;

  sceneOverlay: THREE.Scene;

  axesHelper: THREE.AxesHelper | null = null;

  gridHelper: THREE.GridHelper | null = null;

  pointer = new THREE.Vector2();

  callbacks: Callbacks;

  dragging = false;

  listener: {
    onPointerMove: (event: PointerEvent) => void;
    onMouseDown: (event: MouseEvent) => void;
    onMouseUp: (event: MouseEvent) => void;
    onDragStart: (e: THREE.Event) => void;
    onDrag: (e: THREE.Event) => void;
    onDragEnd: (e: THREE.Event) => void;
    onOrbitChange?: (e: THREE.Event) => void;
  };

  controls: ThreeControls;

  objects: {
    dragConstraint: Dict<ConstraintType[]>;
    dragInterlock: Dict<THREE.Object3D[]>;
    loadedModels: LoadedModel[];
    meshes: THREE.Mesh[];
    draggableObjects: THREE.Object3D[];
    selectableObjects: THREE.Object3D[];
    selectedObject: THREE.Object3D | undefined;
  } = {
    dragConstraint: {},
    dragInterlock: {},
    loadedModels: [],
    meshes: [],
    draggableObjects: [],
    selectableObjects: [],
    selectedObject: undefined,
  };

  options: Options = DEFAULT_OPTION;

  constructor(
    renderAreaSize: number,
    parentDomId: string,
    options: OptionsView3D = {},
    callbacks: Callbacks = {}
  ) {
    console.log("ThreeControl given options:");
    console.log(options);
    this.options = { ...DEFAULT_OPTION, ...options };
    console.log("ThreeControl calculated options:");
    console.log(this.options);
    this.parentDomId = parentDomId;
    this.callbacks = callbacks;

    this.listener = {
      onPointerMove: (event: PointerEvent) => {
        const b = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - b.left) / renderAreaSize) * 2 - 1;
        this.pointer.y = -((event.clientY - b.top) / renderAreaSize) * 2 + 1;
      },
      onMouseDown: (event: MouseEvent) => {
        this.dragging = true;
        if (Math.abs(this.pointer.x) >= 1 || Math.abs(this.pointer.y) >= 1)
          return;
        const objectList = this._getObjectListAtMouseCursol();
        if (objectList.length > 0) {
          this.objects.selectedObject = objectList[0];
          console.log(
            "ThreeControl object selected",
            this.objects.selectedObject
          );
        } else {
          if (this.options.keepSelectionWhenClickBlank) return;
          this.objects.selectedObject = undefined;
        }
        if (this.options.lookAtType === "selectedObjectCenter") {
          this.controls.orbit.target = this.lookAtPosition;
          this._render();
        }
        if (callbacks.onObjectSelected) {
          callbacks.onObjectSelected(this.objects.selectedObject);
        }
      },
      onMouseUp: (event: MouseEvent) => {
        this.dragging = false;
      },
      onDragStart: (event: THREE.Event) => {
        this.controls.orbit.enabled = false;
        const obj: THREE.Object3D = event.object as THREE.Object3D;
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial &&
          obj.material.emissive
        ) {
          obj.material.emissive.set(0xaaaaaa);
        }

        if (obj.id === this.objects.loadedModels[0].controlPoint.id) {
          if (this.options.lookAtType === "controlPoint")
            this.controls.orbit.target = obj.position.clone();
        }
      },
      onDrag: (event: THREE.Event) => {
        const obj = event.object as THREE.Object3D;
        const constraint = this.objects.dragConstraint[obj.id.toString()];
        if (constraint) {
          constraint.forEach((c) => {
            obj.position[c.key] = Math.min(
              Math.max(obj.position[c.key], c.min),
              c.max
            );
          });
        }
        const interlockObjList = this.objects.dragInterlock[obj.id.toString()];
        if (interlockObjList) {
          interlockObjList.forEach((obj2: THREE.Object3D) => {
            obj2.position.set(obj.position.x, obj.position.y, obj.position.z);
          });
        }

        if (obj.id === this.objects.loadedModels[0].controlPoint.id) {
          if (callbacks.onControlPointMove)
            callbacks.onControlPointMove(
              obj.position.x,
              obj.position.y,
              obj.position.z
            );
        }
        if (obj.id === this.objects.loadedModels[0].controlLineZ.id) {
          if (callbacks.onControlLineZMove)
            callbacks.onControlLineZMove(obj.position.x, obj.position.y);
        }
      },
      onDragEnd: (event: THREE.Event) => {
        const obj = event.object as THREE.Object3D;
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial &&
          obj.material.emissive
        ) {
          obj.material.emissive.set(0x000000);
        }
        if (
          obj.id === this.objects.loadedModels[0].controlPoint.id &&
          this.options.lookAtType === "controlPoint"
        ) {
          this.controls.orbit.target = this.lookAtPosition;
        }
        this.controls.orbit.enabled = true;
      },
      onOrbitChange: !callbacks.onOrbitChange
        ? undefined
        : (event: any) => {
            if (callbacks.onOrbitChange) {
              callbacks.onOrbitChange(
                this.controls.camera.position.toArray(),
                this.controls.camera instanceof THREE.OrthographicCamera
                  ? this.controls.camera.zoom
                  : undefined
              );
            }
          },
    };
    window.addEventListener("pointermove", this.listener.onPointerMove);
    window.addEventListener("mousedown", this.listener.onMouseDown);
    window.addEventListener("mouseup", this.listener.onMouseUp);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(renderAreaSize, renderAreaSize);

    const parent = document.getElementById(parentDomId);
    if (parent) {
      parent.appendChild(this.renderer.domElement);
    } else {
      throw new Error(`parent DOM id not found: ${parentDomId}`);
    }

    console.log("ThreeControl create view3D");
    this.scene = new THREE.Scene();
    this.sceneOverlay = new THREE.Scene();

    this._setAxesAndGrid();
    this.controls = this._createCameraAndControls();
    this.scene.add(new THREE.AmbientLight(0x222222, 10));
    this.sceneOverlay.add(new THREE.AmbientLight(0x222222));
  }

  disposeDragControl(){
    if (this.controls) {
      const drag = this.controls.drag;
      drag.removeEventListener("dragstart", this.listener.onDragStart);
      drag.removeEventListener("drag", this.listener.onDrag);
      drag.removeEventListener("dragend", this.listener.onDragEnd);
      drag.dispose();
    }
  }

  disposeOrbitControl(){
    if (this.controls) {
      const orbit = this.controls.orbit;
      if (this.listener.onOrbitChange) {
        orbit.removeEventListener("change", this.listener.onOrbitChange);
      }
      orbit.dispose();
    }
  }

  dispose() {
    window.removeEventListener("pointermove", this.listener.onPointerMove);
    window.removeEventListener("mousedown", this.listener.onMouseDown);
    window.removeEventListener("mouseup", this.listener.onMouseUp);
    this.disposeDragControl()
    this.disposeOrbitControl()

    const elem = document.getElementById(this.parentDomId);
    if (elem && this.renderer.domElement.parentElement === elem)
      elem.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    // this.renderer.forceContextLoss();
    console.log("remove view3D");
  }

  getUnmountFunc() {
    return () => {
      this.dispose();
    };
  }

  unloadModels() {
    this.objects.loadedModels.forEach((model) => {
      model.scene.removeFromParent();
      if (this.options.displayControlPoint) {
        model.controlPoint.removeFromParent();
        model.controlPointRim.removeFromParent();
      }
      if (this.options.displayControlLineZ) {
        model.controlLineZ.removeFromParent();
      }
      if (this.options.displayControlPrimaryDirection) {
        model.controlPrimaryDirection.removeFromParent();
      }
      if (this.options.displayControlSecondaryDirection) {
        model.controlSecondaryDirection.removeFromParent();
      }
    });
    this.objects = {
      dragConstraint: {},
      dragInterlock: {},
      loadedModels: [],
      meshes: [],
      draggableObjects: [],
      selectableObjects: [],
      selectedObject: undefined,
    };
  }

  loadModel(file_name: string, onLoad?: () => void) {
    this._update();
    const loader = new GLTFLoader();
    loader.load(
      file_name,
      (gltf: GLTF) => {
        console.log("ThreeControl gltf comes with:");
        this._traceObjectTree(gltf.scene);
        this.scene.add(gltf.scene);
        console.log("ThreeControl scene changed:");
        this._traceObjectTree();
        this._render(); // pre-rendering for calculating boundingbox
        const model = new LoadedModel(gltf);
        model._applyMaterial(this.options.materialType);
        if (this.options.displayControlPoint) {
          this.sceneOverlay.add(model.controlPoint);
          this.sceneOverlay.add(model.controlPointRim);
          this.objects.dragInterlock[model.controlPoint.id.toString()] = [
            model.controlPointRim,
          ];
          this.objects.draggableObjects.push(model.controlPoint);
          this.objects.dragConstraint[model.controlPoint.id.toString()] = [
            {
              key: "x",
              min: model.bbox.minPos.x,
              max: model.bbox.maxPos.x,
            },
            {
              key: "y",
              min: model.bbox.minPos.y,
              max: model.bbox.maxPos.y,
            },
            {
              key: "z",
              min: model.bbox.minPos.z,
              max: model.bbox.maxPos.z,
            },
          ];
        }
        if (this.options.displayControlLineZ) {
          this.sceneOverlay.add(model.controlLineZ);
          this.objects.draggableObjects.push(model.controlLineZ);
          this.objects.dragConstraint[model.controlLineZ.id.toString()] = [
            {
              key: "x",
              min: model.bbox.minPos.x,
              max: model.bbox.maxPos.x,
            },
            {
              key: "y",
              min: model.bbox.minPos.y,
              max: model.bbox.maxPos.y,
            },
            {
              key: "z",
              min: model.bbox.centerPos.z,
              max: model.bbox.centerPos.z,
            },
          ];
        }
        if (this.options.displayControlPrimaryDirection) {
          this.sceneOverlay.add(model.controlPrimaryDirection);
        }
        if (this.options.displayControlSecondaryDirection) {
          this.sceneOverlay.add(model.controlSecondaryDirection);
        }

        const drag = this._createDragControl(this.controls.camera, this.controls.drag);
        this.resetDragControl(drag) // needed for reflecting this.objects.draggableObjects

        this.objects.loadedModels.push(model);
        if(this.options.objectSelectable){
          const filtered=model.loadedMeshList.filter(
            (mesh)=>!this.options.exceptObjectSelection.includes(mesh.name)
          )
          this.objects.selectableObjects.push(...filtered);
        }
        model.adjustCamera(this.controls.camera, this.lookAtPosition);
        this.controls.orbit.target = this.lookAtPosition;
        this.setGridLimit(model.maxXY);

        if (onLoad) onLoad();

        this._render(); // rendering after moving camera
      },
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error: ErrorEvent) => {
        console.log(error);
        this._render();
      }
    );
  }

  get lookAtPosition(): THREE.Vector3 {
    // 現在のカメラの注視点：controlPointと等しい場合、原点と等しい場合、物体の中心と等しい場合の３パターンがある
    const { lookAtType } = this.options;
    const origin = new THREE.Vector3(0, 0, 0);
    const modelCenter = this.objects.loadedModels[0]
      ? this.objects.loadedModels[0].bbox.centerPos
      : origin;

    if (lookAtType === "origin") {
      return origin;
    }
    if (lookAtType === "modelCenter") {
      return modelCenter;
    }
    if (lookAtType === "selectedObjectCenter") {
      console.log(this.objects.selectedObject);
      const obj = this.objects.selectedObject;
      if (!obj) {
        return modelCenter;
      }
      if (
        obj instanceof THREE.Mesh &&
        obj.geometry instanceof THREE.BufferGeometry &&
        obj.geometry.boundingBox
      ) {
        const bbox = obj.geometry.boundingBox;
        return obj.localToWorld(
          new THREE.Vector3(
            (bbox.min.x + bbox.max.x) / 2,
            (bbox.min.y + bbox.max.y) / 2,
            (bbox.min.z + bbox.max.z) / 2
          )
        );
      }
      return obj.position;
    }
    if (lookAtType === "controlPoint") {
      return this.objects.loadedModels[0]
        ? this.objects.loadedModels[0].controlPoint.position
        : modelCenter;
    }
    return origin;
  }

  setGridUnitSize(
    gridUnitSize: number // gridの１目盛りの長さを指定
  ) {
    this.options.gridUnitSize = gridUnitSize;
    this._setAxesAndGrid();
  }

  setGridLimit(
    gridLimit: number // gridを表示するエリアの限界を指定
  ) {
    this.options.gridLimit = gridLimit;
    this._setAxesAndGrid();
  }

  setLookAtType(lookAtType: LookAtType) {
    this.options.lookAtType = lookAtType;
    this.controls.orbit.target = this.lookAtPosition;
    this._render();
  }

  setAutoRotate(autoRotate: boolean) {
    this.controls.orbit.autoRotate = autoRotate;
  }

  setMaterialType(materialType: MaterialType) {
    this.options.materialType = materialType;
    this.objects.loadedModels.forEach((model) => {
      model._applyMaterial(materialType);
    });
  }

  setCameraType(useOrthoCamera: boolean) {
    if (useOrthoCamera !== this.options.useOrthoCamera) {
      this.options.useOrthoCamera = useOrthoCamera;
      this.scene.remove(this.controls.camera);
      this.scene.remove(this.controls.cameraLight);
      const controls = this._createCameraAndControls();
      controls.camera.position.set(
        this.controls.camera.position.x,
        this.controls.camera.position.y,
        this.controls.camera.position.z
      );
      const newCamera = controls.camera;
      const oldCamera = this.controls.camera;
      newCamera.lookAt(this.lookAtPosition);
      if (newCamera instanceof THREE.OrthographicCamera) {
        const d = oldCamera.position.distanceTo(this.lookAtPosition);
        newCamera.zoom =
          0.5 / (d * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180));
        newCamera.updateProjectionMatrix();
      }
      this.resetControls(controls)
      this._render(); // rendering after moving camera
    }
  }

  resetControls(controls:ThreeControls){
    this.disposeDragControl()
    this.disposeOrbitControl()
    this.controls = controls;
  }

  resetDragControl(drag:DragControls){
    this.disposeDragControl()
    this.controls.drag = drag;
  }

  setCameraPosition(viewpointType: ViewpointType) {
    this.objects.loadedModels[0].adjustCamera(
      this.controls.camera,
      this.lookAtPosition,
      viewpointType
    );

    this._render();
  }

  setControlPoint(
    x: number | undefined,
    y: number | undefined,
    z: number | undefined,
    radius?: number
  ) {
    if (!this.objects.loadedModels[0]) return;

    if (
      typeof x === "undefined" ||
      typeof y === "undefined" ||
      typeof z === "undefined"
    ) {
      this.objects.loadedModels[0].controlPoint.visible = false;
      this.objects.loadedModels[0].controlPointRim.visible = false;
    } else {
      this.objects.loadedModels[0].controlPoint.visible = true;
      this.objects.loadedModels[0].controlPointRim.visible = true;
      this.objects.loadedModels[0].controlPoint.position.set(x, y, z);
      this.objects.loadedModels[0].controlPointRim.position.set(x, y, z);
      if (typeof radius !== "undefined")
        this.objects.loadedModels[0].controlPoint.scale.set(
          radius,
          radius,
          radius
        );
    }
  }

  setControlPointRimRadius(
    radius: number
  ) {
    if (!this.objects.loadedModels[0]) return;
    this.objects.loadedModels[0].controlPointRim.scale.set(
      radius,
      radius,
      radius
    );
  }


  setControlLineZ(x: number | undefined, y: number | undefined):void {
    if (!this.objects.loadedModels[0]) return;

    if (typeof x === "undefined" || typeof y === "undefined") {
      this.objects.loadedModels[0].controlLineZ.visible = false;
    } else {
      this.objects.loadedModels[0].controlLineZ.visible = true;
      this.objects.loadedModels[0].controlLineZ.position.x = x;
      this.objects.loadedModels[0].controlLineZ.position.y = y;
    }
  }

  setControlPrimaryDirection(
    theta_rad: number | undefined = undefined,
    phi_rad: number | undefined = undefined
  ) {
    const loadedModel = this.objects.loadedModels[0];
    if (!loadedModel) return;
    ThreeControl._setControlDirection(
      loadedModel.controlPrimaryDirection,
      loadedModel.bbox,
      theta_rad,
      phi_rad
    );
  }

  setControlSecondaryDirection(
    theta_rad: number | undefined = undefined,
    phi_rad: number | undefined = undefined
  ) {
    const loadedModel = this.objects.loadedModels[0];
    if (!loadedModel) return;
    ThreeControl._setControlDirection(
      loadedModel.controlSecondaryDirection,
      loadedModel.bbox,
      theta_rad,
      phi_rad
    );
  }

  static _setControlDirection(
    target: THREE.Mesh,
    bbox: BoundingBox,
    theta_rad: number | undefined,
    phi_rad: number | undefined
  ) {
    if (!target) return;

    if (typeof phi_rad === "undefined" || typeof theta_rad === "undefined") {
      target.visible = false;
    } else {
      target.visible = true;
      target.rotation.set(Math.PI / 2, 0, 0); // 円柱をz軸方向に立ててから
      target.rotateOnAxis(
        new THREE.Vector3(Math.sin(phi_rad), 0, Math.cos(phi_rad)).normalize(),
        -theta_rad
      ); // 円柱を回転する

      const length = bbox.direction.length();
      const arrowLength = length * 0.5;
      const arrowRodLength = arrowLength / 2;
      const ratio = length + arrowRodLength / 2;

      target.position.x =
        bbox.centerPos.x + Math.cos(phi_rad) * Math.sin(theta_rad) * ratio;
      target.position.y =
        bbox.centerPos.y + Math.sin(phi_rad) * Math.sin(theta_rad) * ratio;
      target.position.z = bbox.centerPos.z + Math.cos(theta_rad) * ratio;
    }
  }

  selectObject(objectName: string | undefined) {
    const selectedObject = this.objects.selectableObjects.find(
      (obj) => obj.name === objectName
    );
    this.objects.selectedObject = selectedObject;
  }

  _createOrbitControl(camera: THREE.Camera, oldControl?: OrbitControls):OrbitControls {
    const orbit = new OrbitControls(camera, this.renderer.domElement);
    orbit.autoRotate = this.options.autoRotate;
    orbit.enablePan = false;
    if (this.listener.onOrbitChange) {
      if (oldControl) {
        oldControl.removeEventListener("change", this.listener.onOrbitChange);
      }
      orbit.addEventListener("change", this.listener.onOrbitChange);
    }
    return orbit;
  }

  _createDragControl(camera: THREE.Camera, oldControl?: DragControls):DragControls {
    const drag = new DragControls(
      this.objects.draggableObjects,
      camera,
      this.renderer.domElement
    );
    if (oldControl) {
      oldControl.removeEventListener("dragstart", this.listener.onDragStart);
      oldControl.removeEventListener("drag", this.listener.onDrag);
      oldControl.removeEventListener("dragend", this.listener.onDragEnd);
    }
    drag.addEventListener("dragstart", this.listener.onDragStart);
    drag.addEventListener("drag", this.listener.onDrag);
    drag.addEventListener("dragend", this.listener.onDragEnd);
    return drag;
  }

  _createCameraAndControls():ThreeControls {
    console.log("create camera: useOrthoCamera=", this.options.useOrthoCamera);
    const camera = this.options.useOrthoCamera
      ? new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1000, 1000)
      : new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.001, 1000);

    camera.up.set(0, 0, 1);

    const cameraLight = new THREE.PointLight(0xffffff, 3.0);
    camera.add(cameraLight); // point light moves with camera
    this.scene.add(camera); // required, because we are adding a light as a child of the camera

    const orbit = this._createOrbitControl(camera, this.controls?.orbit);
    const drag = this._createDragControl(camera, this.controls?.drag);

    return {
      camera,
      cameraLight,
      orbit,
      drag,
    };
  }

  _setAxesAndGrid(
    axesScale = 2 // axesの長さをgridLimitの何倍まで描画するかで指定
  ) {
    // グリッドは、x,y座標が下記区間となる範囲に描画
    // 区間：[-ceil(gridLimit/unitSize)*unitSize,ceil(gridLimit/unitSize)*unitSize]
    const gridCount =
      Math.ceil(this.options.gridLimit / this.options.gridUnitSize) * 2;
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
    if (this.options.displayAxes) {
      this.axesHelper = new THREE.AxesHelper(
        this.options.gridLimit * axesScale
      );
      this.scene.add(this.axesHelper);
    }

    if (this.options.displayGrid && this.options.gridUnitSize > 0) {
      this.gridHelper = new THREE.GridHelper(
        this.options.gridUnitSize * gridCount,
        gridCount,
        0xffff00
      );
      this.gridHelper.geometry.rotateX(Math.PI / 2); // 標準だとxz平面にグリッドが描かれるので、xy平面に変換する。
      this.scene.add(this.gridHelper);
      if (this.options.displayAxes) {
        this.gridHelper.position.y = -this.options.gridUnitSize * 0.001; // y=0平面との衝突によるちらつきを避ける。
      }
    }
  }

  _traceObjectTree(target: THREE.Object3D | undefined = undefined, depth = 0) {
    if (!target) target = this.scene;
    console.log(
      `${"-".repeat(depth)}${target.constructor.name}(name=${target.name},id=${
        target.id
      })`
    );
    target?.children.forEach((child: THREE.Object3D) => {
      this._traceObjectTree(child, depth + 1);
    });
    return 1;
  }

  _update() {
    this.controls.orbit.update();
    requestAnimationFrame(this._update.bind(this));
    this._render();
  }

  _getObjectListAtMouseCursol(): THREE.Object3D[] {
    raycaster.setFromCamera(this.pointer, this.controls.camera);
    const intersects = raycaster.intersectObjects(
      this.objects.selectableObjects
    );
    const obejectList = Array.from(
      new Set(intersects.map((i) => i.object)).values()
    );
    return obejectList;
  }

  _render() {
    const obejectList = this._getObjectListAtMouseCursol();
    if (this.callbacks.onObjectHover) {
      if (!this.options.supressHoverWhenDragging || !this.dragging)
        this.callbacks.onObjectHover(obejectList);
    }

    // 選択対象のobject上にmouseがある場合は、obejectList[0]をハイライトする
    this.objects.selectableObjects.forEach((obj: THREE.Object3D) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial &&
        obj.material
      ) {
        if (this.options.materialType === "solid") {
          obj.material.color.set(
            obj === this.objects.selectedObject
              ? SOLID_SELECTED_COLOR
              : SOLID_COLOR
          );
        }
        if (this.options.materialType === "wireframe") {
          obj.material.color.set(
            obj === this.objects.selectedObject
              ? WIREFRAME_SELECTED_COLOR
              : WIREFRAME_COLOR
          );
        }

        obj.material.emissive.set(
          // eslint-disable-next-line no-nested-ternary
          obj === this.objects.selectedObject
            ? 0x666666
            : obejectList[0] === obj &&
              (!this.options.supressHoverWhenDragging || !this.dragging)
            ? 0x333333
            : 0x000000
        );
      }
    });
    this.renderer.autoClear = false;
    this.renderer.clear();
    this.renderer.render(this.scene, this.controls.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.sceneOverlay, this.controls.camera);
  }
}
