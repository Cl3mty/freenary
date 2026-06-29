import React, { forwardRef  } from 'react'
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import CustomNode from './CustomNode'
import CustomLink from './CustomLink'

const SankeyChart = forwardRef((props) => {
      //const nodeColors = ["#486df0", "#f49352", "#d6475d", "#85357d", "#6f50e5", "#3c898e", "#d6475d", "#d6475d", "#d6475d", "#d6475d", "#85357d", "#85357d", "#6f50e5", "#6f50e5", "#3c898e", "#3c898e"];
      //const linkColors = ["#486df0", "#f49352", "#f49352", "#f49352", "#f49352", "#d6475d", "#d6475d", "#d6475d", "#d6475d", "#85357d", "#85357d", "#6f50e5", "#6f50e5", "#3c898e", "#3c898e"]
  return (
    <ResponsiveContainer width={'100%'} height={550}>
        <Sankey
        ref={props.refSankey}
        data={props.data}
        sort={false}
        nodePadding={10}
        nodeWidth={8}
        linkCurvature={0.60}
        iterations={0}
        margin={{
            left: 5,
            right: 5,
            top: 5,
            bottom: 5,
        }}
        // node={{ stroke: '#OOOOFF'}}
        node={<CustomNode containerWidth={960} colors={props.nodeColors}/>}
        //link={{ stroke: '#B6C5F9' }}
        link={<CustomLink colors={props.linkColors}/>}
        >
      </Sankey>
    </ResponsiveContainer>
    
  )
})

export default SankeyChart