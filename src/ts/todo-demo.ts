/**
 * todo-demo.ts —— 待办清单界面演示（液态玻璃风格，功能可交互）
 * 支持新增、勾选完成、删除、筛选、进度统计、到点提醒（模拟系统通知）
 */

type TodoFilter = 'all' | 'active' | 'done';

interface TodoItem {
    id: number;
    text: string;
    done: boolean;
    /** 提醒时间（HH:MM），可为空 */
    remind?: string;
}

let nextId = 1;

const SEED: TodoItem[] = [
    { id: nextId++, text: '给 Scratch 项目「飞机大战」添加计分板变量', done: false, remind: '20:30' },
    { id: nextId++, text: '用 AI 助手优化克隆体性能', done: false },
    { id: nextId++, text: '导出游戏打包为 HTML 分享给同学', done: true },
    { id: nextId++, text: '整理 NeoWarp 扩展模板代码', done: true, remind: '18:00' }
];

function initTodoDemo(): void {
    const root = document.getElementById('todoDemo') as HTMLElement | null;
    if (!root) return;
    const rootEl: HTMLElement = root;

    const list = root.querySelector<HTMLElement>('.todo-list') as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('.todo-input') as HTMLInputElement;
    const timeInput = root.querySelector<HTMLInputElement>('.todo-time-input') as HTMLInputElement;
    const addBtn = root.querySelector<HTMLButtonElement>('.todo-add-btn') as HTMLButtonElement;
    const fill = root.querySelector<HTMLElement>('.todo-progress-fill') as HTMLElement;
    const progressText = root.querySelector<HTMLElement>('.todo-progress-text') as HTMLElement;
    const toast = root.querySelector<HTMLElement>('.notify-toast') as HTMLElement;

    let items: TodoItem[] = SEED.map((t) => ({ ...t }));
    let filter: TodoFilter = 'all';
    let toastTimer = 0;

    /* 顶部日期 */
    const dateEl = root.querySelector<HTMLElement>('#todoDate');
    if (dateEl) {
        const now = new Date();
        const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
        dateEl.textContent =
            now.getMonth() + 1 + '月' + now.getDate() + '日 · 周' + week;
    }

    /* ---------- 渲染 ---------- */
    function visible(): TodoItem[] {
        if (filter === 'active') return items.filter((t) => !t.done);
        if (filter === 'done') return items.filter((t) => t.done);
        return items;
    }

    function render(): void {
        list.innerHTML = '';
        const list0 = visible();

        if (!list0.length) {
            const empty = document.createElement('div');
            empty.className = 'todo-empty';
            empty.innerHTML =
                '<span class="empty-icon">' + (filter === 'done' ? '🎉' : '🗒️') + '</span>' +
                '<span>' + (filter === 'done' ? '全部完成，太棒了！' : '暂无待办事项') + '</span>';
            list.appendChild(empty);
        }

        list0.forEach((t) => {
            const item = document.createElement('div');
            item.className = 'todo-item' + (t.done ? ' done' : '');
            item.dataset.id = String(t.id);

            const check = document.createElement('button');
            check.className = 'todo-check';
            check.textContent = '✓';
            check.title = '标记为' + (t.done ? '未完成' : '已完成');
            check.addEventListener('click', () => toggle(t.id));

            const text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = t.text;

            item.appendChild(check);
            item.appendChild(text);

            if (t.remind) {
                const remind = document.createElement('span');
                remind.className = 'todo-remind';
                remind.innerHTML = '⏰ ' + t.remind;
                item.appendChild(remind);
            }

            const del = document.createElement('button');
            del.className = 'todo-del';
            del.textContent = '✕';
            del.title = '删除';
            del.addEventListener('click', () => remove(t.id));
            item.appendChild(del);

            list.appendChild(item);
        });

        updateProgress();
    }

    function updateProgress(): void {
        const total = items.length;
        const done = items.filter((t) => t.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        fill.style.width = pct + '%';
        progressText.textContent = done + ' / ' + total + ' 已完成 · ' + pct + '%';
    }

    /* ---------- 操作 ---------- */
    function add(): void {
        const text = input.value.trim();
        if (!text) return;
        items.unshift({
            id: nextId++,
            text: text,
            done: false,
            remind: timeInput.value || undefined
        });
        input.value = '';
        timeInput.value = '';
        if (filter === 'done') setFilter('all');
        render();
    }

    function toggle(id: number): void {
        const item = items.find((t) => t.id === id);
        if (!item) return;
        item.done = !item.done;
        render();
    }

    function remove(id: number): void {
        const node = list.querySelector('[data-id="' + id + '"]');
        if (node) {
            node.classList.add('removing');
            window.setTimeout(() => {
                items = items.filter((t) => t.id !== id);
                render();
            }, 280);
        } else {
            items = items.filter((t) => t.id !== id);
            render();
        }
    }

    function setFilter(f: TodoFilter): void {
        filter = f;
        rootEl.querySelectorAll<HTMLButtonElement>('.todo-filter').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === f);
        });
        render();
    }

    rootEl.querySelectorAll<HTMLButtonElement>('.todo-filter').forEach((btn) => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter as TodoFilter));
    });

    addBtn.addEventListener('click', add);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') add();
    });

    /* ---------- 到点提醒（模拟系统通知） ---------- */
    function showToast(title: string, body: string): void {
        toast.querySelector('.notify-title')!.textContent = title;
        toast.querySelector('.notify-body')!.textContent = body;
        toast.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3800);
    }

    // 演示：设置提醒时间并添加待办后，模拟"到点系统通知"
    addBtn.addEventListener('click', () => {
        if (timeInput.value) {
            const text = input.value.trim() || '新待办';
            window.setTimeout(() => {
                showToast('NeoWarp 待办提醒', '「' + text + '」到时间啦，别忘了完成它！');
            }, 2500);
        }
    });

    // 页面加载 8 秒后来一条演示提醒（即使不手动添加也能看到效果）
    window.setTimeout(() => {
        showToast('NeoWarp 待办提醒', '「给 Scratch 项目「飞机大战」添加计分板变量」还有 30 分钟到期');
    }, 8000);

    render();
}

initTodoDemo();
