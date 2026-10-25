/**
 * todo-demo.ts —— 待办清单界面演示（对齐实际 todo-list 窗口：iOS 浅色风格）
 * 新增、勾选、双击重命名、提醒设置（预设时长 + 移除）、清除已完成、到点提醒 Toast
 */

interface TodoItem {
    id: number;
    text: string;
    done: boolean;
    /** 提醒（相对分钟数），undefined 表示未设置 */
    remindMin?: number;
    createdAt: number;
}

let nextId = 1;

const SEED: TodoItem[] = [
    { id: nextId++, text: '给 Scratch 项目「飞机大战」添加计分板变量', done: false, remindMin: 30, createdAt: Date.now() - 86400000 },
    { id: nextId++, text: '用 AI 助手优化克隆体性能', done: false, createdAt: Date.now() - 43200000 },
    { id: nextId++, text: '导出游戏打包为 HTML 分享给同学', done: true, createdAt: Date.now() - 172800000 },
    { id: nextId++, text: '整理 NeoWarp 扩展模板代码', done: true, createdAt: Date.now() - 259200000 }
];

const BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
const PEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"></path></svg>';

function formatReminder(min: number): string {
    if (min < 60) return '⏰ ' + min + '分钟后';
    if (min < 1440) return '⏰ ' + (min / 60) + '小时后';
    return '⏰ 明天';
}

