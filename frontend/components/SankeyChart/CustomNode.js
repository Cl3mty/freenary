import React from "react";
import { Rectangle, Layer, Text } from "recharts";

export default function CustomNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
  colors
}) {
  const isOut = x + width + 6 > containerWidth;
  const offset = 5

  return (
    <Layer key={`CustomNode${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={colors[index % colors.length]}
          fillOpacity="1"
          radius={2}
        />
      <Text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + offset + height / 2}
        fontSize="14"
        fontStyle='normal'
        fill="#ffffff"
      >
        {payload.name + ' : ' + payload.value + ' €'}
      </Text>
    </Layer>
  );
}
