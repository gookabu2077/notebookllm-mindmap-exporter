// 自动展开所有节点的脚本
// 在 NotebookLLM 思维导图页面运行

(() => {
    console.log('🚀 开始自动展开所有节点...');

    let expandedCount = 0;
    let totalAttempts = 0;
    const maxAttempts = 100; // 最多尝试100次

    function expandAllNodes() {
        // 查找所有可展开的节点 (有 > 符号的)
        const expandButtons = document.querySelectorAll('text.expand-symbol');

        let expandedThisRound = 0;

        expandButtons.forEach(button => {
            const text = button.textContent.trim();

            // 如果是 > 符号,说明节点是折叠的
            if (text === '>') {
                // 找到父节点
                const nodeGroup = button.closest('g.node');
                if (nodeGroup) {
                    // 点击节点展开
                    const circle = nodeGroup.querySelector('circle[fill-opacity="1"]');
                    if (circle) {
                        console.log('展开节点:', nodeGroup.querySelector('text.node-name')?.textContent);
                        circle.click();
                        expandedThisRound++;
                        expandedCount++;
                    }
                }
            }
        });

        totalAttempts++;

        if (expandedThisRound > 0 && totalAttempts < maxAttempts) {
            // 如果还有节点被展开,继续尝试
            console.log(`第 ${totalAttempts} 轮: 展开了 ${expandedThisRound} 个节点`);
            setTimeout(expandAllNodes, 500); // 等待500ms后继续
        } else {
            console.log('✅ 展开完成!');
            console.log(`总共展开了 ${expandedCount} 个节点`);
            console.log('💡 现在可以使用扩展导出完整的思维导图了');

            // 统计最终节点数
            const allNodes = document.querySelectorAll('g.node');
            console.log(`📊 当前可见节点总数: ${allNodes.length}`);
        }
    }

    // 开始展开
    expandAllNodes();
})();
