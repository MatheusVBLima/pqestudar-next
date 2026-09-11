import React from 'react';
import {createRoot} from 'react-dom/client';
import HeatmapPreview from '../../src/components/pages/admin/HeatmapPreview';
const width=Number(new URLSearchParams(window.location.search).get('width'))||1440;
createRoot(document.getElementById('root')!).render(<HeatmapPreview path="/preview" width={width} show points={[{x:5000,y:5000,count:10}]} />);
