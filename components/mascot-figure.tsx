import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import {
  type MascotExpression,
  MASCOT_VIEWBOX,
} from "@/lib/mascot-frame";

export {
  MASCOT_MAX_TILT_DEGREES,
  MASCOT_VIEWBOX,
  mascotBox,
  mascotExpression,
} from "@/lib/mascot-frame";
export type { MascotExpression } from "@/lib/mascot-frame";

export function MascotFigure({
  width,
  height,
  body,
  face,
  ink,
  scarf,
  expression,
}: {
  width: number;
  height: number;
  body: string;
  face: string;
  ink: string;
  scarf: string;
  expression: MascotExpression;
}) {
  const armY = expression.wave ? 52 : 62;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Circle cx="18" cy="20" r="3" fill={scarf} />
      <Circle cx="72" cy="16" r="2.2" fill={body} />
      <Rect x="42" y="16" width="4" height="14" rx="2" fill={scarf} />
      <Circle cx="44" cy="13" r="5" fill={body} />
      <Ellipse cx="24" cy="42" rx="8" ry="11" fill={body} />
      <Ellipse cx="64" cy="42" rx="8" ry="11" fill={body} />
      <Ellipse cx="32" cy="97" rx="11" ry="5" fill={ink} />
      <Ellipse cx="56" cy="97" rx="11" ry="5" fill={ink} />
      <Rect x="18" y="32" width="52" height="62" rx="26" fill={body} />
      <Ellipse cx="16" cy={armY} rx="6" ry="11" fill={body} />
      <Ellipse cx="72" cy={armY} rx="6" ry="11" fill={body} />
      <Circle cx="44" cy="56" r="20" fill={face} />
      {expression.brows ? (
        <>
          <Path d="M31 46 L39 48" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
          <Path d="M49 48 L57 46" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {expression.eyes === "open" ? (
        <>
          <Ellipse cx="36" cy="54" rx="3.2" ry="4.2" fill={ink} />
          <Ellipse cx="52" cy="54" rx="3.2" ry="4.2" fill={ink} />
        </>
      ) : null}
      {expression.eyes === "peek" ? (
        <>
          <Ellipse cx="36" cy="52" rx="3.2" ry="4.2" fill={ink} />
          <Ellipse cx="52" cy="52" rx="3.2" ry="4.2" fill={ink} />
          <Circle cx="36.6" cy="50.6" r="1.1" fill="#FFFDF9" />
          <Circle cx="52.6" cy="50.6" r="1.1" fill="#FFFDF9" />
        </>
      ) : null}
      {expression.eyes === "closed" ? (
        <>
          <Path d="M32 54 Q36 49 40 54" stroke={ink} strokeWidth="2.1" fill="none" strokeLinecap="round" />
          <Path d="M48 54 Q52 49 56 54" stroke={ink} strokeWidth="2.1" fill="none" strokeLinecap="round" />
        </>
      ) : null}
      <Ellipse cx="30" cy="62" rx="4" ry="2.2" fill={body} opacity={0.35} />
      <Ellipse cx="58" cy="62" rx="4" ry="2.2" fill={body} opacity={0.35} />
      {expression.mouth === "smile" ? (
        <Path d="M36 66 Q44 72 52 66" stroke={ink} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      ) : null}
      {expression.mouth === "open" ? <Ellipse cx="44" cy="68" rx="5" ry="3.4" fill={ink} /> : null}
      {expression.mouth === "small" ? <Circle cx="44" cy="68" r="2.3" fill={ink} /> : null}
      {expression.mouth === "flat" ? (
        <Path d="M37 67 H51" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      ) : null}
      {expression.hands ? (
        <>
          <Rect x="27" y="46" width="14" height="18" rx="7" fill={face} />
          <Rect x="47" y="46" width="14" height="18" rx="7" fill={face} />
        </>
      ) : null}
      <Rect x="26" y="76" width="36" height="9" rx="4.5" fill={scarf} />
      <SvgText
        x="44"
        y="83"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill={ink}
      >
        p
      </SvgText>
      <Circle cx="68" cy="86" r="7" fill={ink} />
      <Circle cx="68" cy="86" r="2.6" fill={scarf} />
    </Svg>
  );
}
