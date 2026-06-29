"use client";

import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  Layer,
  Rectangle,
  Text,
  SankeyNode as RechartsSankeyNode,
} from "recharts";
import React, { Component } from "react";

interface SankeyNode {
  name: string;
  value: number;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyChartProps {
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
  nodeColors: string[];
  linkColors: string[];
}

class CustomNode extends React.Component<any> {
  render() {
    const {
      x,
      y,
      width,
      height,
      index,
      payload,
      containerWidth,
      colors,
    } = this.props;

    const isOut = x + width + 6 > containerWidth;
    const offset = 5;

    return (
      <Layer key={`CustomNode${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={colors[index % colors.length]}
          fillOpacity={1}
          radius={2}
        />
        <Text
          textAnchor={isOut ? "end" : "start"}
          x={isOut ? x - 6 : x + width + 6}
          y={y + offset + height / 2}
          fontSize={14}
          fontStyle="normal"
          fill="#ffffff"
        >
          {`${payload.name} : ${payload.value} €`}
        </Text>
      </Layer>
    );
  }
}

class CustomLink extends Component<any> {
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
      colors,
    } = this.props;

    const margin = 5;
    const width = linkWidth - margin;

    return (
      <Layer key={`CustomLink${index}`}>
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
          strokeWidth={0}
        />
      </Layer>
    );
  }
}

export default function SankeyChart({
  data,
  nodeColors,
  linkColors,
}: SankeyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={550}>
      <Sankey
        data={data}
        sort={false}
        nodePadding={10}
        nodeWidth={8}
        linkCurvature={0.6}
        iterations={0}
        margin={{
          left: 5,
          right: 5,
          top: 5,
          bottom: 5,
        }}
        node={<CustomNode containerWidth={960} colors={nodeColors} />}
        link={<CustomLink colors={linkColors} />}
      >
        <Tooltip />
      </Sankey>
    </ResponsiveContainer>
  );
}
