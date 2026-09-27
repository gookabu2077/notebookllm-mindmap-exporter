// 在 NotebookLLM 思维导图页面的浏览器控制台中运行此脚本
// 尝试提取完整的思维导图数据结构

(() => {
  console.log('🔍 开始搜索思维导图数据...');
  
  // 方法1: 查找 Angular 组件数据
  const findAngularData = () => {
    const elements = document.querySelectorAll('[ng-reflect-*]');
    console.log('找到 Angular 元素:', elements.length);
    
    for (const el of elements) {
      const attrs = Array.from(el.attributes);
      const ngAttrs = attrs.filter(a => a.name.startsWith('ng-reflect'));
      if (ngAttrs.length > 0) {
        console.log('Angular 属性:', ngAttrs);
      }
    }
  };
  
  // 方法2: 查找 window 对象中的数据
  const findWindowData = () => {
    console.log('🔍 搜索 window 对象...');
    const keys = Object.keys(window).filter(k => 
      k.toLowerCase().includes('mind') || 
      k.toLowerCase().includes('map') ||
      k.toLowerCase().includes('graph') ||
      k.toLowerCase().includes('tree')
    );
    console.log('可能相关的 window 属性:', keys);
    keys.forEach(k => console.log(`window.${k}:`, window[k]));
  };
  
  // 方法3: 拦截网络请求
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('📡 Fetch 请求:', args[0]);
    return originalFetch.apply(this, args).then(response => {
      const clonedResponse = response.clone();
      clonedResponse.json().then(data => {
        console.log('📦 响应数据:', data);
      }).catch(() => {});
      return response;
    });
  };
  
  // 方法4: 查找 React/Angular 组件实例
  const findComponentData = () => {
    const mindmapEl = document.querySelector('.mindmap');
    if (mindmapEl) {
      console.log('找到 .mindmap 元素');
      
      // 查找所有可能的数据属性
      const dataKeys = Object.keys(mindmapEl).filter(k => 
        k.startsWith('__') || k.includes('data') || k.includes('props')
      );
      console.log('元素数据键:', dataKeys);
      dataKeys.forEach(k => console.log(`${k}:`, mindmapEl[k]));
    }
  };
  
  // 方法5: 提取 SVG 中的所有文本和结构
  const extractSVGStructure = () => {
    const svg = document.querySelector('.mindmap svg');
    if (!svg) {
      console.log('❌ 未找到 SVG');
      return null;
    }
    
    const nodes = [];
    const links = [];
    
    // 提取所有节点
    svg.querySelectorAll('g.node').forEach((g, index) => {
      const transform = g.getAttribute('transform');
      const text = g.querySelector('text.node-name');
      const rect = g.querySelector('rect');
      const circle = g.querySelector('circle');
      
      if (text) {
        const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(transform);
        nodes.push({
          id: index,
          name: text.textContent.trim(),
          x: match ? parseFloat(match[1]) : 0,
          y: match ? parseFloat(match[2]) : 0,
          color: rect?.getAttribute('fill') || circle?.getAttribute('fill'),
          hasChildren: g.querySelector('circle[fill-opacity="1"]') !== null
        });
      }
    });
    
    // 提取所有连线
    svg.querySelectorAll('path.link').forEach(path => {
      const d = path.getAttribute('d');
      const coords = d.match(/[-]?\d+\.?\d*/g).map(Number);
      if (coords.length >= 4) {
        links.push({
          from: { x: coords[0], y: coords[1] },
          to: { x: coords[coords.length - 2], y: coords[coords.length - 1] },
          color: path.getAttribute('style')
        });
      }
    });
    
    console.log('📊 提取的数据:');
    console.log('节点数:', nodes.length);
    console.log('连线数:', links.length);
    console.log('节点:', nodes);
    console.log('连线:', links);
    
    return { nodes, links };
  };
  
  // 执行所有方法
  findAngularData();
  findWindowData();
  findComponentData();
  const data = extractSVGStructure();
  
  // 导出数据
  if (data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap-data.json';
    a.click();
    console.log('✅ 数据已导出为 mindmap-data.json');
  }
  
  console.log('✅ 数据提取完成!');
  console.log('💡 提示: 刷新页面后,网络拦截才会生效');
})();
