// ========================================
// 🚀 NotebookLLM 思维导图【树形结构】一键提取脚本
// ========================================
// 功能:
// 1. 自动递归展开所有折叠的节点
// 2. 等待加载完成
// 3. 提取完整数据并重构为树形 JSON
// ========================================

(async () => {
    console.clear();
    console.log('%c🚀 启动全自动提取程序 (树形结构版)...', 'font-size: 14px; font-weight: bold; color: #4f8cff');

    // 工具函数: 等待指定毫秒
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 1️⃣ 阶段一: 自动展开所有节点
    console.log('\n%c🔓 阶段 1: 正在展开所有节点...', 'font-weight: bold');

    let totalExpanded = 0;
    let round = 1;
    const MAX_ROUNDS = 100; // 防止死循环

    while (round <= MAX_ROUNDS) {
        // 查找所有显示为 ">" 的展开符号 (表示折叠状态)
        const expandButtons = Array.from(document.querySelectorAll('text.expand-symbol'))
            .filter(el => el.textContent.trim() === '>');

        if (expandButtons.length === 0) {
            console.log('   ✅ 所有节点已展开');
            break;
        }

        console.log(`   🔄 第 ${round} 轮: 发现 ${expandButtons.length} 个折叠节点，正在展开...`);

        let clickedCount = 0;
        for (const btn of expandButtons) {
            // 找到对应的点击目标 (通常是同组的 circle 或 rect)
            const group = btn.closest('g.node');
            if (group) {
                // 尝试点击圆圈或矩形背景
                const clickTarget = group.querySelector('circle') || group.querySelector('rect');
                if (clickTarget) {
                    // 模拟原生点击事件
                    const event = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    clickTarget.dispatchEvent(event);
                    clickedCount++;
                }
            }
        }

        if (clickedCount > 0) {
            totalExpanded += clickedCount;
            // 等待 DOM 更新和动画 (NotebookLLM 有时加载较慢，给足时间)
            await sleep(1500);
        } else {
            console.warn('   ⚠️ 找到折叠节点但无法点击，停止展开');
            break;
        }

        round++;
    }

    console.log(`\n🎉 展开完成! 共展开了 ${totalExpanded} 个节点。`);
    console.log('⏳ 等待最终渲染稳定 (2秒)...');
    await sleep(2000);

    // 2️⃣ 阶段二: 提取数据
    console.log('\n%c📊 阶段 2: 提取数据...', 'font-weight: bold');

    const svg = document.querySelector('.mindmap svg');
    if (!svg) {
        console.error('❌ 未找到思维导图 SVG 元素!');
        return;
    }

    // 提取节点
    const nodes = [];
    svg.querySelectorAll('g.node').forEach((g, index) => {
        const transform = g.getAttribute('transform');
        const text = g.querySelector('text.node-name');

        if (text) {
            const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(transform);
            nodes.push({
                id: index,
                name: text.textContent.trim(),
                x: match ? parseFloat(match[1]) : 0,
                y: match ? parseFloat(match[2]) : 0
            });
        }
    });

    // 提取连线
    const links = [];
    svg.querySelectorAll('path.link').forEach(path => {
        const d = path.getAttribute('d');
        // 简单的正则提取所有数字坐标
        const coords = d.match(/[-]?\d+\.?\d*/g)?.map(Number);

        if (coords && coords.length >= 4) {
            // SVG 路径通常是 M x1 y1 ... x2 y2
            // 取第一个点和最后一个点
            links.push({
                from: { x: coords[0], y: coords[1] },
                to: { x: coords[coords.length - 2], y: coords[coords.length - 1] }
            });
        }
    });

    console.log(`   - 原始节点数: ${nodes.length}`);
    console.log(`   - 原始连线数: ${links.length}`);

    // 3️⃣ 阶段三: 重构树形结构
    console.log('\n%c🌲 阶段 3: 重构树形结构...', 'font-weight: bold');

    const buildTreeData = (nodes, links) => {
        // 辅助函数：找到距离某点最近的节点
        const findClosestNode = (point) => {
            let minDist = Infinity;
            let closest = null;
            for (const node of nodes) {
                const dx = node.x - point.x;
                const dy = node.y - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = node;
                }
            }
            // 简单的阈值判断，防止连线连到太远的地方（可选）
            return closest;
        };

        // 建立父子关系映射
        const childrenMap = new Map(); // parentId -> [childId, ...]
        const parentMap = new Map();   // childId -> parentId

        links.forEach(link => {
            const source = findClosestNode(link.from);
            const target = findClosestNode(link.to);

            if (source && target && source.id !== target.id) {
                // 假设连线方向是从父节点到子节点
                // 如果 NotebookLLM 的连线方向相反，这里需要交换 source 和 target
                // 通常 SVG path 的 M 是起点，最后是终点
                if (!childrenMap.has(source.id)) {
                    childrenMap.set(source.id, []);
                }
                // 避免重复添加
                if (!childrenMap.get(source.id).includes(target.id)) {
                    childrenMap.get(source.id).push(target.id);
                    parentMap.set(target.id, source.id);
                }
            }
        });

        // 寻找根节点 (没有父节点的节点)
        const roots = nodes.filter(n => !parentMap.has(n.id));

        if (roots.length === 0) {
            console.error('❌ 无法识别根节点，可能存在循环引用或连线解析错误');
            return null;
        }

        // 递归构建树
        const buildNode = (nodeId) => {
            const node = nodes.find(n => n.id === nodeId);
            const result = { name: node.name };

            const childrenIds = childrenMap.get(nodeId);
            if (childrenIds && childrenIds.length > 0) {
                // 按 Y 坐标排序，保证视觉顺序
                const childrenNodes = childrenIds.map(id => nodes.find(n => n.id === id));
                childrenNodes.sort((a, b) => a.y - b.y);

                result.children = childrenNodes.map(child => buildNode(child.id));
            }
            return result;
        };

        // 如果有多个根节点，通常取第一个作为主根，或者全部返回
        // 这里假设只有一个主要的主题
        return buildNode(roots[0].id);
    };

    const treeData = buildTreeData(nodes, links);

    if (!treeData) {
        console.error('❌ 树形结构构建失败');
        return;
    }

    // 4️⃣ 阶段四: 导出下载
    console.log(`\n%c💾 阶段 4: 生成文件...`, 'font-weight: bold');

    const json = JSON.stringify(treeData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 生成文件名
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `notebooklm-mindmap-tree-${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log(`%c✅ 成功! 文件已下载: ${filename}`, 'color: green; font-weight: bold; font-size: 14px');

    // 挂载到全局变量方便调试
    window.mindmapTree = treeData;
})();
