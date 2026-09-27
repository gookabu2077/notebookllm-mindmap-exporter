"""
使用 Playwright 自动化导出 NotebookLLM 思维导图
需要先安装: pip install playwright
然后运行: playwright install chromium
"""

from playwright.sync_api import sync_playwright
import json
import time

def export_notebooklm_mindmap(url, output_file='mindmap.json'):
    """
    自动化导出 NotebookLLM 思维导图
    
    Args:
        url: NotebookLLM 思维导图页面 URL
        output_file: 输出文件路径
    """
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        print(f'🌐 正在打开: {url}')
        page.goto(url)
        
        # 等待思维导图加载
        print('⏳ 等待思维导图加载...')
        page.wait_for_selector('.mindmap', timeout=30000)
        time.sleep(2)
        
        # 自动展开所有节点
        print('🔓 自动展开所有节点...')
        expand_script = """
        () => {
            return new Promise((resolve) => {
                let expandedCount = 0;
                let totalAttempts = 0;
                const maxAttempts = 50;
                
                function expandAllNodes() {
                    const expandButtons = document.querySelectorAll('text.expand-symbol');
                    let expandedThisRound = 0;
                    
                    expandButtons.forEach(button => {
                        if (button.textContent.trim() === '>') {
                            const nodeGroup = button.closest('g.node');
                            if (nodeGroup) {
                                const circle = nodeGroup.querySelector('circle[fill-opacity="1"]');
                                if (circle) {
                                    circle.click();
                                    expandedThisRound++;
                                    expandedCount++;
                                }
                            }
                        }
                    });
                    
                    totalAttempts++;
                    
                    if (expandedThisRound > 0 && totalAttempts < maxAttempts) {
                        setTimeout(expandAllNodes, 300);
                    } else {
                        resolve(expandedCount);
                    }
                }
                
                expandAllNodes();
            });
        }
        """
        
        expanded_count = page.evaluate(expand_script)
        print(f'✅ 展开了 {expanded_count} 个节点')
        
        # 提取思维导图数据
        print('📊 提取思维导图数据...')
        extract_script = """
        () => {
            const svg = document.querySelector('.mindmap svg');
            if (!svg) return null;
            
            const nodes = [];
            const links = [];
            
            // 提取节点
            svg.querySelectorAll('g.node').forEach((g, index) => {
                const transform = g.getAttribute('transform');
                const text = g.querySelector('text.node-name');
                const rect = g.querySelector('rect');
                const circle = g.querySelector('circle');
                
                if (text) {
                    const match = /translate\\(([-\\d.]+),\\s*([-\\d.]+)\\)/.exec(transform);
                    nodes.push({
                        id: index,
                        name: text.textContent.trim(),
                        x: match ? parseFloat(match[1]) : 0,
                        y: match ? parseFloat(match[2]) : 0,
                        color: rect?.getAttribute('fill') || circle?.getAttribute('fill')
                    });
                }
            });
            
            // 提取连线
            svg.querySelectorAll('path.link').forEach(path => {
                const d = path.getAttribute('d');
                const coords = d.match(/[-]?\\d+\\.?\\d*/g).map(Number);
                if (coords.length >= 4) {
                    links.push({
                        from: { x: coords[0], y: coords[1] },
                        to: { x: coords[coords.length - 2], y: coords[coords.length - 1] }
                    });
                }
            });
            
            return { nodes, links };
        }
        """
        
        data = page.evaluate(extract_script)
        
        if data:
            print(f'✅ 提取成功: {len(data["nodes"])} 个节点, {len(data["links"])} 条连线')
            
            # 保存为 JSON
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f'💾 已保存到: {output_file}')
            
            # 转换为 Markdown
            md_file = output_file.replace('.json', '.md')
            convert_to_markdown(data, md_file)
            print(f'📝 Markdown 已保存到: {md_file}')
        else:
            print('❌ 提取失败')
        
        # 关闭浏览器
        browser.close()

def convert_to_markdown(data, output_file):
    """将提取的数据转换为 Markdown"""
    nodes = {(n['x'], n['y']): n for n in data['nodes']}
    links = data['links']
    
    # 构建树结构
    tree = {}
    children = set()
    
    for link in links:
        # 找到最近的父节点和子节点
        parent = min(nodes.items(), 
                    key=lambda kv: abs(kv[0][0] - link['from']['x']) + abs(kv[0][1] - link['from']['y']))
        child = min(nodes.items(),
                   key=lambda kv: abs(kv[0][0] - link['to']['x']) + abs(kv[0][1] - link['to']['y']))
        
        parent_name = parent[1]['name']
        child_name = child[1]['name']
        
        if parent_name not in tree:
            tree[parent_name] = []
        tree[parent_name].append(child_name)
        children.add(child_name)
    
    # 找根节点
    root = None
    for node in data['nodes']:
        if node['name'] not in children:
            root = node['name']
            break
    
    # DFS 生成 Markdown
    def dfs(node, level=1):
        lines = [f"{'#' * level} {node}"]
        for child in tree.get(node, []):
            lines.extend(dfs(child, level + 1))
        return lines
    
    if root:
        md_lines = dfs(root)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(md_lines))

if __name__ == '__main__':
    # 使用示例
    url = input('请输入 NotebookLLM 思维导图 URL: ')
    export_notebooklm_mindmap(url)
