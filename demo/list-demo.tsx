import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import List from '../src';

// Generate mock data for the list
const generateData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `This is a description for item ${index}`,
  }));
};

const DemoList = () => {
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
      <h1>Virtual List Demo</h1>
      <p>Scroll position: {scrollTop.toFixed(2)}</p>
      <div style={{ height: '400px', width: '300px', border: '1px solid #ccc' }}>
        <List
          data={data}
          height={400}
          itemHeight={54}
          itemKey="id"
          onVirtualScroll={handleScroll}
          onVisibleChange={handleVisibleChange}
        >
          {(item, index) => (
            <div
              key={item.id}
              style={{
                height: 54,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderBottom: '1px solid #eee',
                padding: '0 10px',
                backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{item.description}</div>
            </div>
          )}
        </List>
      </div>
    </div>
  );
};

// Render the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoList />);
} else {
  // For demo purposes, create a container
  const demoContainer = document.createElement('div');
  demoContainer.id = 'root';
  document.body.appendChild(demoContainer);
  const root = createRoot(demoContainer);
  root.render(<DemoList />);
}

export default DemoList;