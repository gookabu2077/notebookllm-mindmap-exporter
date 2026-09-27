// ========================================
// 🚀 NotebookLLM 思维导图【全自动】一键提取脚本
// ========================================
// 功能:
// 1. 自动递归展开所有折叠的节点
// 2. 等待加载完成
// 3. 提取完整数据并下载 JSON
// ========================================

(async () => {
    console.clear();
    console.log('%c🚀 启动全自动提取程序...', 'font-size: 14px; font-weight: bold; color: #4f8cff');

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
        const rect = g.querySelector('rect');
        const circle = g.querySelector('circle');

        if (text) {
            const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(transform);
            nodes.push({
                id: index,
                name: text.textContent.trim(),
                x: match ? parseFloat(match[1]) : 0,
                y: match ? parseFloat(match[2]) : 0,
                color: rect?.getAttribute('fill') || circle?.getAttribute('fill') || '#cccccc'
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

    // 3️⃣ 阶段三: 导出下载
    console.log(`\n%c💾 阶段 3: 生成文件...`, 'font-weight: bold');
    console.log(`   - 节点数: ${nodes.length}`);
    console.log(`   - 连线数: ${links.length}`);

    const data = {
        meta: {
            exportedAt: new Date().toISOString(),
            source: "NotebookLLM",
            totalNodes: nodes.length
        },
        nodes,
        links
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 生成文件名: notebooklm-mindmap-日期-节点数.json
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `notebooklm-mindmap-${dateStr}-${nodes.length}nodes.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log(`%c✅ 成功! 文件已下载: ${filename}`, 'color: green; font-weight: bold; font-size: 14px');

    // 挂载到全局变量方便调试
    window.mindmapData = data;
})();
