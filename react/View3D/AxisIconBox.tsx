import './AxisIconBox.css';

export type ViewpointType = "xyz" | "x" | "y" | "z" | "-x" | "-y" | "-z";

interface Props {
  onAxisSelected: (viewpointType: ViewpointType) => void;
}
export default function AxisIconBox(props: Props) {
  return (
    <div className="perspective-icon-box">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewBox="0 0 100 100"
        className="perspective-icon-line"
      >
        <path d="M 78 50 L 60 38" stroke="#F06" strokeWidth="2px" />
        <path d="M 92 32 L 60 38" stroke="#0C6" strokeWidth="2px" />
        <path d="M 60 8 L 60 38" stroke="#09F" strokeWidth="2px" />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-x-p"
        fill="currentColor"
        viewBox="0 0 18 18"
        onClick={() => props.onAxisSelected("x")}
      >
        <circle cx="9" cy="9" r="9" fill="#F06" />
        <text
          fill="#000"
          x="50%"
          y="50%"
          fontSize="11"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          X
        </text>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-y-p"
        fill="currentColor"
        viewBox="0 0 18 18"
        onClick={() => props.onAxisSelected("y")}
      >
        <circle cx="9" cy="9" r="9" fill="#0C6" />
        <text
          fill="#000"
          x="50%"
          y="50%"
          fontSize="11"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          Y
        </text>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-z-p"
        fill="currentColor"
        viewBox="0 0 18 18"
        onClick={() => props.onAxisSelected("z")}
      >
        <circle cx="9" cy="9" r="9" fill="#09F" />
        <text
          fill="#000"
          x="50%"
          y="50%"
          fontSize="11"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          Z
        </text>
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-x-n"
        fill="currentColor"
        viewBox="0 0 20 20"
        onClick={() => props.onAxisSelected("-x")}
      >
        <circle
          cx="10"
          cy="10"
          r="9"
          stroke="#F06"
          strokeWidth="2"
          fill="#F06"
          fillOpacity="0.5"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-y-n"
        fill="currentColor"
        viewBox="0 0 20 20"
        onClick={() => props.onAxisSelected("-y")}
      >
        <circle
          cx="10"
          cy="10"
          r="9"
          stroke="#0C6"
          strokeWidth="2"
          fill="#0C6"
          fillOpacity="0.5"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon perspective-icon-z-n"
        fill="currentColor"
        viewBox="0 0 20 20"
        onClick={() => props.onAxisSelected("-z")}
      >
        <circle
          cx="10"
          cy="10"
          r="9"
          stroke="#09F"
          strokeWidth="2"
          fill="#09F"
          fillOpacity="0.5"
        />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="perspective-icon-equiangular"
        fill="currentColor"
        viewBox="0 0 18 18"
        onClick={() => props.onAxisSelected("xyz")}
      >
        <circle cx="9" cy="9" r="9" fill="#FFF" />
      </svg>
    </div>
  );
}
