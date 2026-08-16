export function enhanceModelingToolbar(attempt=0){
  const sec=document.querySelector('#modelingSec');
  if(!sec)return;
  const segmented=sec.querySelector('.segmented');
  const edge=sec.querySelector('[data-mesh-mode="edge"]');
  const face=sec.querySelector('[data-mesh-mode="face"]');
  const vertex=sec.querySelector('#vertexModeBtn');
  if((!edge||!face||!vertex)&&attempt<40){setTimeout(()=>enhanceModelingToolbar(attempt+1),50);return}
  if(sec.dataset.modeToolbarEnhanced)return;
  sec.dataset.modeToolbarEnhanced='1';

  // Reuse the real buttons created by MeshEditor so all existing listeners stay intact.
  if(edge&&edge.parentElement!==segmented)segmented.appendChild(edge);
  if(face&&face.parentElement!==segmented)segmented.appendChild(face);
  if(vertex){vertex.disabled=false;vertex.title='Editar vértices · tecla 1'}
  if(edge)edge.title='Editar arestas · tecla 2';
  if(face)face.title='Editar faces · tecla 3';

  const advanced=sec.querySelector('.advanced-grid');
  if(advanced)advanced.classList.add('mesh-operations-grid');

  let hint=sec.querySelector('.mesh-mode-hint');
  if(!hint){
    hint=document.createElement('p');
    hint.className='section-note mesh-mode-hint';
    hint.innerHTML='<b>Fluxo:</b> selecione um bloco → escolha Vértice, Aresta ou Face → modele. O Mirror é individual por objeto, então cada bloco pode ter sua própria simetria.';
    sec.appendChild(hint)
  }

  const mirror=document.querySelector('#mirrorSec');
  if(mirror&&!mirror.querySelector('.mirror-object-note')){
    const note=document.createElement('p');
    note.className='section-note mirror-object-note';
    note.textContent='Mirror atua somente no objeto selecionado. Para carro em blocos: use X separadamente na lateral, frente e traseira.';
    mirror.appendChild(note)
  }

  injectStyles();
}

function injectStyles(){
  if(document.querySelector('#modelingToolbarEnhanceStyles'))return;
  const s=document.createElement('style');
  s.id='modelingToolbarEnhanceStyles';
  s.textContent=`
    #modelingSec>.segmented{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
    #modelingSec>.segmented button{min-width:0;padding-left:5px;padding-right:5px}
    #modelingSec .mesh-operations-grid{margin-top:7px}
    #modelingSec .mesh-mode-hint b{color:#d9d2ff}
    #mirrorSec .mirror-object-note{border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:8px}
    @media(max-width:760px){#modelingSec>.segmented{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(s)
}