function initTodoDemo(): void {
    const root = document.getElementById('todoDemo') as HTMLElement | null;
    if (!root) return;
    const rootEl: HTMLElement = root;

    const list = root.querySelector<HTMLElement>('#tdList') as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('#tdInput') as HTMLInputElement;
    const addBtn = root.querySelector<HTMLButtonElement>('#tdAddBtn') as HTMLButtonElement;
    const emptyEl = root.querySelector<HTMLElement>('#tdEmpty') as HTMLElement;
    const clearBar = root.querySelector<HTMLElement>('#tdClearBar') as HTMLElement;
    const clearBtn = root.querySelector<HTMLButtonElement>('#tdClearDone') as HTMLButtonElement;
    const totalEl = root.querySelector<HTMLElement>('#tdTotal') as HTMLElement;
    const doneEl = root.querySelector<HTMLElement>('#tdDone') as HTMLElement;
    const fill = root.querySelector<HTMLElement>('#tdProgressFill') as HTMLElement;
    const toast = root.querySelector<HTMLElement>('#tdToast') as HTMLElement;
    const overlay = root.querySelector<HTMLElement>('#tdReminderOverlay') as HTMLElement;

    let items: TodoItem[] = SEED.map((t) => ({ ...t }));
    let toastTimer = 0;
    let reminderTarget: number | null = null;
    let selectedPreset = 0;
    let editingId: number | null = null;

    /* ---------- Toast ---------- */
    function showToast(text: string): void {
        toast.textContent = text;
        toast.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
    }

    /* ---------- 提醒时间格式化 ---------- */
    function formatTime(ts: number): string {
        const d = new Date(ts);
        return d.getMonth() + 1 + '月' + d.getDate() + '日 ' +
            String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    /* ---------- 渲染 ---------- */
    function render(): void {
        list.innerHTML = '';
        const done = items.filter((t) => t.done).length;

        totalEl.textContent = String(items.length);
        doneEl.textContent = String(done);
        fill.style.width = (items.length ? Math.round((done / items.length) * 100) : 0) + '%';

        emptyEl.style.display = items.length ? 'none' : 'flex';
        clearBar.style.display = done ? 'flex' : 'none';

        items.forEach((t) => {
            const item = document.createElement('div');
            item.className = 'td-item' + (t.done ? ' completed' : '');
            item.dataset.id = String(t.id);

            const checkbox = document.createElement('div');
            checkbox.className = 'td-checkbox' + (t.done ? ' checked' : '');
            checkbox.title = '标记为' + (t.done ? '未完成' : '已完成');
            checkbox.addEventListener('click', () => toggle(t.id));
            item.appendChild(checkbox);

            if (editingId === t.id) {
                const edit = document.createElement('input');
                edit.className = 'td-edit-input';
                edit.type = 'text';
                edit.value = t.text;
                edit.maxLength = 200;
                edit.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') finishEdit(t.id, edit.value.trim());
                    else if (e.key === 'Escape') { editingId = null; render(); }
                });
                edit.addEventListener('blur', () => finishEdit(t.id, edit.value.trim()));
                item.appendChild(edit);
                window.setTimeout(() => edit.focus(), 30);
            } else {
                const text = document.createElement('span');
                text.className = 'td-text';
                text.textContent = t.text;
                text.title = '创建于 ' + formatTime(t.createdAt) + '（双击重命名）';
                text.addEventListener('dblclick', () => { editingId = t.id; render(); });
                item.appendChild(text);

                if (t.remindMin !== undefined) {
                    const ind = document.createElement('span');
                    ind.className = 'td-reminder-indicator';
                    ind.textContent = formatReminder(t.remindMin);
                    item.appendChild(ind);
                }
            }

            const actions = document.createElement('div');
            actions.className = 'td-actions';

            const reminderBtn = document.createElement('button');
            reminderBtn.className = 'td-action-btn' + (t.remindMin !== undefined ? ' has-reminder' : '');
            reminderBtn.title = t.remindMin !== undefined ? '修改提醒' : '设置提醒';
            reminderBtn.innerHTML = BELL_SVG;
            reminderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openReminder(t.id);
            });
            actions.appendChild(reminderBtn);

            if (!t.done) {
                const editBtn = document.createElement('button');
                editBtn.className = 'td-action-btn';
                editBtn.title = '重命名';
                editBtn.innerHTML = PEN_SVG;
                editBtn.addEventListener('click', () => { editingId = t.id; render(); });
                actions.appendChild(editBtn);
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'td-action-btn danger';
            delBtn.title = '删除';
            delBtn.innerHTML = TRASH_SVG;
            delBtn.addEventListener('click', () => remove(t.id));
            actions.appendChild(delBtn);

            item.appendChild(actions);
            list.appendChild(item);
        });
    }

    /* ---------- 操作 ---------- */
    function add(): void {
        const text = input.value.trim();
        if (!text) return;
        items.unshift({ id: nextId++, text: text, done: false, createdAt: Date.now() });
        input.value = '';
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
            }, 240);
        } else {
            items = items.filter((t) => t.id !== id);
            render();
        }
    }

    function finishEdit(id: number, text: string): void {
        if (editingId !== id) return;
        editingId = null;
        const item = items.find((t) => t.id === id);
        if (item && text) item.text = text;
        render();
    }

    /* ---------- 提醒对话框 ---------- */
    function openReminder(id: number): void {
        reminderTarget = id;
        selectedPreset = 0;
        overlay.classList.add('open');
        const item = items.find((t) => t.id === id);
        const removeBtn = rootEl.querySelector<HTMLButtonElement>('#tdReminderRemove') as HTMLButtonElement;
        removeBtn.style.display = item && item.remindMin !== undefined ? 'block' : 'none';
        markPreset(null);
    }

    function markPreset(min: number | null): void {
        overlay.querySelectorAll<HTMLButtonElement>('.td-preset').forEach((b) => {
            b.classList.toggle('selected', min !== null && Number(b.dataset.min) === min);
        });
    }

    overlay.querySelectorAll<HTMLButtonElement>('.td-preset').forEach((b) => {
        b.addEventListener('click', () => {
            selectedPreset = Number(b.dataset.min);
            markPreset(selectedPreset);
        });
    });

    rootEl.querySelector<HTMLButtonElement>('#tdReminderCancel')?.addEventListener('click', () => {
        overlay.classList.remove('open');
        reminderTarget = null;
    });

    rootEl.querySelector<HTMLButtonElement>('#tdReminderRemove')?.addEventListener('click', () => {
        const item = items.find((t) => t.id === reminderTarget);
        if (item) item.remindMin = undefined;
        overlay.classList.remove('open');
        reminderTarget = null;
        render();
        showToast('已移除提醒');
    });

    rootEl.querySelector<HTMLButtonElement>('#tdReminderConfirm')?.addEventListener('click', () => {
        const item = items.find((t) => t.id === reminderTarget);
        if (item && selectedPreset) {
            item.remindMin = selectedPreset;
            showToast('已设置提醒：' + formatReminder(selectedPreset));
            // 演示：10 秒后触发一次"到点提醒"
            window.setTimeout(() => {
                showToast('⏰ 待办提醒：「' + item.text.slice(0, 16) + '…」时间到啦');
            }, 10000);
        }
        overlay.classList.remove('open');
        reminderTarget = null;
        render();
    });

    /* ---------- 绑定 ---------- */
    addBtn.addEventListener('click', add);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') add();
    });
    clearBtn.addEventListener('click', () => {
        const doneNodes = list.querySelectorAll('.td-item.completed');
        doneNodes.forEach((n) => n.classList.add('removing'));
        window.setTimeout(() => {
            items = items.filter((t) => !t.done);
            render();
            showToast('已清除全部已完成项');
        }, 260);
    });

    render();

    // 页面加载 8 秒后演示一条"到点系统通知"
    window.setTimeout(() => {
        showToast('⏰ 待办提醒：「给 Scratch 项目「飞机大战」添加计…」还有 30 分钟到期');
    }, 8000);
}

initTodoDemo();
