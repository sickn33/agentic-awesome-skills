import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function BasicChart({ data }) {
  const svgRef = useRef();
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Select SVG element
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content
    
    // Define dimensions and margins
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create main group with margins
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.1);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([innerHeight, 0])
      .nice();
    
    // Create and append axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    
    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    
    // Bind data and create visual elements (bars in this example)
    g.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => xScale(d.label))
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.value))
      .attr("fill", "steelblue");
    
    // Optional: Add axis labels
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text("Category");
    
    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Value");
    
  }, [data]);
  
  return (
    <div className="chart-container">
      <svg 
        ref={svgRef} 
        width="800" 
        height="400"
        style={{ border: '1px solid #ddd' }}
      />
    </div>
  );
}

// Example usage
export default function App() {
  const sampleData = [
    { label: 'A', value: 30 },
    { label: 'B', value: 80 },
    { label: 'C', value: 45 },
    { label: 'D', value: 60 },
    { label: 'E', value: 20 },
    { label: 'F', value: 90 }
  ];
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Basic D3.js Chart</h1>
      <BasicChart data={sampleData} />
    </div>
  );
}
