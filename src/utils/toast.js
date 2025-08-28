// Lightweight toast utility without external dependencies
// Usage: toast.success('...'); toast.error('...'); toast.info('...')

const ensureContainer = () => {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  return root;
};

const show = (message, type = 'info', duration = 3000) => {
  const root = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);

  // Force reflow to enable CSS animations if needed
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.classList.add('toast-in');

  const remove = () => {
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  };

  const timer = setTimeout(remove, duration);

  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('click', remove);
};

export const toast = {
  success: (msg, ms) => show(msg, 'success', ms),
  error: (msg, ms) => show(msg, 'error', ms),
  info: (msg, ms) => show(msg, 'info', ms),
};
