import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Grid from '../src/Grid';

// Generate mock data for the grid
const generateData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `This is a description for item ${index}`,
  }));
};

const DemoGrid = () => {
  const [data] = useState(() => generateData(10000));
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (info: { x: number; y: number }) => {
    setScrollTop(info.y);
  };

  const handleVisibleChange = (visibleList: any[], fullList: any[]) => {
    console.log(`Visible items: ${visibleList.length}, Total items: ${fullList.length}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Virtual Grid Demo</h1>
      <p>Scroll position: {scrollTop.toFixed(2)}</p>
      <div style={{ height: '400px', width: '600px', border: '1px solid #ccc' }}>
        <Grid
          data={data}
          height={400}
          itemHeight={100}
          itemWidth={150}
          columnCount={4}
          itemKey="id"
          onVirtualScroll={handleScroll}
          onVisibleChange={handleVisibleChange}
        >
          {(item, index) => (
            <div
              key={item.id}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '1px solid #ddd',
                margin: '2px',
                backgroundColor: index % 2 === 0 ? '#f0f8ff' : '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{item.description}</div>
              <div style={{ fontSize: '10px', color: '#999' }}>#{item.id}</div>
            </div>
          )}
        </Grid>
      </div>
    </div>
  );
};

// Render the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoGrid />);
} else {
  // For demo purposes, create a container
  const demoContainer = document.createElement('div');
  demoContainer.id = 'root';
  document.body.appendChild(demoContainer);
  const root = createRoot(demoContainer);
  root.render(<DemoGrid />);
}

export default DemoGrid;