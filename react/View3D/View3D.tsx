import { useState, useEffect, useCallback } from "react";

import { Flex, RadioGroupField, Radio } from "@aws-amplify/ui-react";

import ThreeControl, {
  LookAtType,
  MaterialType,
  OptionsView3D,
} from "../../view3d_util";
import AxisIconBox from "./AxisIconBox";

interface Props {
  three: ThreeState;
  url: string | undefined;
  showPerspectiveControl?: boolean;
  showLookAtControl?: boolean;
  showGridSizeControl?: boolean;
  showCameraInfoView?: boolean;
  showObjectInfoView?: boolean;
  options?: OptionsView3D;
  padding?: number;
  callbacks?: Callbacks;
}

const VIEW_SIZE = 512;

export type Callbacks = {
  onControlPointMove?: (x: number, y: number, z: number) => void;
  onControlLineZMove?: (x: number, y: number) => void;
  onLoad?: (url: string, control: ThreeControl) => void;
  onObjectSelected?: (object: THREE.Object3D | undefined) => void;
};

export type ThreeState = {
  control: ThreeControl | undefined;
  setControl: React.Dispatch<React.SetStateAction<ThreeControl | undefined>>;
  loadCount: number;
  setLoadCount: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const useThree = () => {
  const [control, setControl] = useState<ThreeControl | undefined>();
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

/* domが作成された後に、ThreeControlを作成し、props.three.setControl()でstateにセットします
 */

export default function View3D(props: Props) {
  console.log("View3D render");
  const [cameraPos, setCameraPos] = useState<number[]>([0, 0, 0]);
  const [cameraZoom, setCameraZoom] = useState<number | undefined>();
  const [hoverObjectList, setHoverObjectList] = useState<THREE.Object3D[]>([]);
  const [selectedObject, setSelectedObject] = useState<
    THREE.Object3D | undefined
  >(undefined);

  const onObjectHover = useCallback(
    (objectList: THREE.Object3D[]) => {
      if (objectList.length !== hoverObjectList.length) {
        console.log(
          `View3D hover object changed ${hoverObjectList.length} -> ${objectList.length}`
        );
        setHoverObjectList(objectList);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        for (const obj of objectList) {
          if (!hoverObjectList.includes(obj)) {
            console.log(`View3D hover object changed ${obj.name}`);
            setHoverObjectList(objectList);
            break;
          }
        }
      }
    },
    [hoverObjectList]
  );

  useEffect(() => {
    const control = new ThreeControl(VIEW_SIZE, "preview", props.options, {
      onOrbitChange: (camPos: number[], zoom: number | undefined) => {
        console.log("View3D onOrbitChange");
        setCameraPos(camPos);
        setCameraZoom(zoom);
      },
      onObjectSelected: (object: THREE.Object3D | undefined) => {
        console.log("View3D onObjectSelected");
        setSelectedObject(object);
        if (props.callbacks?.onObjectSelected)
          props.callbacks.onObjectSelected(object);
      },
      onControlPointMove: (x: number, y: number, z: number) => {
        if (props.callbacks?.onControlPointMove)
          props.callbacks.onControlPointMove(x, y, z);
      },
      onControlLineZMove: (x: number, y: number) => {
        if (props.callbacks?.onControlLineZMove)
          props.callbacks.onControlLineZMove(x, y);
      },
      onObjectHover: (objectList: THREE.Object3D[]) => {
        onObjectHover(objectList);
      },
    });
    props.three.setControl(control);
    return control.getUnmountFunc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 最新のhoverObjectListがonObjectHoverで使われるようにハンドラを更新します（＝クロージャーが最新の値を参照する）
    const cont = props.three.control;
    if (cont) cont.callbacks.onObjectHover = onObjectHover;
  }, [hoverObjectList, onObjectHover, props.three.control]);

  useEffect(() => {
    console.log("useEffect [props.url] called", props.three.control);
    if (props.url && props.three.control) {
      props.three.setLoading(true);
      props.three.control.unloadModels();
      console.log("ModelViewer call loadModel");
      props.three.control.loadModel(props.url, () => {
        if (props.callbacks?.onLoad && props.url && props.three.control) {
          props.callbacks.onLoad(props.url, props.three.control);
        }
        props.three.setLoading(false);
        props.three.setLoadCount(props.three.loadCount + 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.three.control, props.url]);

  const changeGridSize = (size: number) => {
    if (props.three.control) props.three.control.setGridUnitSize(size);
  };
  const changeCameraType = (useOrthoCamera: boolean) => {
    if (props.three.control) props.three.control.setCameraType(useOrthoCamera);
  };
  const changeLookAtType = (lookAtType: LookAtType) => {
    if (props.three.control) props.three.control.setLookAtType(lookAtType);
  };
  const changeMaterialType = (materialType: MaterialType) => {
    if (props.three.control) props.three.control.setMaterialType(materialType);
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
        {props.three.control ? (
          <div>
            <AxisIconBox
              onAxisSelected={(viewpointType) => {
                props.three.control?.setCameraPosition(viewpointType);
              }}
            />
            <span
              style={{
                color: "white",
                position: "absolute",
                left: "5px",
                bottom: "5px",
                overflowWrap: "anywhere",
                lineHeight: 1,
              }}
            >
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
          padding={props.padding}
          label="Material"
          name="Material"
          defaultValue="original"
          onChange={(e) => changeMaterialType(e.target.value as MaterialType)}
        >
          <Radio value="original">標準</Radio>
          <Radio value="wireframe">ワイヤー</Radio>
          <Radio value="solid">ソリッド</Radio>
        </RadioGroupField>
        {!props.showPerspectiveControl ? undefined : (
          <RadioGroupField
            padding={props.padding}
            label="CameraType"
            name="CameraType"
            defaultValue="perspective"
            onChange={(e) => changeCameraType(e.target.value === "ortho")}
          >
            <Radio value="ortho">平行投影</Radio>
            <Radio value="perspective">透視投影</Radio>
          </RadioGroupField>
        )}
        {!props.showLookAtControl ? undefined : (
          <RadioGroupField
            padding={props.padding}
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
              disabled={!props.three.control?.options.displayControlPoint}
            >
              制御点
            </Radio>
          </RadioGroupField>
        )}
        {!props.showGridSizeControl ||
        !props.three.control?.options.displayGrid ? undefined : (
          <RadioGroupField
            padding={props.padding}
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
        {!props.showCameraInfoView ? undefined : (
          <Flex direction="column" padding={props.padding}>
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
        {!props.showObjectInfoView ? undefined : (
          <Flex direction="column" padding={props.padding}>
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
      </Flex>
    </Flex>
  );
}
View3D.defaultProps = {
  showPerspectiveControl: true,
  showLookAtControl: true,
  showGridSizeControl: false,
  showCameraInfoView: false,
  showObjectInfoView: false,
  options: {},
  padding: 5,
  callbacks: undefined,
};
