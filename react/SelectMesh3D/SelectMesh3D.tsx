import { Flex, RadioGroupField, Radio } from "@aws-amplify/ui-react";
import { useState, useCallback, useEffect } from "react";
import ThreeMeshControl, {
  SelectType,
} from "utils/common/react/SelectMesh3D/SelectMeshUtil";
import AxisIconBox from "utils/common/react/View3D/AxisIconBox";
import { OptionsView3D, LookAtType, MaterialType } from "./SelectMeshUtil";

export type Callbacks = {
  onControlPointMove?: (x: number, y: number, z: number) => void;
  onControlLineZMove?: (x: number, y: number) => void;
  onLoad?: (url: string, control: ThreeMeshControl) => void;
  onObjectSelected?: (object: THREE.Object3D | undefined) => void;
};

export type ThreeMeshState = {
  control: ThreeMeshControl | undefined;
  setControl: React.Dispatch<
    React.SetStateAction<ThreeMeshControl | undefined>
  >;
  loadCount: number;
  setLoadCount: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

type Props = {
  three: ThreeMeshState;
  url: string | undefined;
  showPerspectiveControl?: boolean;
  showLookAtControl?: boolean;
  showGridSizeControl?: boolean;
  showCameraInfoView?: boolean;
  showObjectInfoView?: boolean;
  options?: OptionsView3D;
  padding?: number;
  callbacks?: Callbacks;
  setLoadError?: (loadError: boolean) => void;
};

// note: 非推奨予定
SelectMesh3D.defaultProps = {
  showPerspectiveControl: true,
  showLookAtControl: true,
  showGridSizeControl: false,
  showCameraInfoView: false,
  showObjectInfoView: false,
  options: {},
  padding: 5,
  callbacks: undefined,
  setLoadError: undefined,
};

const VIEW_SIZE = 512;

export const useThreeMesh = () => {
  const [control, setControl] = useState<ThreeMeshControl | undefined>();
  const [loadCount, setLoadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  return {
    control,
    setControl,
    loadCount,
    setLoadCount,
    loading,
    setLoading,
  };
};

export default function SelectMesh3D({
  three,
  url,
  showPerspectiveControl = true,
  showLookAtControl = true,
  showGridSizeControl = false,
  showCameraInfoView = false,
  showObjectInfoView = false,
  options = {},
  padding = 5,
  callbacks = undefined,
  setLoadError = undefined,
}: Props) {
  // console.log("SelectMesh3D render");  // todo:

  const [cameraPos, setCameraPos] = useState<number[]>([0, 0, 0]);
  const [cameraZoom, setCameraZoom] = useState<number | undefined>();
  const [hoverObjectList, setHoverObjectList] = useState<THREE.Object3D[]>([]);
  const [selectedObject, setSelectedObject] = useState<
    THREE.Object3D | undefined
  >(undefined);

  const onObjectHover = useCallback(
    (objectList: THREE.Object3D[]) => {
      if (objectList.length !== hoverObjectList.length) {
        // todo:
        // console.log(
        //   `View3D hover object changed ${hoverObjectList.length} -> ${objectList.length}`
        // );
        setHoverObjectList(objectList);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const obj of objectList) {
          if (!hoverObjectList.includes(obj)) {
            // todo :
            // console.log(`View3D hover object changed ${obj.name}`);
            setHoverObjectList(objectList);
            break;
          }
        }
      }
    },
    [hoverObjectList]
  );

  useEffect(() => {
    const control = new ThreeMeshControl(
      VIEW_SIZE,
      "preview",
      options,
      {
        onOrbitChange: (camPos: number[], zoom: number | undefined) => {
          // console.log("View3D onOrbitChange");
          setCameraPos(camPos);
          setCameraZoom(zoom);
        },
        onObjectSelected: (object: THREE.Object3D | undefined) => {
          // console.log("View3D onObjectSelected");
          setSelectedObject(object);
          if (callbacks?.onObjectSelected) callbacks.onObjectSelected(object);
        },
        onControlPointMove: (x: number, y: number, z: number) => {
          if (callbacks?.onControlPointMove)
            callbacks.onControlPointMove(x, y, z);
        },
        onControlLineZMove: (x: number, y: number) => {
          if (callbacks?.onControlLineZMove) callbacks.onControlLineZMove(x, y);
        },
        onObjectHover: (objectList: THREE.Object3D[]) => {
          onObjectHover(objectList);
        },
      },
      setLoadError
    );
    three.setControl(control);
    return control.getUnmountFunc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // モデルのロード
  useEffect(() => {
    if (url && three.control) {
      three.control.loadModel(url, () => {
        if (callbacks?.onLoad && url && three.control) {
          callbacks.onLoad(url, three.control);
        }
        three.setLoading(false);
        three.setLoadCount(three.loadCount + 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, three.control]);

  const changeGridSize = (size: number) => {
    if (three.control) three.control.setGridUnitSize(size);
  };
  const changeCameraType = (useOrthoCamera: boolean) => {
    if (three.control) three.control.setCameraType(useOrthoCamera);
  };
  const changeLookAtType = (lookAtType: LookAtType) => {
    if (three.control) three.control.setLookAtType(lookAtType);
  };
  const changeMaterialType = (materialType: MaterialType) => {
    if (three.control) three.control.setMaterialType(materialType);
  };
  const changeDragType = (selectTyoe: SelectType) => {
    if (three.control) three.control.setSelectType(selectTyoe);
  };

  return (
    <Flex direction="column">
      <div
        id="preview"
        style={{
          position: "relative",
          width: VIEW_SIZE,
          height: VIEW_SIZE,
          backgroundColor: "gray",
        }}
      >
        {three.control ? (
          <div>
            <AxisIconBox
              onAxisSelected={(viewpointType) => {
                three.control?.setCameraPosition(viewpointType);
              }}
            />
            <span>
              {
                // eslint-disable-next-line no-nested-ternary
                !selectedObject
                  ? ""
                  : selectedObject.name
                  ? selectedObject.name
                  : "(no name)"
              }
            </span>
          </div>
        ) : undefined}
      </div>

      <Flex direction="row" overflow="auto" style={{ width: VIEW_SIZE }}>
        <RadioGroupField
          padding={padding}
          label="Material"
          name="Material"
          defaultValue="original"
          onChange={(e) => changeMaterialType(e.target.value as MaterialType)}
        >
          <Radio value="original">標準</Radio>
          <Radio value="wireframe">ワイヤー</Radio>
          <Radio value="solid">ソリッド</Radio>
        </RadioGroupField>
        {!showPerspectiveControl ? undefined : (
          <RadioGroupField
            padding={padding}
            label="CameraType"
            name="CameraType"
            defaultValue="perspective"
            onChange={(e) => changeCameraType(e.target.value === "ortho")}
          >
            <Radio value="ortho">平行投影</Radio>
            <Radio value="perspective">透視投影</Radio>
          </RadioGroupField>
        )}
        {!showLookAtControl ? undefined : (
          <RadioGroupField
            padding={padding}
            label="LookAt"
            name="LookAt"
            defaultValue="modelCenter"
            onChange={(e) => changeLookAtType(e.target.value as LookAtType)}
          >
            <Radio value="origin">原点</Radio>
            <Radio value="modelCenter">モデル中心</Radio>
            <Radio value="selectedObjectCenter">選択部分中心</Radio>
            <Radio
              value="controlPoint"
              disabled={!three.control?.options.displayControlPoint}
            >
              制御点
            </Radio>
          </RadioGroupField>
        )}
        {!showGridSizeControl ||
        !three.control?.options.displayGrid ? undefined : (
          <RadioGroupField
            padding={padding}
            label="GridSize"
            name="GridSize"
            defaultValue="0.01"
            onChange={(e) => changeGridSize(Number.parseFloat(e.target.value))}
          >
            <Radio value="0">OFF</Radio>
            <Radio value="0.01">1cm</Radio>
            <Radio value="0.1">10cm</Radio>
            <Radio value="1">1m</Radio>
          </RadioGroupField>
        )}
        {!showCameraInfoView ? undefined : (
          <Flex direction="column" padding={padding}>
            <div>CameraPos</div>
            <div>x={Number.parseFloat(cameraPos[0].toPrecision(2))}</div>
            <div>y={Number.parseFloat(cameraPos[1].toPrecision(2))}</div>
            <div>z={Number.parseFloat(cameraPos[2].toPrecision(2))}</div>
            <div>CameraZoom</div>
            <div>
              {cameraZoom ? Number.parseFloat(cameraZoom.toPrecision(2)) : "-"}
            </div>
          </Flex>
        )}
        {!showObjectInfoView ? undefined : (
          <Flex direction="column" padding={padding}>
            <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
              <li>Selected</li>
              <li>
                <ul>
                  <li>
                    {selectedObject
                      ? `${selectedObject.constructor.name}: name="${selectedObject.name}" id=${selectedObject.id}`
                      : "(not selected)"}
                  </li>
                </ul>
              </li>
              <li>Hover</li>
              <li>
                <ul>
                  {hoverObjectList.map((obj) => (
                    <li
                      key={obj.id}
                    >{`${obj.constructor.name}: name="${obj.name}" id=${obj.id}`}</li>
                  ))}
                </ul>
              </li>
            </ul>
          </Flex>
        )}
        <RadioGroupField
          padding={padding}
          label="SelectMode"
          name="SelectMode"
          defaultValue="lasso"
          onChange={(e) => changeDragType(e.target.value as SelectType)}
        >
          <Radio value="lasso">ラッソ選択</Radio>
          <Radio value="rectangle">矩形選択</Radio>
        </RadioGroupField>
      </Flex>
    </Flex>
  );
}
