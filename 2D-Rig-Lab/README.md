# 2D Rig Lab

Desktop editor for modular 2D character rigs built with **Godot 4.x + GDScript**. It is independent from the game and lives inside the `3D-Analise` repository under `2D-Rig-Lab/`.

## MVP implemented

- Desktop editor layout with hierarchy, viewport, inspector and timeline.
- PNG import from filesystem.
- Project JSON save/open.
- Sprite part transform editing: position, rotation, scale, pivot, Z index.
- Direct viewport selection and dragging.
- Zoom with mouse wheel and pan with middle mouse button.
- Bone data model and visual bones.
- Socket data model and basic weapon/part attachment by socket name.
- Animation clips: Idle, Walk, Run, Attack, Hurt, Death, Skill, Berserk.
- Directions: Front, Back, Left, Right.
- 1–32 frame timeline.
- Transform keyframes and interpolation between keys.
- Play/pause/stop, FPS and loop.
- Copy/paste/remove keyframes.
- Undo/redo for transform edits.
- Shortcuts: Ctrl+S, Ctrl+Z, Ctrl+Y, Space, Delete, F.
- Modular extension points for skins, weapons, effects and exporters.

## Important MVP limits

This is the first functional pass, not the final production editor. The following are intentionally left for the next increments:

- Bone transforms do not yet deform/drive child sprite transforms as a complete skeletal solver.
- Socket attachment is stored and can snap a part to a socket, but full inherited transform evaluation is the next rig milestone.
- Onion skin UI and multi-key drag selection are Priority 2.
- Horizontal direction mirroring is Priority 2.
- Advanced skin/equipment/effect editors are scaffolded but not yet exposed as full panels.
- PNG sprite-sheet/frame rendering is Priority 3; JSON export architecture is already isolated.
- IK, mesh deformation, constraints, curves, color animation and hitboxes are future architecture targets.

## Folder layout

```text
2D-Rig-Lab/
├── project.godot
├── scenes/
│   └── Main.tscn
├── scripts/
│   ├── core/
│   │   ├── rig_project.gd
│   │   └── editor_history.gd
│   ├── rig/
│   │   └── rig_canvas.gd
│   ├── project/
│   │   └── project_store.gd
│   ├── skins/
│   │   └── skin_data.gd
│   ├── weapons/
│   │   └── weapon_data.gd
│   ├── effects/
│   │   └── effect_data.gd
│   ├── export/
│   │   └── rig_exporter.gd
│   └── ui/
│       └── main_editor.gd
└── README.md
```

## Running

1. Install Godot 4.x.
2. Open Godot Project Manager.
3. Import `2D-Rig-Lab/project.godot`.
4. Run the project.

No web server, Electron, Unity or game project is required.

## Project format

A saved project is a JSON file. After the first save, imported sprites are copied into a sibling `sprites/` folder when possible. The JSON stores pieces, transform/pivot data, bones, sockets, animations, keyframes, skins, weapons and effects.

Suggested working layout:

```text
MyCharacter/
├── character.json
├── sprites/
├── animations/
└── exports/
```

## Next implementation order

1. True inherited bone hierarchy and bone-driven pieces.
2. Socket world transforms and weapon swapping without animation recreation.
3. Onion skin.
4. Skin manager and equipment preview.
5. Direction mirror workflow.
6. Effect tracks.
7. Individual PNG and sprite-sheet renderer/exporter.
