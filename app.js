const button = document.querySelector('#startButton');
const status = document.querySelector('#status');

button?.addEventListener('click', () => {
  status.textContent = 'Base funcionando. Pronta para o próximo projeto.';
});
