import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GroupGrid from '../src/GroupGrid';

// Generate mock data for the group grid
const generateGroups = (groupCount: number, itemsPerGroup: number) => {
  return Array.from({ length: groupCount }, (_, groupIndex) => ({
    key: `group-${groupIndex}`,
    title: `Group ${groupIndex + 1}`,
    children: Array.from({ length: itemsPerGroup }, (_, itemIndex) => ({
      id: `${groupIndex}-${itemIndex}`,
      name: `Item ${groupIndex}-${itemIndex}`,
      description: `This is a description for item ${groupIndex}-${itemIndex}`,
    })),
  }));
};

const DemoGroupGrid = () => {
  const [groups] = useState(() => generateGroups(20, 25));
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (info: { x: number; y: number }) => {
    setScrollTop(info.y);
  };

  const handleVisibleChange = (visibleList: any[], fullList: any[]) => {
    console.log(`Visible items: ${visibleList.length}, Total items: ${fullList.length}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Virtual Group Grid Demo</h1>
      <p>Scroll position: {scrollTop.toFixed(2)}</p>
      <div style={{ height: '500px', width: '700px', border: '1px solid #ccc' }}>
        <GroupGrid
          groups={groups}
          height={500}
          itemHeight={80}
          itemWidth={120}
          columnCount={5}
          groupHeaderHeight={40}
          groupKey="key"
          itemKey="id"
          onVirtualScroll={handleScroll}
          onVisibleChange={handleVisibleChange}
          groupHeaderRender={(group) => (
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
              {group.title}
            </div>
          )}
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
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{item.name}</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{item.description}</div>
            </div>
          )}
        </GroupGrid>
      </div>
    </div>
  );
};

// Render the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DemoGroupGrid />);
} else {
  // For demo purposes, create a container
  const demoContainer = document.createElement('div');
  demoContainer.id = 'root';
  document.body.appendChild(demoContainer);
  const root = createRoot(demoContainer);
  root.render(<DemoGroupGrid />);
}

export default DemoGroupGrid;