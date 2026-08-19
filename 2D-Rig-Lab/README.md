# 2D Rig Lab Web

Nova implementação do 2D Rig Lab feita especificamente para rodar diretamente no GitHub Pages, em PC e celular, sem Godot/Electron/Unity no navegador.

## Implementado

- Interface responsiva desktop/mobile.
- Viewport Canvas 2D com pan, zoom, grade e seleção.
- Importação de múltiplos PNGs transparentes.
- Peças com posição, rotação, escala, pivô e z-index.
- Hierarquia de bones com transformação herdada.
- Sockets presos a bones.
- Equipamento/arma preso a socket.
- Timeline de 32 frames.
- Animações Idle, Walk, Run, Attack, Hurt, Death, Skill e Berserk.
- Direções Front, Back, Left e Right.
- Keyframes com interpolação.
- Play/Stop e FPS configurável.
- Skins com substituição de PNG por peça sem alterar o rig.
- Salvar/abrir projeto JSON localmente.
- Exportar JSON.
- Undo/Redo básico.
- Mobile com abas Rig / Viewport / Timeline / Inspector.

## GitHub Pages

A pasta é estática: `index.html`, `styles.css` e `app.js`. O workflow do repositório apenas publica os arquivos no GitHub Pages; não há etapa de compilação do Godot.
