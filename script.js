const STORAGE_KEY = 'daymark.tasks.v1';
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const emptyTitle = document.querySelector('#empty-title');
const emptyCopy = document.querySelector('#empty-copy');
const statusMessage = document.querySelector('#status-message');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const clearCompletedButton = document.querySelector('#clear-completed');
let activeFilter = 'all';
let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.completed === 'boolean');
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    announce('Your changes could not be saved in this browser.');
  }
}

function announce(message) {
  statusMessage.textContent = '';
  requestAnimationFrame(() => { statusMessage.textContent = message; });
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

function makeIcon(name) {
  const paths = {
    check: '<path d="m5 12 4 4L19 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>'
  };
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = paths[name];
  return icon;
}

function createTaskElement(task) {
  const item = document.createElement('li');
  item.className = `task-item${task.completed ? ' is-complete' : ''}`;
  item.dataset.id = task.id;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'task-check';
  toggle.dataset.action = 'toggle';
  toggle.setAttribute('aria-label', `${task.completed ? 'Mark' : 'Complete'}: ${task.title}`);
  toggle.setAttribute('aria-pressed', String(task.completed));
  toggle.append(makeIcon('check'));

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  const date = document.createElement('time');
  date.className = 'task-meta';
  date.dateTime = task.createdAt || '';
  date.textContent = task.createdAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(task.createdAt))
    : '';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-button';
  remove.dataset.action = 'delete';
  remove.setAttribute('aria-label', `Delete: ${task.title}`);
  remove.title = 'Delete task';
  remove.append(makeIcon('trash'));

  item.append(toggle, title, date, remove);
  return item;
}

function render() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === 'active') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    return true;
  });

  taskList.replaceChildren(...visibleTasks.map(createTaskElement));
  document.querySelector('#task-total').textContent = String(tasks.length);
  document.querySelector('#all-count').textContent = String(tasks.length);
  document.querySelector('#active-count').textContent = String(activeCount);
  document.querySelector('#completed-count').textContent = String(completedCount);
  document.querySelector('#progress-count').textContent = `${completedCount} of ${tasks.length} done`;
  const progressBar = document.querySelector('#progress-bar');
  progressBar.setAttribute('aria-valuemax', String(tasks.length));
  progressBar.setAttribute('aria-valuenow', String(completedCount));
  document.querySelector('#progress-fill').style.width = `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%`;

  const isEmpty = visibleTasks.length === 0;
  emptyState.hidden = !isEmpty;
  if (isEmpty) {
    if (activeFilter === 'active' && tasks.length) {
      emptyTitle.textContent = 'All caught up.';
      emptyCopy.textContent = 'You’ve completed every task on your list.';
    } else if (activeFilter === 'completed' && tasks.length) {
      emptyTitle.textContent = 'Not yet, and that’s okay.';
      emptyCopy.textContent = 'Tasks you complete will find their way here.';
    } else {
      emptyTitle.textContent = 'A clear page.';
      emptyCopy.textContent = 'Add a task when you’re ready. You’ve got this.';
    }
  }
  clearCompletedButton.hidden = completedCount === 0;
  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, completed: false, createdAt: new Date().toISOString() });
  saveTasks();
  activeFilter = 'all';
  render();
  taskForm.reset();
  taskInput.focus();
  announce(`Added: ${title}`);
});

taskList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = button.closest('.task-item');
  const task = tasks.find((entry) => entry.id === item?.dataset.id);
  if (!task) return;

  if (button.dataset.action === 'toggle') {
    task.completed = !task.completed;
    announce(task.completed ? `Completed: ${task.title}` : `Reopened: ${task.title}`);
  } else if (button.dataset.action === 'delete') {
    tasks = tasks.filter((entry) => entry.id !== task.id);
    announce(`Deleted: ${task.title}`);
  }
  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    render();
  });
});

clearCompletedButton.addEventListener('click', () => {
  const removedCount = tasks.filter((task) => task.completed).length;
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
  announce(`Cleared ${removedCount} completed ${removedCount === 1 ? 'task' : 'tasks'}.`);
});

const today = formatDate(new Date());
document.querySelector('#today-date').textContent = today;
document.querySelector('#footer-date').textContent = today;
render();
