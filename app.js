const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const pickFile = document.querySelector('#pickFile');
const openFileTop = document.querySelector('#openFileTop');
const viewer = document.querySelector('#viewer');
const emptyState = document.querySelector('#emptyState');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#errorBox');
const fileName = document.querySelector('#fileName');
const fileSize = document.querySelector('#fileSize');
const fileType = document.querySelector('#fileType');
const autoRotate = document.querySelector('#autoRotate');
const rotateSpeed = document.querySelector('#rotateSpeed');
const speedValue = document.querySelector('#speedValue');
const exposure = document.querySelector('#exposure');
const exposureValue = document.querySelector('#exposureValue');
const backgroundColor = document.querySelector('#backgroundColor');
const resetCamera = document.querySelector('#resetCamera');
const toggleRotate = document.querySelector('#toggleRotate');
const fullscreen = document.querySelector('#fullscreen');
const viewerCard = document.querySelector('.viewer-card');

let currentObjectUrl = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
}

function isGlb(file) {
  return file && (file.name.toLowerCase().endsWith('.glb') || file.type === 'model/gltf-binary');
}

function loadFile(file) {
  clearError();

  if (!isGlb(file)) {
    showError('Arquivo inválido. Selecione um modelo no formato .GLB.');
    return;
  }

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);

  fileName.textContent = file.name;
  fileName.title = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileType.textContent = 'GLB';

  emptyState.style.display = 'none';
  viewer.style.display = 'block';
  setLoading(true);
  viewer.src = currentObjectUrl;
}

function openPicker(event) {
  event?.stopPropagation();
  fileInput.click();
}

pickFile.addEventListener('click', openPicker);
openFileTop.addEventListener('click', openPicker);
dropZone.addEventListener('click', openPicker);
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') openPicker(event);
});

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files || [];
  if (file) loadFile(file);
  fileInput.value = '';
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
  });
});

dropZone.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer?.files || [];
  if (file) loadFile(file);
});

viewer.addEventListener('load', () => {
  setLoading(false);
  clearError();
  try {
    viewer.jumpCameraToGoal();
  } catch (_) {}
});

viewer.addEventListener('error', () => {
  setLoading(false);
  showError('Não foi possível abrir este GLB. O arquivo pode estar corrompido ou usar recursos incompatíveis.');
});

autoRotate.addEventListener('change', () => {
  viewer.autoRotate = autoRotate.checked;
  toggleRotate.textContent = autoRotate.checked ? 'Pausar rotação' : 'Iniciar rotação';
});

rotateSpeed.addEventListener('input', () => {
  const value = Number(rotateSpeed.value);
  viewer.rotationPerSecond = `${value}deg`;
  speedValue.textContent = `${value}°/s`;
});

exposure.addEventListener('input', () => {
  const value = Number(exposure.value);
  viewer.exposure = value;
  exposureValue.textContent = value.toFixed(1);
});

backgroundColor.addEventListener('input', () => {
  viewerCard.style.background = backgroundColor.value;
});

toggleRotate.addEventListener('click', () => {
  autoRotate.checked = !autoRotate.checked;
  autoRotate.dispatchEvent(new Event('change'));
});

resetCamera.addEventListener('click', () => {
  if (!viewer.src) return;
  viewer.cameraOrbit = '0deg 75deg auto';
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = 'auto';
  try {
    viewer.jumpCameraToGoal();
  } catch (_) {}
});

fullscreen.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await viewerCard.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (_) {
    showError('Tela cheia não está disponível neste navegador.');
  }
});

document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
});

window.addEventListener('beforeunload', () => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
});
