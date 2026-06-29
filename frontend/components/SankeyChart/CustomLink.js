import React, { Component } from "react";
import { Layer } from "recharts";

export default class CustomLink extends Component {
  render() {
    const {
      sourceX,
      targetX,
      sourceY,
      targetY,
      sourceControlX,
      targetControlX,
      linkWidth,
      index,
      colors
    } = this.props;

    const margin = 5
    const width = linkWidth - margin

    return (
      <Layer key={`CustomLink${index}`} >
        <path
          d={`
            M${sourceX + margin},${sourceY + width / 2}
            C${sourceControlX},${sourceY + width / 2}
              ${targetControlX},${targetY + width / 2}
              ${targetX - margin},${targetY + width / 2}
            L${targetX - margin},${targetY - width / 2}
            C${targetControlX},${targetY - width / 2}
              ${sourceControlX},${sourceY - width / 2}
              ${sourceX + margin},${sourceY - width / 2}
            Z
          `}
          fill={colors[index % colors.length]}
          opacity={0.4}
          strokeWidth="0"
        />
      </Layer>
    );
  }
}
